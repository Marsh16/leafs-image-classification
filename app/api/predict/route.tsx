import { NextRequest } from "next/server";

const API_KEY = process.env.API_KEY!;
const WATSON_URL = process.env.WATSON_URL!;

const CLASS_NAMES = [
  "Anthracnose",
  "Bacterial Canker",
  "Cutting Weevil",
  "Die Back",
  "Gall Midge",
  "Healthy",
  "Powdery Mildew",
  "Sooty Mould",
];

async function getBearerToken(): Promise<string> {
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `apikey=${API_KEY}&grant_type=urn:ibm:params:oauth:grant-type:apikey`,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch IBM Watson token");
  }

  const data = await res.json();
  return data.access_token;
}

async function preprocessBase64Image(base64: string): Promise<number[][][][]> {
  const Jimp = (await import("jimp")).default;

  const buffer = Buffer.from(base64, "base64");
  const image = await Jimp.read(buffer);
  image.resize(227, 227);

  const { data, width, height } = image.bitmap;
  const imageArray: number[][][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[][] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      row.push([r, g, b]);
    }
    imageArray.push(row);
  }

  return [imageArray]; // shape: [1, height, width, 3]
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if error indicates model is reloading/cold starting
function isModelReloadingError(response: Response, errorText: string): boolean {
  // Common indicators of model reloading:
  // - 503 Service Unavailable
  // - 502 Bad Gateway
  // - Error messages containing "loading", "starting", "initializing", etc.
  if (response.status === 503 || response.status === 502) {
    return true;
  }

  const reloadingKeywords = [
    'loading', 'starting', 'initializing', 'warming up',
    'cold start', 'model not ready', 'deployment starting'
  ];

  return reloadingKeywords.some(keyword =>
    errorText.toLowerCase().includes(keyword)
  );
}

// Send streaming update to client
function sendStreamUpdate(encoder: TextEncoder, controller: ReadableStreamDefaultController, message: string) {
  const data = `data: ${JSON.stringify({ status: 'loading', message })}\n\n`;
  controller.enqueue(encoder.encode(data));
}

async function tryWatsonInference(
  bearerToken: string,
  inputData: number[][][][],
  encoder?: TextEncoder,
  controller?: ReadableStreamDefaultController,
  retries = 5,
  waitMs = 3000
): Promise<Response> {
  let isModelReloading = false;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(WATSON_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_data: [
          {
            values: inputData,
          },
        ],
      }),
    });

    if (response.ok) {
      if (encoder && controller && isModelReloading) {
        sendStreamUpdate(encoder, controller, "Model is ready! Processing your image...");
      }
      return response;
    } else {
      const errorText = await response.text();
      const isReloading = isModelReloadingError(response, errorText);

      if (isReloading && !isModelReloading) {
        isModelReloading = true;
        if (encoder && controller) {
          sendStreamUpdate(encoder, controller, "Model is starting up from cloud deployment. This may take 30-60 seconds...");
        }
      }

      if (attempt < retries) {
        // Use longer wait times for model reloading
        const currentWaitMs = isModelReloading ? Math.min(waitMs * Math.pow(1.5, attempt - 1), 15000) : waitMs;

        if (encoder && controller) {
          const remainingAttempts = retries - attempt;
          const estimatedWaitTime = Math.ceil(currentWaitMs * remainingAttempts / 1000);
          sendStreamUpdate(
            encoder,
            controller,
            isModelReloading
              ? `Model is still loading... Estimated wait time: ${estimatedWaitTime}s (attempt ${attempt}/${retries})`
              : `Retrying prediction... (attempt ${attempt}/${retries})`
          );
        }

        console.warn(`Inference failed (attempt ${attempt}), retrying after ${currentWaitMs}ms...`);
        await delay(currentWaitMs);
      } else {
        throw new Error(`Watson ML error after ${retries} attempts: ${errorText}`);
      }
    }
  }
  throw new Error("Inference failed unexpectedly.");
}

export async function POST(req: NextRequest) {
  try {
    const { data: base64Image, stream = false } = await req.json();

    if (!base64Image) {
      return new Response(JSON.stringify({ error: "No image data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inputData = await preprocessBase64Image(base64Image);
    const bearerToken = await getBearerToken();

    // Handle streaming response for real-time updates
    if (stream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            sendStreamUpdate(encoder, controller, "Starting prediction...");

            const response = await tryWatsonInference(
              bearerToken,
              inputData,
              encoder,
              controller,
              8, // More retries for streaming
              3000
            );

            sendStreamUpdate(encoder, controller, "Processing results...");

            const result = await response.json();
            const predictions = result.predictions[0].values[0];

            const maxIndex = predictions.indexOf(Math.max(...predictions));
            const predictedClass = CLASS_NAMES[maxIndex];
            const confidence = +(predictions[maxIndex] * 100).toFixed(2);

            // Send final result
            const finalData = `data: ${JSON.stringify({
              status: 'complete',
              result: `This image most likely belongs to ${predictedClass} with a ${confidence}% confidence.`,
              class: predictedClass,
              confidence,
            })}\n\n`;

            controller.enqueue(encoder.encode(finalData));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error: any) {
            const errorData = `data: ${JSON.stringify({
              status: 'error',
              error: error.message || "Prediction failed"
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Regular non-streaming response
    const response = await tryWatsonInference(bearerToken, inputData);
    const result = await response.json();
    const predictions = result.predictions[0].values[0];

    const maxIndex = predictions.indexOf(Math.max(...predictions));
    const predictedClass = CLASS_NAMES[maxIndex];
    const confidence = +(predictions[maxIndex] * 100).toFixed(2);

    return new Response(
      JSON.stringify({
        result: `This image most likely belongs to ${predictedClass} with a ${confidence}% confidence.`,
        class: predictedClass,
        confidence,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Prediction error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Prediction failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

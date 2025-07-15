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

async function tryWatsonInference(
  bearerToken: string,
  inputData: number[][][][],
  retries = 5,
  waitMs = 3000
): Promise<Response> {
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
      return response;
    } else if (attempt < retries) {
      console.warn(`Inference failed (attempt ${attempt}), retrying after ${waitMs}ms...`);
      await delay(waitMs);
    } else {
      const errorText = await response.text();
      throw new Error(`Watson ML error after ${retries} attempts: ${errorText}`);
    }
  }
  throw new Error("Inference failed unexpectedly.");
}

export async function POST(req: NextRequest) {
  try {
    const { data: base64Image } = await req.json();

    if (!base64Image) {
      return new Response(JSON.stringify({ error: "No image data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inputData = await preprocessBase64Image(base64Image);
    const bearerToken = await getBearerToken();

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

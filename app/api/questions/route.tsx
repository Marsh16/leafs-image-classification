// app/api/questions/route.ts
import { createWatsonx } from "@rama-adi/watsonx-unofficial-ai-provider";
import { streamText, CoreMessage } from "ai";

const API_KEY = process.env.API_KEY;
const PROJECT_ID = "55f9d5d9-730c-4c8c-99ef-264b06c34dd1";

type SessionData = {
  language: "en" | "id";
  history: CoreMessage[];
};

const sessions = new Map<string, SessionData>();

async function getBearerToken(): Promise<string> {
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `apikey=${API_KEY}&grant_type=urn:ibm:params:oauth:grant-type:apikey`,
  });
  if (!res.ok) throw new Error("Failed to fetch IBM Watson token");
  const data = await res.json();
  return data.access_token;
}

function detectLanguageFromText(text: string): "en" | "id" {
  const indonesianWords = [
    "apa",
    "bagaimana",
    "mengapa",
    "cara",
    "tidak",
    "bisa",
    "yang",
    "dan",
    "atau",
    "untuk",
  ];
  const lower = text.toLowerCase();
  return indonesianWords.some((w) => lower.includes(w)) ? "id" : "en";
}

function getSystemPrompt(
  language: "en" | "id",
  disease_name: string,
  isFollowup: boolean
) {
  if (language === "id") {
    return isFollowup
      ? `Ini adalah percakapan lanjutan. Ingat semua pertanyaan dan jawaban sebelumnya.
Jawablah secara singkat (2–3 poin) dan langsung ke inti, tetap jelas dan mudah dipahami.`
      : `Anda adalah dokter tanaman yang ramah dan berpengetahuan, siap membantu petani mangga.
Daun mangga ini terdiagnosis: '${disease_name}'.
1. Apa penyakit ini? Jelaskan sederhana.
2. Gejala apa yang perlu diperhatikan?
3. Perawatan yang disarankan (fokus organik).
4. Tips pencegahan.`;
  }
  return isFollowup
    ? `This is a continuation of the same conversation. Remember all previous questions and answers.
Answer briefly (2–3 bullet points) and clearly.`
    : `You are a friendly, knowledgeable plant doctor helping a mango farmer.
The mango leaf is diagnosed with: '${disease_name}'.
1. Explain the disease simply.
2. List key symptoms.
3. Recommend treatments (focus organic).
4. Give prevention tips.`;
}

export async function POST(req: Request) {
  try {
    const { disease_name, questions, session_id, language } = await req.json();
    if (!disease_name || !questions) {
      return new Response(JSON.stringify({ error: "Missing required data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionId =
      session_id ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let sessionData = sessions.get(sessionId);

    if (!sessionData) {
      sessionData = {
        language:
          language === "id" || language === "en"
            ? language
            : detectLanguageFromText(questions),
        history: [],
      };
      sessions.set(sessionId, sessionData);
    } else if (language === "id" || language === "en") {
      sessionData.language = language;
    }

    const isFollowup = sessionData.history.length > 0;
    const systemPrompt = getSystemPrompt(
      sessionData.language,
      disease_name,
      isFollowup
    );

    const messages: CoreMessage[] = isFollowup
      ? [
          { role: "system", content: systemPrompt },
          ...sessionData.history,
          { role: "user", content: questions },
        ]
      : [
          { role: "system", content: systemPrompt },
          { role: "user", content: questions },
        ];

    if (messages.length > 21) messages.splice(1, messages.length - 21);

    const bearerToken = await getBearerToken();
    const watsonxInstance = createWatsonx({
      cluster: "jp-tok",
      projectID: PROJECT_ID,
      bearerToken,

    });

    const stream = await streamText({
      model: watsonxInstance("meta-llama/llama-3-3-70b-instruct"),
      messages,
      maxTokens: 1000,
      temperature: 0.7,
    });

    let assistantResponse = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text =
          chunk instanceof Uint8Array
            ? new TextDecoder().decode(chunk)
            : typeof chunk === "string"
            ? chunk
            : String(chunk);
        assistantResponse += text;
        controller.enqueue(chunk);
      },
      async flush() {
        if (sessionData) {
          // Push directly to the existing history array
          sessionData.history.push({ role: "user", content: questions });
          sessionData.history.push({
            role: "assistant",
            content: assistantResponse,
          });

          // Limit history length to 20
          if (sessionData.history.length > 20) {
            sessionData.history.splice(0, sessionData.history.length - 20);
          }

          // Update the map so future requests see the new history
          sessions.set(sessionId, sessionData);
        }
      },
    });

    return new Response(stream.textStream.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Session-ID": sessionId,
        "X-Language": sessionData.language,
      },
    });
  } catch (error) {
    console.error("Error generating response:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const sessionData = sessions.get(sessionId) || {
      language: "en",
      history: [],
    };
    return new Response(
      JSON.stringify({
        session_id: sessionId,
        language: sessionData.language,
        history: sessionData.history,
        message_count: sessionData.history.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error retrieving session:", error);
    return new Response(
      JSON.stringify({ error: "Failed to retrieve session" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

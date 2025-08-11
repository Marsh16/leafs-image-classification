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

// Simple Indonesian detection
function detectLanguageFromText(text: string): "en" | "id" {
  const indonesianWords = ["apa", "bagaimana", "mengapa", "cara", "tidak", "bisa", "yang", "dan", "atau", "untuk"];
  const lower = text.toLowerCase();
  return indonesianWords.some(w => lower.includes(w)) ? "id" : "en";
}

function getSystemPrompt(language: "en" | "id", disease_name: string, isFollowup: boolean): string {
  if (language === "id") {
    return isFollowup
      ? `
Anda adalah dokter tanaman yang ramah dan berpengetahuan, membantu petani mangga.

Jawablah pertanyaan lanjutan ini secara singkat (2–3 poin) dan langsung ke inti, tetap jelas dan mudah dimengerti.

Pertanyaan terkait penyakit: '${disease_name}'
`
      : `
Anda adalah dokter tanaman yang ramah dan berpengetahuan, siap membantu petani mangga merawat pohonnya.

Daun mangga ini terdiagnosis mengidap: **'${disease_name}'**

Mulailah dengan membantu petani memahami masalah ini:
1. Apa penyakit ini? Jelaskan dengan jelas dan sederhana.
2. Gejala apa saja yang perlu diperhatikan?
3. Perawatan apa yang bisa membantu? Fokus pada solusi organik atau yang mudah didapat jika memungkinkan.
4. Satu atau dua tips berguna untuk mencegah penyakit ini di masa depan.

Sekarang, jawab pertanyaan petani dengan nada hangat, mendukung, dan mudah dipahami.
Gunakan poin-poin atau paragraf singkat agar mudah dibaca.
`;
  }

  // English
  return isFollowup
    ? `
You are a friendly and knowledgeable plant doctor.

Answer this follow-up question briefly (2–3 bullet points), getting straight to the point but keeping it clear.

Disease: '${disease_name}'
`
    : `
You are a friendly and knowledgeable plant doctor, here to help a mango farmer care for their trees.

The mango leaf has been diagnosed with: **'${disease_name}'**

Start by helping the farmer understand the issue:
1. What is this disease? Explain it clearly and simply.
2. What are the typical symptoms to look out for?
3. What treatments can help? Focus on organic or easily available solutions when possible.
4. What are one or two useful tips to prevent this disease in the future.

Keep your tone warm, supportive, and easy to understand.
`;
}

export async function POST(req: Request) {
  try {
    const { disease_name, questions, session_id, language } = await req.json();

    if (!disease_name || !questions) {
      return new Response(
        JSON.stringify({ error: "Missing required data: disease_name or questions" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let sessionData = sessions.get(sessionId);

    if (!sessionData) {
      sessionData = {
        language: language === "id" || language === "en"
          ? language
          : detectLanguageFromText(questions),
        history: [],
      };
      sessions.set(sessionId, sessionData);
    } else if (language && (language === "id" || language === "en")) {
      sessionData.language = language;
    }

    const isFollowup = sessionData.history.length > 0;
    const systemPrompt = getSystemPrompt(sessionData.language, disease_name, isFollowup);

    const messages: CoreMessage[] = [
      { role: "system", content: systemPrompt },
      ...sessionData.history,
      { role: "user", content: questions }
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
        const text = chunk instanceof Uint8Array
          ? new TextDecoder().decode(chunk)
          : typeof chunk === "string"
            ? chunk
            : String(chunk);

        assistantResponse += text;
        controller.enqueue(chunk);
      },
      flush() {
        const updatedHistory = [...(sessionData?.history ?? [])];
        updatedHistory.push({ role: "user", content: questions });
        updatedHistory.push({ role: "assistant", content: assistantResponse });


        if (updatedHistory.length > 20) updatedHistory.splice(0, updatedHistory.length - 20);

        sessions.set(sessionId, {
          language: sessionData.language,
          history: updatedHistory,
        });
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing session_id parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sessionData = sessions.get(sessionId) || { language: "en", history: [] };

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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

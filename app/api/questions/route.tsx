// app/api/questions/route.ts
import { createWatsonx } from "@rama-adi/watsonx-unofficial-ai-provider";
import { streamText, CoreMessage } from "ai";

const API_KEY = process.env.API_KEY;
const PROJECT_ID = "55f9d5d9-730c-4c8c-99ef-264b06c34dd1";

type SessionData = {
  language: "en" | "id";
  history: CoreMessage[];
  disease_name: string; // Store disease name in session
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

function getSystemPrompt(language: "en" | "id", disease_name: string, hasHistory: boolean) {
  if (language === "id") {
    const basePrompt = `Anda adalah dokter tanaman yang ramah dan berpengetahuan, siap membantu petani mangga.

KONTEKS DIAGNOSA: Daun mangga ini terdiagnosis dengan '${disease_name}'.

INSTRUKSI:
- Jawab dengan jelas, praktis, dan mudah dipahami oleh petani
- Berikan saran pengobatan dan pencegahan yang spesifik untuk kondisi ini
- Fokus pada informasi yang berguna dan dapat diterapkan`;

    const historyInstructions = hasHistory 
      ? `- Ingat semua pertanyaan dan jawaban sebelumnya dalam percakapan ini
- Berikan jawaban yang konsisten dengan informasi yang telah diberikan sebelumnya  
- Jika user menanyakan hal yang sudah dijelaskan, rujuk kembali penjelasan sebelumnya`
      : `- Ini adalah awal percakapan, jawab pertanyaan dengan lengkap dan informatif`;

    return `${basePrompt}
${historyInstructions}`;
  }

  const basePrompt = `You are a friendly, knowledgeable plant doctor helping a mango farmer.

DIAGNOSIS CONTEXT: The mango leaf is diagnosed with '${disease_name}'.

INSTRUCTIONS:
- Answer clearly, practically, and in terms farmers can understand
- Provide specific treatment and prevention advice for this condition
- Focus on useful, actionable information`;

  const historyInstructions = hasHistory
    ? `- Remember all previous questions and answers in this conversation
- Provide answers consistent with previously given information
- If user asks about something already explained, refer back to previous explanations`
    : `- This is the start of our conversation, answer the question thoroughly and informatively`;

  return `${basePrompt}
${historyInstructions}`;
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
        disease_name: disease_name,
      };
      sessions.set(sessionId, sessionData);
    } else {
      // Update language if provided
      if (language === "id" || language === "en") {
        sessionData.language = language;
      }
      // Update disease name if different (for edge cases)
      if (sessionData.disease_name !== disease_name) {
        sessionData.disease_name = disease_name;
      }
    }

    // Build messages with full context - ALWAYS include history
    const hasHistory = sessionData.history.length > 0;
    const systemPrompt = getSystemPrompt(sessionData.language, sessionData.disease_name, hasHistory);
    
    const messages: CoreMessage[] = [
      { role: "system", content: systemPrompt },
      ...sessionData.history, // Always include full conversation history
      { role: "user", content: questions }, // Add current question
    ];

    // Limit total messages to prevent token overflow (keep system + last 20 exchanges)
    if (messages.length > 41) { // system + 40 messages (20 exchanges)
      const systemMsg = messages[0];
      const recentMessages = messages.slice(-40); // Keep last 40 messages
      messages.splice(0, messages.length, systemMsg, ...recentMessages);
    }

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
        if (sessionData && assistantResponse.trim()) {
          // Add both user question and assistant response to history
          sessionData.history.push({ role: "user", content: questions });
          sessionData.history.push({
            role: "assistant",
            content: assistantResponse,
          });

          // Limit history to last 40 messages (20 exchanges) to manage memory
          if (sessionData.history.length > 40) {
            sessionData.history.splice(0, sessionData.history.length - 40);
          }

          // Update the session
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
        "X-Disease": sessionData.disease_name,
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
      disease_name: "",
    };
    
    return new Response(
      JSON.stringify({
        session_id: sessionId,
        language: sessionData.language,
        disease_name: sessionData.disease_name,
        history: sessionData.history,
        message_count: sessionData.history.length,
        exchanges: Math.floor(sessionData.history.length / 2),
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
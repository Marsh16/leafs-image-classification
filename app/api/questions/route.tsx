// app/api/questions/route.ts
import { createWatsonx } from "@rama-adi/watsonx-unofficial-ai-provider";
import { streamText, CoreMessage } from "ai";

const API_KEY = process.env.API_KEY;
const PROJECT_ID = process.env.PROJECT_ID;

type SessionData = {
  language: "en" | "id";
  history: CoreMessage[];
  disease_name: string; // Store disease name in session
};

const sessions = new Map<string, SessionData>();

// Function to limit conversation history to last 6 exchanges (12 messages)
function limitConversationMemory(history: CoreMessage[]): CoreMessage[] {
  const MAX_CONVERSATIONS = 12;
  const MAX_MESSAGES = MAX_CONVERSATIONS * 2; // 6 user + 6 assistant = 12 messages

  if (history.length <= MAX_MESSAGES) {
    return history;
  }

  // Keep only the last 12 messages (6 conversations)
  return history.slice(-MAX_MESSAGES);
}

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
  hasHistory: boolean
) {
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

    // Build messages with full context - Apply memory limit before including history
    const hasHistory = sessionData.history.length > 0;
    const systemPrompt = getSystemPrompt(
      sessionData.language,
      sessionData.disease_name,
      hasHistory
    );

    // Limit conversation memory to last 6 exchanges
    const limitedHistory = limitConversationMemory(sessionData.history);

    // DEBUG: Log the history being sent
    console.log(
      `Session ${sessionId} - History length: ${sessionData.history.length}`
    );
    console.log(`Limited history length: ${limitedHistory.length}`);
    console.log(
      "History being sent to model:",
      limitedHistory.map((h) => {
        let preview = "";
        if (typeof h.content === "string") {
          preview = h.content.substring(0, 50);
        } else if (h.content) {
          preview = JSON.stringify(h.content).substring(0, 50);
        }
        return { role: h.role, content: preview + "..." };
      })
    );

    const messages: CoreMessage[] = [
      { role: "system", content: systemPrompt },
      ...limitedHistory, // Include only last 6 conversations
      { role: "user", content: questions }, // Add current question
    ];

    // DEBUG: Log final messages array structure
    console.log(
      "Final messages sent to Watson:",
      messages.map((m) => ({ role: m.role, contentLength: m.content.length }))
    );

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
          console.log(`Before adding to history - Session ${sessionId}:`, {
            historyLength: sessionData.history.length,
            question: questions.substring(0, 50) + "...",
            responseLength: assistantResponse.length,
          });

          // Add both user question and assistant response to history
          sessionData.history.push({ role: "user", content: questions });
          sessionData.history.push({
            role: "assistant",
            content: assistantResponse,
          });

          console.log(
            `After adding - History length: ${sessionData.history.length}`
          );

          // Apply memory limit - keep only last 6 conversations (12 messages)
          sessionData.history = limitConversationMemory(sessionData.history);

          console.log(
            `After memory limit - History length: ${sessionData.history.length}`
          );

          // Update the session
          sessions.set(sessionId, sessionData);

          console.log(
            `Session ${sessionId} updated with history:`,
            sessionData.history.map((h) => ({
              role: h.role,
              content:
                typeof h.content === "string"
                  ? h.content.substring(0, 30) + "..."
                  : JSON.stringify(h.content).substring(0, 30) + "...",
            }))
          );
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
    const debug = searchParams.get("debug");

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

    // Debug mode - return detailed info
    if (debug === "true") {
      return new Response(
        JSON.stringify(
          {
            session_id: sessionId,
            language: sessionData.language,
            disease_name: sessionData.disease_name,
            history: sessionData.history,
            message_count: sessionData.history.length,
            exchanges: Math.floor(sessionData.history.length / 2),
            max_conversations: 6,
            remaining_conversations: Math.max(
              0,
              6 - Math.floor(sessionData.history.length / 2)
            ),
            all_sessions: Array.from(sessions.keys()), // Show all session IDs
            session_exists: sessions.has(sessionId),
            limited_history: limitConversationMemory(sessionData.history),
          },
          null,
          2
        ),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        language: sessionData.language,
        disease_name: sessionData.disease_name,
        history: sessionData.history,
        message_count: sessionData.history.length,
        exchanges: Math.floor(sessionData.history.length / 2),
        max_conversations: 6,
        remaining_conversations: Math.max(
          0,
          6 - Math.floor(sessionData.history.length / 2)
        ),
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

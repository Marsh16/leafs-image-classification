// app/api/questions/route.ts (Next.js API route in /app folder)
import { createWatsonx } from "@rama-adi/watsonx-unofficial-ai-provider";
import { generateText } from "ai";

const API_KEY = process.env.API_KEY;
const PROJECT_ID = "55f9d5d9-730c-4c8c-99ef-264b06c34dd1";

async function getBearerToken(): Promise<string> {
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `apikey=${API_KEY}&grant_type=urn:ibm:params:oauth:grant-type:apikey`,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch IBM Watson token");
  }

  const data = await res.json();
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const { disease_name, questions } = await req.json();

    if (!disease_name || !questions) {
      return new Response(
        JSON.stringify({
          error: "Missing required data: disease_name or questions",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `
You are a friendly and knowledgeable plant doctor, here to help a mango farmer care for their trees.

The mango leaf has been diagnosed with: **'${disease_name}'**

Start by helping the farmer understand the issue:
1. What is this disease? Explain it clearly and simply.
2. What are the typical symptoms to look out for?
3. What treatments can help? Focus on organic or easily available solutions when possible.
4. What are one or two useful tips to prevent this disease in the future?

Now, the farmer has a specific question: **'${questions}'**

If the question is related to the disease, provide a detailed and helpful answer using the information above. If the question is about something else, do your best to give a useful, informed response based on your plant health expertise.

Keep your tone warm, supportive, and easy to understand. Use bullet points or short paragraphs to make the answer farmer-friendly.
`;

    const bearerToken = await getBearerToken();

    const watsonxInstance = createWatsonx({
      cluster: "jp-tok",
      projectID: PROJECT_ID,
      bearerToken,
    });

    const { text } = await generateText({
      model: watsonxInstance("ibm/granite-3-8b-instruct"),
      prompt,
    });

    return new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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

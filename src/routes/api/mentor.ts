import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const Route = createFileRoute("/api/mentor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
          return new Response("Missing GEMINI_API_KEY", {
            status: 500,
          });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const { messages, context } = await request.json();

        const sys = `You are an encouraging AI study mentor inside a Study OS dashboard.

The user is studying this workspace:
${context}

Give concise, actionable guidance.
Suggest study plans, explain topics, recommend order, quiz them.
Keep replies under 180 words.
Use plain markdown.`;

        const chatHistory = messages
          .map((m: any) => `${m.role}: ${m.content}`)
          .join("\n");

        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
        });

        const result = await model.generateContent(`
${sys}

Conversation:
${chatHistory}
`);

        const text = result.response.text();

        return new Response(
          JSON.stringify({ text }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      },
    },
  },
});
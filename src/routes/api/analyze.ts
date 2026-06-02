import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a Study OS that converts ANY learning material (syllabus, notes, slides, table of contents, screenshots, PDFs, spreadsheets) into a clean structured study dashboard.

Analyze the document's structure: headings, sections, categories, columns, hierarchy. Group topics into 2-6 categories. Each category has a list of topics. Each topic may have subtopics.

Return ONLY valid JSON matching this schema (no markdown, no commentary):
{
  "title": string,             // overall subject/title inferred from doc
  "subtitle": string,           // one short descriptive line
  "categories": [
    {
      "name": string,           // SHORT, e.g. "ARITHMETIC"
      "icon": "timer"|"calculator"|"chart"|"book"|"flask"|"globe"|"code"|"brain"|"target"|"pen",
      "color": "amber"|"sky"|"peach"|"mint"|"rose"|"violet",
      "topics": [
        { "name": string, "subtopics": [string] }
      ]
    }
  ]
}

Rules:
- NEVER return raw OCR text or paragraphs of content. Distill into topics.
- Topic names should be short (1-6 words).
- Distribute categories across the 6 colors for visual variety.
- If material is sparse, infer a reasonable hierarchy.
- Subtopics default to empty array [] if none.`;

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =process.env.GEMINI_API_KEY;
        if (!apiKey){ return new Response("Missing GEMINI_API_KEY", { status: 500 }); }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
        });
        let body: { fileName: string; mimeType: string; dataUrl: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const { fileName, mimeType, dataUrl } = body;
        if (!dataUrl) return new Response("Missing file", { status: 400 });

        const isImage = mimeType.startsWith("image/");
        const isPdf = mimeType === "application/pdf";

        // Build user content: vision-capable models accept image_url for images and PDFs (base64 data URL)
        const userContent: any[] = [
          { type: "text", text: `Analyze this file (${fileName}) and produce the structured study dashboard JSON.` },
        ];
        if (isImage || isPdf) {
          userContent.push({ type: "image_url", image_url: { url: dataUrl } });
        } else {
          // Office docs etc — attempt as file via text fallback
          userContent.push({
            type: "text",
            text: `File type ${mimeType} — base64 content follows (truncated if huge): ${dataUrl.slice(0, 200000)}`,
          });
        }

        /*const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!res.ok) {
          const t = await res.text();
          return new Response(t || "AI error", { status: res.status });
        }
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? "{}";*/
 
        const prompt = `
${SYSTEM_PROMPT}

Analyze this file (${fileName}) and return ONLY valid JSON.
`;

let content = "";

if (isImage || isPdf) {
  const base64Data = dataUrl.split(",")[1];

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    },
  ]);

  content = result.response.text();
} else {
  const result = await model.generateContent(`
${prompt}

File Type: ${mimeType}

Content:
${dataUrl.slice(0, 200000)}
`);

  content = result.response.text();
}


        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          // try to extract JSON
          const m = content.match(/\{[\s\S]*\}/);
          parsed = m ? JSON.parse(m[0]) : { title: fileName, subtitle: "", categories: [] };
        }
        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
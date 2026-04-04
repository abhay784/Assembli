import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageParam,
} from "@anthropic-ai/sdk/resources/messages/messages";
import { sceneJsonSchema } from "../scene/json-schema";
import { sceneSchema, type SceneJSON } from "../scene/schema";
import { getAnthropicApiKey, getClaudeModel } from "./model";
import { parseModelJson } from "./parse-json-response";

const SYSTEM_PROMPT = `You extract furniture assembly steps into SceneJSON. Emit only a single JSON object, no markdown.
Schema (JSON Schema): ${JSON.stringify(sceneJsonSchema)}
Every step must include: title, caption, parts, confidence (number 0-1), tools (string array), warnings (string array).`;

function textFromMessage(message: Message): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") {
      parts.push(block.text);
    }
  }
  return parts.join("\n");
}

export async function extractSceneFromPdfBuffer(options: {
  pdfBuffer: Buffer;
  maxAttempts?: number;
}): Promise<SceneJSON> {
  // D-08: default maxAttempts = 3 (initial try + up to 2 retries after validation failure)
  const maxAttempts = options.maxAttempts ?? 3;
  const client = new Anthropic({ apiKey: getAnthropicApiKey() });
  const model = getClaudeModel();
  const pdfBase64 = options.pdfBuffer.toString("base64");

  const messages: MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: pdfBase64,
          },
        },
        {
          type: "text",
          text: "Return SceneJSON for all assembly steps in this PDF.",
        },
      ],
    },
  ];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await client.messages.create({
      model,
      max_tokens: 16_384,
      system: SYSTEM_PROMPT,
      messages,
    });

    const rawText = textFromMessage(response);
    let data: unknown;
    try {
      data = parseModelJson(rawText);
    } catch {
      if (attempt === maxAttempts - 1) {
        throw new Error("Extraction failed");
      }
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content:
          "Your previous message was not valid JSON. Reply with one JSON object only.",
      });
      continue;
    }

    const parsed = sceneSchema.safeParse(data);
    if (parsed.success) {
      return parsed.data;
    }

    if (attempt === maxAttempts - 1) {
      throw new Error("Extraction failed");
    }
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: `Zod validation failed: ${JSON.stringify(parsed.error.flatten())}`,
    });
  }

  throw new Error("Extraction failed");
}

import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";
import { z } from "zod";
import { getAnthropicApiKey, getClaudeModel } from "./model";
import { parseModelJson } from "./parse-json-response";

/**
 * Schema for a single part identified on the hardware/inventory page.
 *
 * Claude returns bounding boxes as percentages of the page dimensions,
 * so they work regardless of rasterization resolution.
 */
export const partInventoryItemSchema = z.object({
  /** Part number from the manual (e.g. "101367", "114670"). */
  partNumber: z.string(),
  /** Human-readable name (e.g. "Wooden dowel", "Cam lock"). */
  name: z.string(),
  /** Quantity listed in the manual. */
  quantity: z.number().int().min(1),
  /** Bounding box as percentage of page width/height (0-100). */
  bbox: z.object({
    /** Left edge as % of page width. */
    xPct: z.number().min(0).max(100),
    /** Top edge as % of page height. */
    yPct: z.number().min(0).max(100),
    /** Width as % of page width. */
    wPct: z.number().min(0).max(100),
    /** Height as % of page height. */
    hPct: z.number().min(0).max(100),
  }),
  /** Which page of the PDF this part appears on (0-indexed). */
  pageIndex: z.number().int().min(0),
  /** Best-matching SceneJSON shape for this part. */
  shape: z.enum(["panel", "screw", "dowel", "leg", "bracket"]).optional(),
  /** Material category for color palette. */
  material: z.enum(["wood", "metal", "plastic"]).optional(),
});

export const partsInventorySchema = z.object({
  parts: z.array(partInventoryItemSchema),
});

export type PartsInventory = z.infer<typeof partsInventorySchema>;
export type PartInventoryItem = z.infer<typeof partInventoryItemSchema>;

const INVENTORY_SYSTEM_PROMPT = `You are analyzing a furniture assembly manual PDF. Your job is to find the HARDWARE INVENTORY PAGE(S) — the page that shows all individual parts/hardware laid out with part numbers and quantities (like an IKEA parts list page).

For EACH distinct part illustrated on that page, return a bounding box that tightly surrounds the part illustration (NOT the text label, NOT the quantity — just the drawn image of the part itself).

Return bounding boxes as PERCENTAGES of the page dimensions (0-100), so they work at any resolution.

Return a single JSON object with this structure:
{
  "parts": [
    {
      "partNumber": "101367",
      "name": "Wooden dowel",
      "quantity": 5,
      "bbox": { "xPct": 2, "yPct": 5, "wPct": 8, "hPct": 25 },
      "pageIndex": 2,
      "shape": "dowel",
      "material": "wood"
    }
  ]
}

Rules:
- Only include parts that have a VISIBLE ILLUSTRATION on the page. Skip text-only entries.
- The bounding box should tightly crop the part illustration with minimal whitespace.
- pageIndex is 0-based (first page of the PDF = 0).
- For shape, pick the closest match: "panel" (flat boards, shelves), "screw" (screws, bolts, nails), "dowel" (dowels, pins, pegs, cam bolts), "leg" (legs, posts), "bracket" (cam locks, brackets, fittings, clips, nuts).
- For material: "wood" (wooden dowels, panels), "metal" (screws, bolts, cam locks, brackets), "plastic" (plastic fittings, clips).
- Include ALL hardware — screws, dowels, cam locks, brackets, nails, specialty fittings.
- Do NOT include large furniture panels/boards that appear in assembly diagrams — only the hardware/parts inventory page illustrations.

Emit only a single JSON object. No markdown fences, no explanation.`;

function textFromMessage(message: Message): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") {
      parts.push(block.text);
    }
  }
  return parts.join("\n");
}

/**
 * Send the full PDF to Claude and ask it to identify all hardware parts
 * with bounding boxes on their inventory page illustrations.
 */
export async function extractPartsInventory(options: {
  pdfBuffer: Buffer;
  maxAttempts?: number;
}): Promise<PartsInventory> {
  const maxAttempts = options.maxAttempts ?? 3;
  const client = new Anthropic({ apiKey: getAnthropicApiKey() });
  const model = getClaudeModel();
  const pdfBase64 = options.pdfBuffer.toString("base64");

  const messages: Anthropic.MessageParam[] = [
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
          text: "Find the hardware/parts inventory page(s) in this manual and return bounding boxes for each part illustration. Return JSON only.",
        },
      ],
    },
  ];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      system: INVENTORY_SYSTEM_PROMPT,
      messages,
    });

    const rawText = textFromMessage(response);
    let data: unknown;
    try {
      data = parseModelJson(rawText);
    } catch {
      if (attempt === maxAttempts - 1) {
        throw new Error("Parts inventory extraction failed: invalid JSON");
      }
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content:
          "Your previous message was not valid JSON. Reply with one JSON object only.",
      });
      continue;
    }

    const parsed = partsInventorySchema.safeParse(data);
    if (parsed.success) {
      return parsed.data;
    }

    if (attempt === maxAttempts - 1) {
      throw new Error(
        `Parts inventory extraction failed: ${JSON.stringify(parsed.error.flatten())}`,
      );
    }
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: `Zod validation failed: ${JSON.stringify(parsed.error.flatten())}. Fix and return valid JSON.`,
    });
  }

  throw new Error("Parts inventory extraction failed");
}

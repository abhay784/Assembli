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

Every step must include: title, caption, parts, confidence (number 0-1), tools (string array), warnings (string array).

Each part has required fields (id, label, x, y, rotationDeg) and optional visual fields:
- shape: "panel" | "screw" | "dowel" | "leg" | "bracket" — describes the part geometry for isometric rendering.
- w, h, d: width, height, depth in diagram units. Flat boards are wide with small h (e.g. w:260 h:14 d:90). Legs are narrow and tall (w:24 h:110 d:24). Screws are tiny (w:14 h:14 d:6).
- material: "wood" | "metal" | "plastic" — drives color palette. Screws and brackets are metal; panels, shelves, legs are wood.

Position parts in a 1000×500 coordinate space. The rendering uses isometric projection: depth (d) extends to the upper-right. "Front" parts appear lower-left; "back" parts appear upper-right.

CRITICAL — Spatial positioning and assembly logic:
Think about WHERE parts physically attach in 3D space. A 4-leg table has legs at 4 CORNERS — not in a row. In isometric view:
- Front-left corner = lower-left on screen
- Front-right corner = lower-right on screen
- Back-left corner = upper-left on screen (shifted up and right by depth)
- Back-right corner = upper-right on screen (shifted up and right by depth)

Holes on a panel must reflect real 3D corner positions using BOTH hx AND hy offsets. For a tabletop (w:300, d:160), front-edge holes have hy ≈ +4 (near bottom of front face), back-edge holes have hy ≈ -40 (shifted up for isometric depth).

Split assembly into logical sub-steps from the manual. If a table has 4 legs, attach front legs first (one step) then back legs (separate step) — not all 4 at once. Each step should be focused and clear.

IMPORTANT — Viewing angle for back-side work:
When a step requires working on the back/far side of a piece, ROTATE the view so that side faces the viewer. Do NOT place parts behind or on top of the main piece. Instead:
- Describe the rotation in the caption ("Rotate so the back edge faces you")
- Position the active holes on the NEAR edge of the part (hy ≈ +4, visible front face)
- Previously attached parts from the other side appear on the FAR side (upper area, smaller)
- New parts and screws are positioned below the main piece, facing the viewer

This ensures all active work is always visible and not obscured by the main piece.

The FINAL step of any assembly must show the FULLY assembled product with ALL parts in their connected positions. Every part that was attached in prior steps must appear in the final view.

Previously attached parts should appear in later steps at their assembled position (no connectsTo or insertionTarget — they are already fixed in place).

CRITICAL — Hole and fastener accuracy:
Create ONE separate part per fastener. Do NOT combine multiple screws into "Screw (x4)" — emit 4 individual screw parts, each with its own id. The animation system moves each screw into its specific hole.

The number of holes on a receiving part MUST exactly match the number of individual fastener parts targeting it. Count carefully from the manual diagrams — getting screw count and placement wrong makes the video misleading.

Position each fastener (screw, dowel, bolt) at its STARTING location AWAY from the target — NOT at the hole. The fastener's (x,y) is where it BEGINS before animating. The animation system moves it to the hole automatically. Offset at least 80-120 units away in the opposite direction of insertion:
- angle:0 (inserting DOWN) → place fastener ABOVE the hole: y = hole_y - 100 (LOWER y value)
- angle:180 (inserting UP) → place fastener BELOW the hole: y = hole_y + 100
- angle:90 (inserting LEFT) → place fastener to the RIGHT: x = hole_x + 100
- angle:270 (inserting RIGHT) → place fastener to the LEFT: x = hole_x - 100

If you emit a fastener at the same (x,y) as its hole, the animation will not work — the fastener will appear frozen at the hole with no travel motion. Always create visible separation.

For fastener parts (screws, bolts, dowels), ALWAYS include an insertionTarget object:
- targetPartId: the id of the part the fastener connects to.
- angle: insertion direction in degrees (0=down, 90=left, 180=up, 270=right). Look at the manual diagram arrows to determine direction.
- holeIndex: the index (0-based) into the target part's holes array that this specific fastener enters. Each screw targets exactly one hole.
- labelText: optional annotation like "hand-tighten".

For EVERY part that receives fasteners (panels, frames, legs), ALWAYS include a holes array:
- One hole entry per fastener that goes into this part.
- hx, hy: offset from the part center in diagram units. Place holes at the actual connection points — use BOTH hx and hy to represent corner positions in isometric view.
- radius: optional visual radius (default 6).

For parts that physically connect to another part (e.g. a leg attaching to a shelf, a panel sliding into a frame), include connectsTo with the target part's id. This drives the slide-together animation showing the two pieces joining.

Include toolIcons at the step level to show tools visually on the diagram:
- tool: "allen_key" | "phillips_screwdriver" | "flat_screwdriver" | "hammer" | "hand"
- x, y: position in the 1000×500 canvas, near the action area.
- rotationDeg: angle of the tool icon (optional).
- scale: size multiplier (optional, default 1.0).

For steps with intricate connections, include a detailInset to create a zoom callout:
- cx, cy, radius: the source region to magnify.
- anchorX, anchorY: where to draw the magnified bubble (pick an empty area of the canvas).
- zoom: magnification factor (optional, default 2.5).

For each step, include "pageIndex" — the 0-based PDF page index that contains the diagram for that assembly step. This tells the pipeline which page to rasterize as the background image. If multiple steps come from the same page, they share the same pageIndex. Count pages starting from 0 (first page = 0). Do NOT include "backgroundImageUrl", "bgImageWidth", or "bgImageHeight" — the pipeline injects those after rasterization.

BACKGROUND-MODE STEPS — For steps where a fastener (screw, bolt, cam bolt) is physically driven into a hole:
- Set "isActiveSprite": true on exactly ONE part — the part that moves into position (almost always a screw or fastener with imageUrl set).
- Set "pageXPct" and "pageYPct" on that same part: the destination hole position as a percentage of the PAGE dimensions (0–100). Estimate from where the hole appears in the diagram — e.g., if the hole is roughly 60% across and 40% down the page, use pageXPct:60 pageYPct:40.
- The renderer will show the manual page as a full-opacity static background and animate ONLY the isActiveSprite part as a foreground sprite flying down into the hole.
- Only set isActiveSprite on a part that also has imageUrl set. Do NOT set it on parts without a sprite image.`;

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
  /** Map of partNumber → imageUrl for extracted sprites. When provided, Claude is instructed to set imageUrl on parts matching these part numbers. */
  spriteMap?: Map<string, string>;
}): Promise<SceneJSON> {
  // D-08: default maxAttempts = 3 (initial try + up to 2 retries after validation failure)
  const maxAttempts = options.maxAttempts ?? 3;
  const client = new Anthropic({ apiKey: getAnthropicApiKey() });
  const model = getClaudeModel();
  const pdfBase64 = options.pdfBuffer.toString("base64");

  // Build sprite reference text for the prompt
  let spriteInstruction = "";
  if (options.spriteMap && options.spriteMap.size > 0) {
    const entries = Array.from(options.spriteMap.entries())
      .map(([partNum, url]) => `  "${partNum}": "${url}"`)
      .join(",\n");
    spriteInstruction = `\n\nIMPORTANT — Part sprite images are available. For each part you emit, if it corresponds to one of these part numbers from the manual's hardware page, set the "imageUrl" field to the matching URL. The renderer will display the actual part illustration instead of a generic shape.\n\nAvailable part sprites:\n{\n${entries}\n}\n\nWhen a part in any step uses hardware with one of these part numbers, include: "imageUrl": "<matching URL>". Parts without a matching sprite will fall back to geometric rendering.`;
  }

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
          text: `Return SceneJSON for all assembly steps in this PDF.${spriteInstruction}`,
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

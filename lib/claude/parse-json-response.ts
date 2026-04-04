const fence =
  /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m;

export function parseModelJson(text: string): unknown {
  let s = text.trim();
  const fenced = s.match(fence);
  if (fenced?.[1]) {
    s = fenced[1].trim();
  }
  try {
    return JSON.parse(s) as unknown;
  } catch {
    throw new Error("Invalid JSON from model");
  }
}

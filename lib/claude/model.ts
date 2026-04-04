export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return key;
}

export function getClaudeModel(): string {
  const model = process.env.CLAUDE_MODEL;
  if (!model) {
    throw new Error("CLAUDE_MODEL is not set");
  }
  return model;
}

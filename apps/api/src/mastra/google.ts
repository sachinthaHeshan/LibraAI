export function getGoogleApiKey(): string | undefined {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  return key || undefined;
}

export function getAnthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key || undefined;
}

export function isAiConfigured(): boolean {
  return Boolean(getAnthropicApiKey());
}

export function isBookIndexingEnabled(): boolean {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return false;
  }
  return Boolean(getGoogleApiKey());
}

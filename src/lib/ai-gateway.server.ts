import { google } from "@ai-sdk/google";

export function createGoogleAiGatewayProvider(apiKey: string, model?: string) {
  return google(model ?? "gemini-2.5-flash", { apiKey });
}

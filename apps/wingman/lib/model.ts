import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type Provider = "mimo" | "anthropic";

export function resolveProvider(): Provider {
  const explicit = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  if (explicit === "mimo" || explicit === "anthropic") return explicit;
  if (process.env.XIAOMI_MIMO_API_KEY) return "mimo";
  return "anthropic";
}

export function getVerdictModel(): { model: LanguageModel; label: string } {
  const provider = resolveProvider();

  if (provider === "mimo") {
    const apiKey = process.env.XIAOMI_MIMO_API_KEY;
    if (!apiKey) {
      throw new Error(
        "XIAOMI_MIMO_API_KEY is not set. Set it or switch LLM_PROVIDER=anthropic.",
      );
    }
    const baseURL = process.env.XIAOMI_MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1";
    const modelId = process.env.XIAOMI_MIMO_MODEL ?? "mimo-v2-flash";
    const mimo = createOpenAICompatible({
      name: "xiaomi-mimo",
      apiKey,
      baseURL,
    });
    return { model: mimo.chatModel(modelId), label: `mimo:${modelId}` };
  }

  const modelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
  return { model: anthropic(modelId), label: `anthropic:${modelId}` };
}

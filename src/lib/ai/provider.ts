import "server-only";

/**
 * A deliberately small surface for text generation, so the app never depends
 * on one vendor. Adding a provider means implementing `complete` and reading
 * its key from the environment; nothing else in the app changes.
 *
 * No provider is configured by default. Every AI feature degrades to a clear
 * "not set up yet" message rather than failing, so the product works without it.
 */

export interface CompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface AiProvider {
  /** Shown in the UI so the user knows what is answering. */
  name: string;
  complete(req: CompletionRequest): Promise<string>;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "AI is not set up yet. Add a provider key to enable it (see README).",
    );
    this.name = "AiNotConfiguredError";
  }
}

const DEFAULT_MAX_TOKENS = 1024;

/** Anthropic Claude via the Messages API. */
function anthropicProvider(apiKey: string, model: string): AiProvider {
  return {
    name: "Claude",
    async complete({ system, prompt, maxTokens }) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        throw new Error(`Claude request failed (${res.status})`);
      }
      const json = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      return (json.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("")
        .trim();
    },
  };
}

/** OpenAI via the Chat Completions API. */
function openaiProvider(apiKey: string, model: string): AiProvider {
  return {
    name: "OpenAI",
    async complete({ system, prompt, maxTokens }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_completion_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI request failed (${res.status})`);
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return (json.choices?.[0]?.message?.content ?? "").trim();
    },
  };
}

/**
 * Resolve the configured provider, or null when none is set up.
 *
 * Selection is by whichever key is present, so adding a key is the only step
 * needed to switch AI on. AI_PROVIDER forces a choice when both exist.
 */
export function getAiProvider(): AiProvider | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase();

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const useAnthropic =
    forced === "anthropic" || (!forced && !!anthropicKey && !openaiKey);
  const useOpenai = forced === "openai" || (!forced && !!openaiKey);

  if (useAnthropic && anthropicKey) {
    return anthropicProvider(
      anthropicKey,
      process.env.AI_MODEL || "claude-sonnet-5",
    );
  }
  if (useOpenai && openaiKey) {
    return openaiProvider(openaiKey, process.env.AI_MODEL || "gpt-5");
  }
  // Fall back to whichever key exists, regardless of order.
  if (anthropicKey) {
    return anthropicProvider(
      anthropicKey,
      process.env.AI_MODEL || "claude-sonnet-5",
    );
  }
  return null;
}

export function isAiConfigured(): boolean {
  return getAiProvider() !== null;
}

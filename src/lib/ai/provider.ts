import "server-only";

import { z } from "zod";

export type AiErrorCode =
    | "CONFIGURATION_ERROR"
    | "TIMEOUT"
    | "RATE_LIMIT"
    | "INVALID_KEY"
    | "EMPTY_RESPONSE"
    | "MALFORMED_RESPONSE"
    | "REQUEST_FAILED";

export class AiProviderError extends Error {
    constructor(
        public readonly code: AiErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "AiProviderError";
    }
}

export type GenerateJsonRequest<T> = {
    system: string;
    user: string;
    schema: z.ZodType<T>;
    timeoutMs?: number;
};

export interface AiProvider {
    generateJson<T>(
        request: GenerateJsonRequest<T>,
    ): Promise<T>;
}

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
};

type CompatibleResponse = {
    choices?: Array<{
        message?: {
            content?: unknown;
        };
    }>;
};

const DEFAULT_TIMEOUT_MS = 60_000;

function parseAndValidate<T>(
    text: string,
    request: GenerateJsonRequest<T>,
    providerName: string,
): T {
    const trimmedText = text.trim();

    if (!trimmedText) {
        throw new AiProviderError(
            "EMPTY_RESPONSE",
            `The ${providerName} API returned an empty response.`,
        );
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(trimmedText);

        // Some providers return JSON encoded as a JSON string.
        if (typeof parsed === "string") {
            try {
                parsed = JSON.parse(parsed);
            } catch {
                // Keep the original parsed value for normal validation.
            }
        }
    } catch {
        throw new AiProviderError(
            "MALFORMED_RESPONSE",
            `The ${providerName} response was not valid JSON.`,
        );
    }

    const candidates = Array.isArray(parsed)
        ? [
            parsed,
            {
                requirements: parsed,
            },
        ]
        : [parsed];

    for (const candidate of candidates) {
        const validation = request.schema.safeParse(candidate);

        if (validation.success) {
            return validation.data;
        }
    }

    const validation = request.schema.safeParse(parsed);

    const issueSummary = validation.success
        ? []
        : validation.error.issues.map((issue) => ({
            path: issue.path.join(".") || "(root)",
            code: issue.code,
        }));

    throw new AiProviderError(
        "MALFORMED_RESPONSE",
        `The ${providerName} response did not match the required schema. Issues: ${JSON.stringify(
            issueSummary,
        )}`,
    );
}

function getGeminiModel() {
    const configuredModel = process.env.AI_MODEL?.trim();

    if (!configuredModel) {
        throw new AiProviderError(
            "CONFIGURATION_ERROR",
            "AI_MODEL is not configured.",
        );
    }

    return configuredModel.startsWith("models/")
        ? configuredModel.slice("models/".length)
        : configuredModel;
}

function getGeminiApiKey() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
        throw new AiProviderError(
            "CONFIGURATION_ERROR",
            "GEMINI_API_KEY is not configured.",
        );
    }

    return apiKey;
}

function getGeminiResponseText(payload: unknown) {
    const response = payload as GeminiResponse;

    return response.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";
}

function getCompatibleResponseText(payload: unknown) {
    const response = payload as CompatibleResponse;
    const content = response.choices?.[0]?.message?.content;

    if (typeof content === "string") {
        return content.trim();
    }

    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (
                    typeof part === "object" &&
                    part !== null &&
                    "text" in part
                ) {
                    const text = (part as { text?: unknown }).text;
                    return typeof text === "string" ? text : "";
                }

                return "";
            })
            .join("")
            .trim();
    }

    return "";
}

function createHttpError(
    providerName: string,
    status: number,
) {
    if (status === 401 || status === 403) {
        return new AiProviderError(
            "INVALID_KEY",
            `The ${providerName} API key was rejected.`,
        );
    }

    if (status === 429) {
        return new AiProviderError(
            "RATE_LIMIT",
            `The ${providerName} API rate limit was reached.`,
        );
    }

    if (status === 408 || status === 504) {
        return new AiProviderError(
            "TIMEOUT",
            `The ${providerName} API request timed out.`,
        );
    }

    return new AiProviderError(
        "REQUEST_FAILED",
        `The ${providerName} API request failed with HTTP status ${status}.`,
    );
}

class GeminiProvider implements AiProvider {
    async generateJson<T>(
        request: GenerateJsonRequest<T>,
    ): Promise<T> {
        const apiKey = getGeminiApiKey();
        const model = getGeminiModel();
        const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            const endpoint =
                `https://generativelanguage.googleapis.com/v1beta/models/` +
                `${encodeURIComponent(model)}:generateContent`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: request.system }],
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: request.user }],
                        },
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                    },
                }),
                signal: controller.signal,
            });

            const responseText = await response.text();

            let payload: unknown = null;

            try {
                payload = JSON.parse(responseText);
            } catch {
                payload = null;
            }

            if (!response.ok) {
                throw createHttpError("Gemini", response.status);
            }

            return parseAndValidate(
                getGeminiResponseText(payload),
                request,
                "Gemini",
            );
        } catch (error) {
            if (error instanceof AiProviderError) {
                throw error;
            }

            if (
                error instanceof Error &&
                error.name === "AbortError"
            ) {
                throw new AiProviderError(
                    "TIMEOUT",
                    "The Gemini API request timed out.",
                );
            }

            throw new AiProviderError(
                "REQUEST_FAILED",
                "Unable to reach the Gemini API.",
            );
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

type CompatibleProviderConfig = {
    name: string;
    apiKeyEnvironmentVariable: string;
    modelEnvironmentVariable: string;
    defaultModel: string;
    endpoint: string;
    extraHeaders?: Record<string, string>;
};

class OpenAiCompatibleProvider implements AiProvider {
    constructor(
        private readonly config: CompatibleProviderConfig,
    ) { }

    async generateJson<T>(
        request: GenerateJsonRequest<T>,
    ): Promise<T> {
        const apiKey = process.env[
            this.config.apiKeyEnvironmentVariable
        ]?.trim();

        if (!apiKey) {
            throw new AiProviderError(
                "CONFIGURATION_ERROR",
                `${this.config.apiKeyEnvironmentVariable} is not configured.`,
            );
        }

        const model =
            process.env[
                this.config.modelEnvironmentVariable
            ]?.trim() || this.config.defaultModel;

        const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const controller = new AbortController();

        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            const response = await fetch(
                this.config.endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                        ...this.config.extraHeaders,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            {
                                role: "system",
                                content: request.system,
                            },
                            {
                                role: "user",
                                content: request.user,
                            },
                        ],
                        temperature: 0,
                        ...(this.config.name === "Groq"
                            ? {
                                max_tokens: 900,
                            }
                            : {}),
                        ...(this.config.name === "Groq" &&
                            model.startsWith("openai/gpt-oss-")
                            ? {
                                include_reasoning: false,
                                reasoning_effort: "low",
                            }
                            : {}),
                        response_format: {
                            type: "json_object",
                        },
                    }),
                    signal: controller.signal,
                },
            );

            const responseText = await response.text();

            let payload: unknown = null;

            try {
                payload = JSON.parse(responseText);
            } catch {
                payload = null;
            }

            if (!response.ok) {
                console.warn("AI provider HTTP failure.", {
                    provider: this.config.name,
                    status: response.status,
                    body: responseText.slice(0, 1000),
                });

                throw createHttpError(
                    this.config.name,
                    response.status,
                );
            }

            return parseAndValidate(
                getCompatibleResponseText(payload),
                request,
                this.config.name,
            );
        } catch (error) {
            if (error instanceof AiProviderError) {
                throw error;
            }

            if (
                error instanceof Error &&
                error.name === "AbortError"
            ) {
                throw new AiProviderError(
                    "TIMEOUT",
                    `The ${this.config.name} API request timed out.`,
                );
            }

            throw new AiProviderError(
                "REQUEST_FAILED",
                `Unable to reach the ${this.config.name} API.`,
            );
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

class FallbackProvider implements AiProvider {
    constructor(
        private readonly providers: Array<{
            name: string;
            provider: AiProvider;
        }>,
    ) { }

    async generateJson<T>(
        request: GenerateJsonRequest<T>,
    ): Promise<T> {
        let lastError: AiProviderError | null = null;

        for (const entry of this.providers) {
            try {
                return await entry.provider.generateJson(request);
            } catch (error) {
                if (error instanceof AiProviderError) {
                    lastError = new AiProviderError(
                        error.code,
                        `${entry.name}: ${error.message}`,
                    );
                    console.warn("AI provider attempt failed.", {
                        provider: entry.name,
                        code: error instanceof AiProviderError
                            ? error.code
                            : "REQUEST_FAILED",
                        message:
                            error instanceof Error
                                ? error.message
                                : "Unknown provider error.",
                    });
                } else {
                    lastError = new AiProviderError(
                        "REQUEST_FAILED",
                        `${entry.name}: provider request failed.`,
                    );
                }
            }
        }

        throw (
            lastError ??
            new AiProviderError(
                "CONFIGURATION_ERROR",
                "No AI providers are configured.",
            )
        );
    }
}

function createProvider(
    providerName: string,
): { name: string; provider: AiProvider } {
    if (providerName === "gemini") {
        return {
            name: "Gemini",
            provider: new GeminiProvider(),
        };
    }

    if (providerName === "groq") {
        return {
            name: "Groq",
            provider: new OpenAiCompatibleProvider({
                name: "Groq",
                apiKeyEnvironmentVariable: "GROQ_API_KEY",
                modelEnvironmentVariable: "GROQ_MODEL",
                defaultModel: "openai/gpt-oss-20b",
                endpoint:
                    "https://api.groq.com/openai/v1/chat/completions",
            }),
        };
    }

    if (providerName === "openrouter") {
        return {
            name: "OpenRouter",
            provider: new OpenAiCompatibleProvider({
                name: "OpenRouter",
                apiKeyEnvironmentVariable:
                    "OPENROUTER_API_KEY",
                modelEnvironmentVariable: "OPENROUTER_MODEL",
                defaultModel: "openrouter/free",
                endpoint:
                    "https://openrouter.ai/api/v1/chat/completions",
                extraHeaders: {
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "TenderPilot AI",
                },
            }),
        };
    }

    throw new AiProviderError(
        "CONFIGURATION_ERROR",
        `Unsupported AI provider: ${providerName}`,
    );
}

export function createAiProvider(): AiProvider {
    const configuredChain =
        process.env.AI_PROVIDER_CHAIN?.trim() ||
        process.env.AI_PROVIDER?.trim() ||
        "gemini";

    const providerNames = configuredChain
        .split(",")
        .map((provider) => provider.trim().toLowerCase())
        .filter(Boolean);

    const providers = providerNames.map(createProvider);

    if (providers.length === 1) {
        return providers[0].provider;
    }

    return new FallbackProvider(providers);
}
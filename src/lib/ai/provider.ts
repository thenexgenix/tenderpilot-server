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

const DEFAULT_TIMEOUT_MS = 60_000;

function getModelName() {
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

function getApiKey() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
        throw new AiProviderError(
            "CONFIGURATION_ERROR",
            "GEMINI_API_KEY is not configured.",
        );
    }

    return apiKey;
}

function getResponseText(payload: unknown) {
    const response = payload as GeminiResponse;

    const text = response.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();

    return text ?? "";
}

function createHttpError(status: number) {
    if (status === 401 || status === 403) {
        return new AiProviderError(
            "INVALID_KEY",
            "The Gemini API key was rejected.",
        );
    }

    if (status === 429) {
        return new AiProviderError(
            "RATE_LIMIT",
            "The Gemini API rate limit was reached.",
        );
    }

    if (status === 408 || status === 504) {
        return new AiProviderError(
            "TIMEOUT",
            "The Gemini API request timed out.",
        );
    }

    return new AiProviderError(
        "REQUEST_FAILED",
        `The Gemini API request failed with HTTP status ${status}.`,
    );
}

class GeminiProvider implements AiProvider {
    async generateJson<T>(
        request: GenerateJsonRequest<T>,
    ): Promise<T> {
        const apiKey = getApiKey();
        const model = getModelName();
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
                throw createHttpError(response.status);
            }

            const modelText = getResponseText(payload);

            if (!modelText) {
                throw new AiProviderError(
                    "EMPTY_RESPONSE",
                    "The Gemini API returned an empty response.",
                );
            }

            let parsed: unknown;

            try {
                parsed = JSON.parse(modelText);
            } catch {
                throw new AiProviderError(
                    "MALFORMED_RESPONSE",
                    "The Gemini response was not valid JSON.",
                );
            }

            const validation = request.schema.safeParse(parsed);

            if (!validation.success) {
                throw new AiProviderError(
                    "MALFORMED_RESPONSE",
                    "The Gemini response did not match the required schema.",
                );
            }

            return validation.data;
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

export function createAiProvider(): AiProvider {
    const provider = (
        process.env.AI_PROVIDER ?? "gemini"
    ).trim().toLowerCase();

    if (provider === "gemini") {
        return new GeminiProvider();
    }

    throw new AiProviderError(
        "CONFIGURATION_ERROR",
        `Unsupported AI provider: ${provider}`,
    );
}
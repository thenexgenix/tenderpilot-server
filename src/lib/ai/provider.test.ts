import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import {
    AiProviderError,
    createAiProvider,
} from "./provider";
import { createFakeProvider } from "./fake-provider";

const answerSchema = z.object({
    answer: z.string(),
});

const request = {
    system: "Return JSON only.",
    user: "Answer the test question.",
    schema: answerSchema,
};

describe("fake AI provider", () => {
    it("returns schema-validated data", async () => {
        const provider = createFakeProvider({
            answer: "test answer",
        });

        await expect(
            provider.generateJson(request),
        ).resolves.toEqual({
            answer: "test answer",
        });
    });

    it("rejects malformed fake data", async () => {
        const provider = createFakeProvider({
            answer: 123,
        });

        await expect(
            provider.generateJson(request),
        ).rejects.toMatchObject({
            code: "MALFORMED_RESPONSE",
        });
    });

    it("can simulate a provider failure", async () => {
        const provider = createFakeProvider(
            {},
            new AiProviderError(
                "TIMEOUT",
                "Simulated timeout.",
            ),
        );

        await expect(
            provider.generateJson(request),
        ).rejects.toMatchObject({
            code: "TIMEOUT",
        });
    });
});

describe("Gemini provider error mapping", () => {
    beforeEach(() => {
        process.env.GEMINI_API_KEY = "test-key-only";
        process.env.AI_MODEL = "gemini-test-model";
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("maps invalid JSON to MALFORMED_RESPONSE", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [{ text: "not valid json" }],
                                },
                            },
                        ],
                    }),
                    { status: 200 },
                ),
            ),
        );

        const provider = createAiProvider();

        await expect(
            provider.generateJson(request),
        ).rejects.toMatchObject({
            code: "MALFORMED_RESPONSE",
        });
    });

    it("maps an empty response to EMPTY_RESPONSE", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        candidates: [],
                    }),
                    { status: 200 },
                ),
            ),
        );

        const provider = createAiProvider();

        await expect(
            provider.generateJson(request),
        ).rejects.toMatchObject({
            code: "EMPTY_RESPONSE",
        });
    });

    it("maps unauthorized responses to INVALID_KEY", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        error: {
                            message: "Unauthorized",
                        },
                    }),
                    { status: 401 },
                ),
            ),
        );

        const provider = createAiProvider();

        await expect(
            provider.generateJson(request),
        ).rejects.toMatchObject({
            code: "INVALID_KEY",
        });
    });

    it("maps rate limits to RATE_LIMIT", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        error: {
                            message: "Rate limit reached",
                        },
                    }),
                    { status: 429 },
                ),
            ),
        );

        const provider = createAiProvider();

        await expect(
            provider.generateJson(request),
        ).rejects.toMatchObject({
            code: "RATE_LIMIT",
        });
    });

    it("maps aborted requests to TIMEOUT", async () => {
        const abortError = new Error("Request aborted");
        abortError.name = "AbortError";

        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(abortError),
        );

        const provider = createAiProvider();

        await expect(
            provider.generateJson({
                ...request,
                timeoutMs: 10,
            }),
        ).rejects.toMatchObject({
            code: "TIMEOUT",
        });
    });
});
import {
    AiProviderError,
    type AiProvider,
    type GenerateJsonRequest,
} from "./provider";

export function createFakeProvider(
    response: unknown,
    configuredError?: AiProviderError,
): AiProvider {
    return {
        async generateJson<T>(
            request: GenerateJsonRequest<T>,
        ): Promise<T> {
            if (configuredError) {
                throw configuredError;
            }

            const validation = request.schema.safeParse(response);

            if (!validation.success) {
                throw new AiProviderError(
                    "MALFORMED_RESPONSE",
                    "The fake AI response did not match the required schema.",
                );
            }

            return validation.data;
        },
    };
}
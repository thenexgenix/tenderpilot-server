import {
    AiProviderError,
    type AiProvider,
} from "./provider";
import {
    draftGenerationResponseSchema,
    type DraftGenerationResponse,
    type DraftSectionOutput,
} from "./draft-schemas";
import {
    DRAFT_SYSTEM_PROMPT,
    buildDraftUserPrompt,
    type DraftPromptInput,
} from "./draft-prompt";

const sectionDefinitions = [
    {
        key: "executive_summary",
        title: "Executive Summary",
    },
    {
        key: "understanding",
        title: "Understanding of Requirements",
    },
    {
        key: "technical_approach",
        title: "Technical Approach",
    },
    {
        key: "compliance_response",
        title: "Compliance Response",
    },
    {
        key: "company_information",
        title: "Company Information",
    },
] as const;

export type DraftSafetyWarning = {
    sectionKey: string;
    kind:
    | "FORBIDDEN_PHRASE"
    | "UNSUPPORTED_NUMBER"
    | "PRICE_CONTENT";
    message: string;
};

export type GeneratedDraft = {
    sections: Array<
        DraftSectionOutput & {
            title: string;
        }
    >;
    warnings: DraftSafetyWarning[];
};

const forbiddenPhrasePatterns = [
    /\b(?:(?:legally|fully)\s+|\d+(?:\.\d+)?%\s+)?compliant\b/gi,
    /\b(?:we|our proposal|this proposal|the bidder|the company)\s+(?:are|is|will be|shall be)\s+compliant\b/gi,
    /\b(?:we|our proposal|this proposal|the bidder|the company)\s+(?:will\s+)?guarantee(?:d|s|ing)?\b/gi,
    /\bguaranteed\s+(?:compliance|results|delivery|outcome|performance)\b/gi,
];

const pricePatterns = [
    /\b(?:BDT|USD|EUR|INR|GBP|TK|৳)\s*[\d,]+(?:\.\d+)?/gi,
    /\b(?:price schedule|bill of quantities|prices?|boq)\b/gi,
];

function normalizeNumber(value: string) {
    return value.replaceAll(",", "").trim();
}

function collectSourceNumbers(input: DraftPromptInput) {
    const serialized = JSON.stringify(input);
    const matches =
        serialized.match(/\b\d[\d,]*(?:\.\d+)?%?\b/g) ?? [];

    return new Set(matches.map(normalizeNumber));
}

function findUnsupportedNumbers(
    content: string,
    sourceNumbers: Set<string>,
) {
    const matches =
        content.match(/\b\d[\d,]*(?:\.\d+)?%?\b/g) ?? [];

    return Array.from(
        new Set(
            matches
                .map(normalizeNumber)
                .filter((number) => !sourceNumbers.has(number)),
        ),
    );
}

function sanitizeContent(
    sectionKey: string,
    content: string,
    warnings: DraftSafetyWarning[],
) {
    let sanitized = content;

    for (const pattern of forbiddenPhrasePatterns) {
        if (pattern.test(sanitized)) {
            warnings.push({
                sectionKey,
                kind: "FORBIDDEN_PHRASE",
                message:
                    "A forbidden compliance or guarantee phrase was replaced.",
            });

            sanitized = sanitized.replace(
                pattern,
                "[REVIEW REQUIRED: unsupported claim removed]",
            );
        }

        pattern.lastIndex = 0;
    }

    for (const pattern of pricePatterns) {
        if (pattern.test(sanitized)) {
            warnings.push({
                sectionKey,
                kind: "PRICE_CONTENT",
                message:
                    "Price or financial content was removed from the draft.",
            });

            sanitized = sanitized.replace(
                pattern,
                "[REVIEW REQUIRED: financial detail removed]"
            );
        }

        pattern.lastIndex = 0;
    }

    return sanitized.trim();
}

function assertUniqueSections(
    sections: DraftSectionOutput[],
) {
    const keys = sections.map((section) => section.key);
    const uniqueKeys = new Set(keys);

    if (uniqueKeys.size !== sectionDefinitions.length) {
        throw new AiProviderError(
            "MALFORMED_RESPONSE",
            "The draft provider returned duplicate or missing sections.",
        );
    }
}

function normalizeSections(
    response: DraftGenerationResponse,
): DraftSectionOutput[] {
    if ("sections" in response) {
        return response.sections;
    }

    return sectionDefinitions.map((definition) => ({
        key: definition.key,
        content: response[definition.key],
    }));
}

export async function generateTenderDraft(
    input: DraftPromptInput,
    provider: AiProvider,
): Promise<GeneratedDraft> {
    let attempt = 0;

    while (true) {
        try {
            const retryInstruction =
                attempt > 0
                    ? [
                        "",
                        "This is a retry after schema validation failed.",
                        "Return exactly one JSON object.",
                        "Return exactly five sections.",
                        "Use these exact keys:",
                        "executive_summary, understanding, technical_approach, compliance_response, company_information.",
                        "Each section must contain a non-empty content string.",
                        "Do not use Markdown code fences.",
                        "Do not add explanations outside the JSON object.",
                        "Use a top-level object, not a sections array.",
                        "Use exactly these properties: executive_summary, understanding, technical_approach, compliance_response, company_information.",
                    ].join("\n")
                    : "";

            const rawResult = await provider.generateJson({
                system: DRAFT_SYSTEM_PROMPT,
                user:
                    buildDraftUserPrompt(input) +
                    retryInstruction,
                schema: draftGenerationResponseSchema,
                timeoutMs: 60_000,
            });

            const rawSections = normalizeSections(rawResult);

            assertUniqueSections(rawSections);

            const sourceNumbers = collectSourceNumbers(input);
            const warnings: DraftSafetyWarning[] = [];

            const sections = sectionDefinitions.map((definition) => {
                const rawSection = rawSections.find(
                    (section) => section.key === definition.key,
                );

                if (!rawSection) {
                    throw new AiProviderError(
                        "MALFORMED_RESPONSE",
                        `Missing draft section: ${definition.key}.`,
                    );
                }

                const unsupportedNumbers = findUnsupportedNumbers(
                    rawSection.content,
                    sourceNumbers,
                );

                const content = sanitizeContent(
                    definition.key,
                    rawSection.content,
                    warnings,
                );

                for (const number of unsupportedNumbers) {
                    warnings.push({
                        sectionKey: definition.key,
                        kind: "UNSUPPORTED_NUMBER",
                        message: `Unsupported number detected: ${number}.`,
                    });
                }

                return {
                    key: definition.key,
                    title: definition.title,
                    content,
                };
            });

            return {
                sections,
                warnings,
            };
        } catch (error) {
            const shouldRetry =
                attempt === 0 &&
                error instanceof AiProviderError &&
                error.code === "MALFORMED_RESPONSE";

            if (!shouldRetry) {
                throw error;
            }

            attempt += 1;
        }
    }
}
import type { AnalysisPage } from "@/lib/ai/chunk-pages";
import type { ExtractedRequirement } from "@/lib/ai/schemas";

type LocatedRequirement = ExtractedRequirement & {
    sourceStart: number;
    sourceEnd: number;
};

const CONTINUATION_START = /^(?:and|or|but|which|that|these|those|placed|clearly|defects?|during|without|within|before|after|where|upon|specified)\b/i;
const INCOMPLETE_END = /\b(?:a|an|the|and|or|of|for|from|to|with|in|on|at|by|before|during|without|as|that|be|detailed|specified)\s*$/i;
const LEAD_IN = /(?:responsible for the following|include(?:s)?(?: the following)?|satisfy all of the following(?: requirements?)?|as follows|following (?:documents?|items?|requirements?))\s*:?$/i;
const HEADING = /^(?:\d+[.)]?\s*)?(?:invitation|project background|scope of work|technical specifications?|implementation schedule|eligibility|qualification|required documents?|evaluation criteria|estimated project budget|tender submission|payment terms|performance security|general terms|contact information)\b/i;
const NUMBER_ONLY = /^(?:[•*-]\s*)?\d{1,3}[.)]?\s*$/;

function normalize(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
    return new Set(
        normalize(value)
            .replace(/[^a-z0-9%]+/g, " ")
            .split(" ")
            .filter((token) => token.length >= 4),
    );
}

function overlap(left: string, right: string) {
    const rightTokens = tokens(right);

    return [...tokens(left)].filter((token) => rightTokens.has(token)).length;
}

function isSameSourceCandidate(
    left: LocatedRequirement,
    right: LocatedRequirement,
) {
    if (
        left.page_number !== right.page_number ||
        left.sourceStart !== right.sourceStart
    ) {
        return false;
    }

    const leftQuote = normalize(left.quote);
    const rightQuote = normalize(right.quote);

    if (leftQuote === rightQuote) {
        return true;
    }

    const shorter = leftQuote.length <= rightQuote.length ? leftQuote : rightQuote;
    const longer = leftQuote.length <= rightQuote.length ? rightQuote : leftQuote;

    return (
        shorter.length >= 20 &&
        longer.includes(shorter)
    ) || overlap(left.quote, right.quote) >= 4;
}

function preferSourceCandidate(
    left: LocatedRequirement,
    right: LocatedRequirement,
) {
    const leftSpan = left.sourceEnd - left.sourceStart;
    const rightSpan = right.sourceEnd - right.sourceStart;

    if (leftSpan !== rightSpan) {
        return leftSpan < rightSpan ? left : right;
    }

    return left.quote.length <= right.quote.length ? left : right;
}

function findSourceLine(lines: string[], quote: string, text: string) {
    const needle = tokens(quote || text);
    let bestIndex = -1;
    let bestScore = 0;

    lines.forEach((line, index) => {
        const score = [...tokens(line)].filter((token) => needle.has(token)).length;

        if (score > bestScore) {
            bestIndex = index;
            bestScore = score;
        }
    });

    return bestIndex;
}

function isSentenceComplete(line: string) {
    return /[.!?]$/.test(line.trim());
}

function isContinuation(line: string) {
    const text = line.trim();

    return (
        /^[a-z]/.test(text) ||
        CONTINUATION_START.test(text)
    );
}

function shouldContinueLine(current: string, next: string) {
    return (
        isContinuation(next) ||
        INCOMPLETE_END.test(current.trim())
    );
}

function expandToSourceSentence(
    lines: string[],
    requirement: ExtractedRequirement,
) {
    const sourceStart = findSourceLine(lines, requirement.quote, requirement.text);

    if (sourceStart < 0) {
        return {
            ...requirement,
            sourceStart: Number.MAX_SAFE_INTEGER,
            sourceEnd: Number.MAX_SAFE_INTEGER,
        } satisfies LocatedRequirement;
    }

    let start = sourceStart;
    let end = sourceStart;

    const needsExpansion =
        !isSentenceComplete(requirement.text) ||
        /^[a-z]/.test(requirement.text.trim()) ||
        INCOMPLETE_END.test(requirement.text.trim());

    if (!needsExpansion) {
        return {
            ...requirement,
            sourceStart,
            sourceEnd: sourceStart,
        } satisfies LocatedRequirement;
    }

    if (/^[a-z]/.test(lines[start].trim()) && start > 0 && !HEADING.test(lines[start - 1])) {
        start -= 1;

        while (start > 0 && !isSentenceComplete(lines[start - 1]) && !HEADING.test(lines[start - 1])) {
            start -= 1;
        }
    }

    while (
        end + 1 < lines.length &&
        !isSentenceComplete(lines[end]) &&
        shouldContinueLine(lines[end], lines[end + 1]) &&
        !HEADING.test(lines[end + 1])
    ) {
        end += 1;
    }

    const sourceText = lines.slice(start, end + 1).join(" ").trim();

    return {
        ...requirement,
        text: sourceText || requirement.text,
        quote: sourceText || requirement.quote,
        sourceStart: start,
        sourceEnd: end,
    } satisfies LocatedRequirement;
}

function shouldMerge(left: LocatedRequirement, right: LocatedRequirement) {
    if (left.page_number !== right.page_number) {
        return false;
    }

    if (
        left.sourceStart === Number.MAX_SAFE_INTEGER ||
        right.sourceStart === Number.MAX_SAFE_INTEGER ||
        right.sourceStart < left.sourceStart ||
        normalize(right.text) === normalize(left.text)
    ) {
        return false;
    }

    if (right.sourceStart > left.sourceEnd + 2) {
        return false;
    }

    const rightIsDependent = CONTINUATION_START.test(right.text.trim());
    const sharedTopic = overlap(left.text, right.text);
    const warrantyChain =
        /warranty|guarantee/i.test(left.text) &&
        /defect|repair|replace|additional cost|warranty period/i.test(right.text);
    const submissionChain =
        /sealed envelope|submission|proposal/i.test(left.text) &&
        /placed|marked|outer envelope|tender reference|project title/i.test(right.text);

    return (
        rightIsDependent && (sharedTopic >= 1 || warrantyChain || submissionChain)
    ) || warrantyChain || submissionChain;
}

function mergeRequirements(
    left: LocatedRequirement,
    right: LocatedRequirement,
) {
    return {
        ...left,
        text: `${left.text} ${right.text}`.replace(/\s+/g, " ").trim(),
        quote: `${left.quote} ${right.quote}`.replace(/\s+/g, " ").trim(),
        obligation:
            left.obligation === "MANDATORY" || right.obligation === "MANDATORY"
                ? "MANDATORY"
                : left.obligation,
        sourceEnd: Math.max(left.sourceEnd, right.sourceEnd),
    } satisfies LocatedRequirement;
}

export function consolidateExtractedRequirements(
    requirements: ExtractedRequirement[],
    pages: AnalysisPage[] = [],
) {
    const pageMap = new Map(
        pages.map((page) => [page.pageNumber, page.text.split(/\r?\n/)]),
    );

    const located = requirements
        .map((requirement) => {
            const lines = pageMap.get(requirement.page_number);

            return lines
                ? expandToSourceSentence(lines, requirement)
                : {
                    ...requirement,
                    sourceStart: Number.MAX_SAFE_INTEGER,
                    sourceEnd: Number.MAX_SAFE_INTEGER,
                } satisfies LocatedRequirement;
        })
        .filter(
            (requirement) =>
                !LEAD_IN.test(requirement.text.trim()) &&
                !HEADING.test(requirement.text.trim()) &&
                !NUMBER_ONLY.test(requirement.text.trim()),
        )
        .sort(
            (left, right) =>
                left.page_number - right.page_number ||
                left.sourceStart - right.sourceStart,
        );

    const consolidated: LocatedRequirement[] = [];

    for (const requirement of located) {
        const previous = consolidated.at(-1);

        const sameSourceIndex = consolidated.findIndex((candidate) =>
            isSameSourceCandidate(candidate, requirement),
        );

        if (sameSourceIndex >= 0) {
            consolidated[sameSourceIndex] = preferSourceCandidate(
                consolidated[sameSourceIndex],
                requirement,
            );
            continue;
        }

        if (previous && shouldMerge(previous, requirement)) {
            consolidated[consolidated.length - 1] = mergeRequirements(
                previous,
                requirement,
            );
        } else {
            consolidated.push(requirement);
        }
    }

    return consolidated.map(({ sourceStart, sourceEnd, ...requirement }) => {
        void sourceStart;
        void sourceEnd;
        return requirement;
    });
}

function sentenceParts(value: string) {
    return value
        .split(/(?<=[.!?])\s+(?=[A-Z0-9•])/)
        .map((part) => part.trim())
        .filter(Boolean);
}

export function splitCompoundSentenceRequirements(
    requirements: ExtractedRequirement[],
) {
    return requirements.flatMap((requirement) => {
        const quoteParts = sentenceParts(requirement.quote);

        if (quoteParts.length < 2) {
            return [requirement];
        }

        const textParts = sentenceParts(requirement.text);

        return quoteParts.map((quote, index) => ({
            ...requirement,
            text: textParts[index] ?? quote,
            quote,
        }));
    });
}

const DOCUMENT_TERMS = [
    { pattern: /trade license/i, category: "TAX_VAT" },
    { pattern: /TIN certificate/i, category: "TAX_VAT" },
    { pattern: /VAT registration/i, category: "TAX_VAT" },
    { pattern: /tax registration/i, category: "TAX_VAT" },
    { pattern: /company registration certificate/i, category: "CERTIFICATE_OR_LEGAL" },
] as const;

export function splitCompoundDocumentRequirements(
    requirements: ExtractedRequirement[],
) {
    return requirements.flatMap((requirement) => {
        const matchedTerms = DOCUMENT_TERMS.filter(({ pattern }) =>
            pattern.test(requirement.text),
        );

        if (matchedTerms.length < 2) {
            return [requirement];
        }

        return matchedTerms.map(({ pattern, category }) => {
            const term = requirement.text.match(pattern)?.[0] ?? "document";

            return {
                ...requirement,
                category,
                text: `The bidder must provide a valid ${term}.`,
            };
        });
    });
}

export type IntelligenceRequirement = {
    displayId: string;
    category: string;
    text: string;
    obligation: string;
    verification: string;
    pageNumber: number | null;
};

export type IntelligenceReference = {
    id: string;
    title: string;
    issuerName: string;
    sourceType: "PUBLIC_REFERENCE" | "SYNTHETIC_REFERENCE";
    requirements: IntelligenceRequirement[];
};

export type IntelligenceActiveTender = {
    id: string;
    title: string;
    requirements: IntelligenceRequirement[];
};

export type TenderIntelligence = {
    referenceCount: number;
    analyzedReferenceCount: number;
    currentRequirementCount: number;
    benchmarkThemes: Array<{
        category: string;
        referenceTenderCount: number;
        referenceRequirementCount: number;
        currentRequirementCount: number;
    }>;
    prioritySignals: Array<{
        displayId: string;
        category: string;
        text: string;
        matchedReferences: string[];
        rationale: string;
    }>;
    evidenceGaps: Array<{
        displayId: string;
        category: string;
        request: string;
        pageNumber: number | null;
    }>;
    winThemes: string[];
    references: Array<{
        id: string;
        title: string;
        issuerName: string;
        sourceType: IntelligenceReference["sourceType"];
        requirementCount: number;
    }>;
    disclaimer: string;
};

const STOP_WORDS = new Set([
    "about",
    "after",
    "against",
    "also",
    "and",
    "are",
    "from",
    "have",
    "must",
    "shall",
    "that",
    "the",
    "their",
    "this",
    "with",
]);

function tokens(value: string) {
    return new Set(
        value
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .split(/\s+/)
            .filter(
                (token) =>
                    token.length >= 4 && !STOP_WORDS.has(token),
            ),
    );
}

function hasMeaningfulOverlap(left: string, right: string) {
    const leftTokens = tokens(left);
    const rightTokens = tokens(right);
    let overlap = 0;

    for (const token of leftTokens) {
        if (rightTokens.has(token)) {
            overlap += 1;
        }
    }

    return overlap >= 2 || left.toLowerCase() === right.toLowerCase();
}

function requirementMatches(
    current: IntelligenceRequirement,
    reference: IntelligenceRequirement,
) {
    return (
        current.category.toLowerCase() ===
            reference.category.toLowerCase() ||
        hasMeaningfulOverlap(current.text, reference.text)
    );
}

function isEvidenceSensitive(requirement: IntelligenceRequirement) {
    return /experience|qualification|certificate|license|personnel|turnover|financial|similar contract|reference|authorization|registration/i.test(
        `${requirement.category} ${requirement.text}`,
    );
}

export function buildTenderIntelligence(
    activeTender: IntelligenceActiveTender,
    references: IntelligenceReference[],
): TenderIntelligence {
    const analyzedReferences = references.filter(
        (reference) => reference.requirements.length > 0,
    );
    const categoryMap = new Map<
        string,
        { referenceIds: Set<string>; requirementCount: number }
    >();

    for (const reference of analyzedReferences) {
        const categoriesInReference = new Set<string>();

        for (const requirement of reference.requirements) {
            const category = requirement.category.trim() || "Uncategorized";
            const entry = categoryMap.get(category) ?? {
                referenceIds: new Set<string>(),
                requirementCount: 0,
            };

            entry.referenceIds.add(reference.id);
            entry.requirementCount += 1;
            categoryMap.set(category, entry);
            categoriesInReference.add(category);
        }

        for (const category of categoriesInReference) {
            const entry = categoryMap.get(category);

            if (entry) {
                categoryMap.set(category, entry);
            }
        }
    }

    const benchmarkThemes = [...categoryMap.entries()]
        .map(([category, entry]) => ({
            category,
            referenceTenderCount: entry.referenceIds.size,
            referenceRequirementCount: entry.requirementCount,
            currentRequirementCount: activeTender.requirements.filter(
                (requirement) =>
                    requirement.category.toLowerCase() ===
                    category.toLowerCase(),
            ).length,
        }))
        .sort(
            (left, right) =>
                right.referenceTenderCount - left.referenceTenderCount ||
                right.referenceRequirementCount -
                    left.referenceRequirementCount,
        )
        .slice(0, 8);

    const prioritySignals = activeTender.requirements
        .map((requirement) => {
            const matchedReferences = analyzedReferences
                .filter((reference) =>
                    reference.requirements.some((candidate) =>
                        requirementMatches(requirement, candidate),
                    ),
                )
                .map((reference) => reference.title);

            return {
                displayId: requirement.displayId,
                category: requirement.category,
                text: requirement.text,
                matchedReferences,
                rationale:
                    matchedReferences.length > 0
                        ? "This requirement has a related pattern in the uploaded benchmark tenders. Address it visibly and support the response with company evidence."
                        : "This requirement is specific to the active tender and needs a direct, source-grounded response.",
            };
        })
        .filter(
            (signal) =>
                signal.matchedReferences.length > 0 ||
                /MANDATORY|MUST|SHALL|required/i.test(signal.text),
        )
        .slice(0, 12);

    const evidenceGaps = activeTender.requirements
        .filter(isEvidenceSensitive)
        .slice(0, 10)
        .map((requirement) => ({
            displayId: requirement.displayId,
            category: requirement.category,
            request: `Provide verifiable company evidence for: ${requirement.text}`,
            pageNumber: requirement.pageNumber,
        }));

    const topThemes = benchmarkThemes.slice(0, 3).map((theme) =>
        `Make ${theme.category.toLowerCase()} a visible response theme, then connect it to evidence from the bidding company rather than generic claims.`,
    );

    const winThemes = topThemes.length
        ? topThemes
        : [
              "Lead with a tender-specific response structure and make every differentiator traceable to evidence.",
              "Separate confirmed capabilities from information the company still needs to provide.",
          ];

    return {
        referenceCount: references.length,
        analyzedReferenceCount: analyzedReferences.length,
        currentRequirementCount: activeTender.requirements.length,
        benchmarkThemes,
        prioritySignals,
        evidenceGaps,
        winThemes,
        references: references.map((reference) => ({
            id: reference.id,
            title: reference.title,
            issuerName: reference.issuerName,
            sourceType: reference.sourceType,
            requirementCount: reference.requirements.length,
        })),
        disclaimer:
            "Reference tenders are benchmarks only. They do not prove that the bidding company completed or won any project. Verify every company claim against real company evidence before submission.",
    };
}

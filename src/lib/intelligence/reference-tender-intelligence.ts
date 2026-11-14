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

export type ProcurementType = "WORKS" | "GOODS" | "GENERAL";

export type TenderIntelligence = {
    procurementType: ProcurementType;
    referenceCount: number;
    analyzedReferenceCount: number;
    currentRequirementCount: number;
    benchmarkThemes: Array<{
        category: string;
        referenceTenderCount: number;
        referenceRequirementCount: number;
        currentRequirementCount: number;
    }>;
    coverage: Array<{
        displayId: string;
        category: string;
        requirement: string;
        matchedReferenceCount: number;
        matchedReferenceTitles: string[];
        priority: "HIGH" | "MEDIUM" | "STANDARD";
        status: "BENCHMARK_SUPPORTED" | "ACTIVE_TENDER_ONLY";
    }>;
    prioritySignals: Array<{
        displayId: string;
        category: string;
        text: string;
        matchedReferences: string[];
        matchedReferenceCount: number;
        priority: "HIGH" | "MEDIUM" | "STANDARD";
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
        relevanceScore: number;
        matchedRequirementCount: number;
        selected: boolean;
        selectionReason: string;
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

function meaningfulOverlapCount(left: string, right: string) {
    const leftTokens = tokens(left);
    const rightTokens = tokens(right);
    let overlap = 0;

    for (const token of leftTokens) {
        if (rightTokens.has(token)) {
            overlap += 1;
        }
    }

    return overlap;
}

function hasMeaningfulOverlap(left: string, right: string) {
    return (
        meaningfulOverlapCount(left, right) >= 2 ||
        left.toLowerCase() === right.toLowerCase()
    );
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
    const text = `${requirement.category} ${requirement.text}`;
    const evidenceSignal = /experience|qualification|certificate|license|personnel|turnover|financial capacity|similar contract|past performance|project reference|authorization|registration|trade license|tin|vat/i.test(text);
    const bidderAction = /bidder|tenderer|contractor|successful bidder|provide|submit|demonstrate|evidence|proof|must|shall|required/i.test(text);
    const tenderMetadata = /tender reference number|publication date|opening is scheduled|estimated (total )?project budget|evaluation criteria include|submission address|financial proposal in|quoted price must include|sealed envelope|performance security|contact details|clarification requests/i.test(text);

    return evidenceSignal && bidderAction && !tenderMetadata;
}

function evidenceRequest(text: string) {
    if (/experience|similar contract|past performance|project reference/i.test(text)) {
        return "Provide verified project references, completion certificates, or similar past-performance evidence for";
    }

    if (/turnover|financial capacity/i.test(text)) {
        return "Provide audited accounts, bank evidence, or other approved financial evidence for";
    }

    if (/personnel|qualification|cv/i.test(text)) {
        return "Provide CVs, qualifications, and personnel evidence for";
    }

    if (/certificate|license|registration|trade license|tin|vat|authorization/i.test(text)) {
        return "Provide current certificates, licenses, registrations, or authorizations for";
    }

    return "Provide verifiable company evidence for";
}

function isMandatory(requirement: IntelligenceRequirement) {
    return (
        requirement.obligation.toUpperCase() === "MANDATORY" ||
        /\b(?:must|shall|required|mandatory|compulsory)\b/i.test(
            requirement.text,
        )
    );
}

function inferProcurementType(activeTender: IntelligenceActiveTender) {
    const text = [
        activeTender.title,
        ...activeTender.requirements.flatMap((requirement) => [
            requirement.category,
            requirement.text,
        ]),
    ]
        .join(" ")
        .toLowerCase();

    const worksSignals = [
        "construction",
        "civil works",
        "contractor",
        "site work",
        "completion date",
        "bill of quantities",
        "work programme",
        "health and safety",
    ].filter((signal) => text.includes(signal)).length;

    const goodsSignals = [
        "goods",
        "supplier",
        "manufacturer",
        "product",
        "delivery schedule",
        "warranty",
        "spare parts",
        "manufacturer authorization",
    ].filter((signal) => text.includes(signal)).length;

    if (worksSignals > goodsSignals && worksSignals > 0) {
        return "WORKS" as const;
    }

    if (goodsSignals > worksSignals && goodsSignals > 0) {
        return "GOODS" as const;
    }

    return "GENERAL" as const;
}

function scoreReference(
    activeRequirements: IntelligenceRequirement[],
    reference: IntelligenceReference,
) {
    const activeCategories = new Set(
        activeRequirements.map((requirement) =>
            requirement.category.trim().toLowerCase(),
        ),
    );
    const referenceCategories = new Set(
        reference.requirements.map((requirement) =>
            requirement.category.trim().toLowerCase(),
        ),
    );
    const categoryOverlap = [...activeCategories].filter((category) =>
        referenceCategories.has(category),
    ).length;
    const matchedRequirementCount = activeRequirements.filter((current) =>
        reference.requirements.some((candidate) =>
            requirementMatches(current, candidate),
        ),
    ).length;
    const mandatoryRequirements = activeRequirements.filter(isMandatory);
    const mandatoryMatchCount = mandatoryRequirements.filter((current) =>
        reference.requirements.some((candidate) =>
            requirementMatches(current, candidate),
        ),
    ).length;

    return {
        relevanceScore: Math.round(
            (activeCategories.size
                ? (categoryOverlap / activeCategories.size) * 35
                : 0) +
                (activeRequirements.length
                    ? (matchedRequirementCount / activeRequirements.length) * 45
                    : 0) +
                (mandatoryRequirements.length
                    ? (mandatoryMatchCount / mandatoryRequirements.length) * 20
                    : 0),
        ),
        matchedRequirementCount,
    };
}

export function buildTenderIntelligence(
    activeTender: IntelligenceActiveTender,
    references: IntelligenceReference[],
): TenderIntelligence {
    const rankedReferences = references
        .filter((reference) => reference.requirements.length > 0)
        .map((reference) => ({
            reference,
            ...scoreReference(activeTender.requirements, reference),
        }))
        .sort(
            (left, right) =>
                right.relevanceScore - left.relevanceScore ||
                right.matchedRequirementCount -
                    left.matchedRequirementCount,
        );

    const selectedReferences = rankedReferences.filter(
        (item) => item.relevanceScore >= 20 || item.matchedRequirementCount > 0,
    );
    const analyzedReferences =
        selectedReferences.length > 0
            ? selectedReferences.slice(0, 5)
            : rankedReferences.slice(0, 3);

    const categoryMap = new Map<
        string,
        { referenceIds: Set<string>; requirementCount: number }
    >();

    for (const { reference } of analyzedReferences) {
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

    const coverage = activeTender.requirements
        .map((requirement) => {
            const matchedReferenceTitles = analyzedReferences
                .filter((reference) =>
                    reference.reference.requirements.some((candidate) =>
                        requirementMatches(requirement, candidate),
                    ),
                )
                .map((reference) => reference.reference.title);
            const priority = isMandatory(requirement)
                ? ("HIGH" as const)
                : matchedReferenceTitles.length > 0
                    ? ("MEDIUM" as const)
                    : ("STANDARD" as const);

            return {
                displayId: requirement.displayId,
                category: requirement.category,
                requirement: requirement.text,
                matchedReferenceCount: matchedReferenceTitles.length,
                matchedReferenceTitles,
                priority,
                status:
                    matchedReferenceTitles.length > 0
                        ? ("BENCHMARK_SUPPORTED" as const)
                        : ("ACTIVE_TENDER_ONLY" as const),
            };
        })
        .sort(
            (left, right) =>
                ({ HIGH: 0, MEDIUM: 1, STANDARD: 2 }[left.priority] -
                    { HIGH: 0, MEDIUM: 1, STANDARD: 2 }[right.priority]) ||
                right.matchedReferenceCount - left.matchedReferenceCount,
        );

    const prioritySignals = coverage
        .filter((signal) => signal.priority !== "STANDARD")
        .slice(0, 12)
        .map((signal) => ({
            displayId: signal.displayId,
            category: signal.category,
            text: signal.requirement,
            matchedReferences: signal.matchedReferenceTitles,
            matchedReferenceCount: signal.matchedReferenceCount,
            priority: signal.priority,
            rationale:
                signal.status === "BENCHMARK_SUPPORTED"
                    ? "This requirement has a related pattern in the selected reference tenders. Address it visibly and support the response with verified company evidence."
                    : "This requirement is specific to the active tender and needs a direct, source-grounded response.",
        }));

    const evidenceGaps = activeTender.requirements
        .filter(isEvidenceSensitive)
        .slice(0, 10)
        .map((requirement) => ({
            displayId: requirement.displayId,
            category: requirement.category,
            request: `${evidenceRequest(requirement.text)}: ${requirement.text}`,
            pageNumber: requirement.pageNumber,
        }));

    const topThemes = benchmarkThemes.slice(0, 3).map(
        (theme) =>
            `Make ${theme.category.toLowerCase()} a visible response theme and connect it to verified company evidence rather than generic claims.`,
    );

    const winThemes = topThemes.length
        ? topThemes
        : [
              "Lead with a tender-specific response structure and make every differentiator traceable to evidence.",
              "Separate confirmed capabilities from information the company still needs to provide.",
          ];

    return {
        procurementType: inferProcurementType(activeTender),
        referenceCount: references.length,
        analyzedReferenceCount: analyzedReferences.length,
        currentRequirementCount: activeTender.requirements.length,
        benchmarkThemes,
        coverage,
        prioritySignals,
        evidenceGaps,
        winThemes,
        references: rankedReferences.map(
            ({ reference, relevanceScore, matchedRequirementCount }) => ({
                id: reference.id,
                title: reference.title,
                issuerName: reference.issuerName,
                sourceType: reference.sourceType,
                requirementCount: reference.requirements.length,
                relevanceScore,
                matchedRequirementCount,
                selected: analyzedReferences.some(
                    (item) => item.reference.id === reference.id,
                ),
                selectionReason:
                    matchedRequirementCount > 0
                        ? `${matchedRequirementCount} active requirement(s) have related patterns.`
                        : "No strong requirement overlap was detected.",
            }),
        ),
        disclaimer:
            "Reference tenders are benchmarks only. They do not prove that the bidding company completed or won any project. Verify every company claim against real company evidence before submission.",
    };
}

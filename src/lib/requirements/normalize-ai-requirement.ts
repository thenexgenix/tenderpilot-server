import type { ExtractedRequirement } from "@/lib/ai/schemas";

const KNOWN_CATEGORIES = new Set([
    "DEADLINE",
    "SUBMISSION_METHOD",
    "ELIGIBILITY",
    "CERTIFICATE_OR_LEGAL",
    "TAX_VAT",
    "TECHNICAL_SPEC",
    "SCOPE_OF_WORK",
    "DELIVERY_TIMELINE",
    "FORM_OR_DECLARATION",
    "FINANCIAL",
    "BID_SECURITY",
    "EVALUATION_CRITERIA",
    "VALIDITY_PERIOD",
    "DISQUALIFICATION",
    "CONTACT",
    "OTHER",
]);

function normalized(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function canonicalCategory(value: string) {
    const category = value
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    return KNOWN_CATEGORIES.has(category) ? category : value.trim();
}

export function normalizeRequirementCategory(
    category: string,
    text: string,
) {
    const source = normalized(text);
    const existing = canonicalCategory(category);

    if (
        /(?:^|\b)(?:\d+[.)]\s*)?(?:conducting|drilling|installing|constructing|providing|completing)\b/i.test(
            source,
        ) &&
        /site|well|solar|pump|tank|filter|pipeline|water quality|training|testing|commissioning|installation|construction/i.test(
            source,
        )
    ) {
        return "SCOPE_OF_WORK";
    }

    if (
        /evaluation criteria|technical compliance|financial proposal \(\d+%\)|financial capacity \d+%|implementation plan \d+%|relevant project experience \d+%|equipment quality and warranty \d+%/i.test(
            source,
        )
    ) {
        return "EVALUATION_CRITERIA";
    }

    if (/annual turnover|financial capacity|financially capable|financial qualification/i.test(source)) {
        return "ELIGIBILITY";
    }

    if (
        /financial proposal|quoted price|bangladeshi taka|\bBDT\b|project budget/i.test(
            source,
        )
    ) {
        return "FINANCIAL";
    }

    if (/performance security|bid security|tender security|bid bond/i.test(source)) {
        return "BID_SECURITY";
    }

    if (/trade license|tin registration|vat registration|tax registration|tax clearance/i.test(source)) {
        return "TAX_VAT";
    }

    if (/minimum \d+ years|at least \d+ similar|similar completed|relevant experience|annual turnover|financial capacity|eligible bidder|eligibility|technical personnel|adequate technical personnel/i.test(source)) {
        return "ELIGIBILITY";
    }

    if (/solar panel|photovoltaic|water pump|storage tank|technical specification|minimum pump|minimum storage|panel efficiency|testing and commissioning|warranty/i.test(source)) {
        return "TECHNICAL_SPEC";
    }

    if (
        /project duration|calendar days|implementation schedule|work programme|completion within|delivery schedule|payment schedule|milestone|completion of .* \d+%|delivery of .* \d+%|final handover .* \d+%/i.test(
            source,
        )
    ) {
        return "DELIVERY_TIMELINE";
    }

    if (/site assessment|drilling|groundwater extraction|construction|installation|contractor is responsible|scope of work/i.test(source)) {
        return "SCOPE_OF_WORK";
    }

    if (/sealed envelope|submission address|outer envelope/i.test(source)) {
        return "SUBMISSION_METHOD";
    }

    if (/submission deadline|clarification deadline|deadline|due date/i.test(source)) {
        return "DEADLINE";
    }

    if (/quoted price|financial proposal|project budget|estimated .* budget|in \(bdt\)|in bangladeshi taka|price must include/i.test(source)) {
        return "FINANCIAL";
    }

    if (/contact details|email|telephone|phone number|contact person/i.test(source)) {
        return "CONTACT";
    }

    return existing;
}

function isInformationalFact(text: string) {
    return /tender reference number|date of publication|opening is scheduled|tender opening|estimated (total )?project budget|evaluation criteria include|submission address|contact details|project title|procurement method|payments are scheduled/i.test(text);
}

function hasDirectObligation(text: string) {
    return /\b(?:must|shall|required|compulsory|mandatory|responsible for|will be rejected|will result in disqualification|must comply|prior to signing|before commencing|before signing)\b/i.test(text);
}

export function inferRequirementObligation(
    requirement: ExtractedRequirement,
) {
    if (requirement.obligation !== "UNCLEAR") {
        return requirement.obligation;
    }

    const text = requirement.text;
    const category = normalizeRequirementCategory(
        requirement.category,
        text,
    );

    if (isInformationalFact(text)) {
        return "UNCLEAR" as const;
    }

    if (hasDirectObligation(text)) {
        return "MANDATORY" as const;
    }

    if (
        [
            "ELIGIBILITY",
            "CERTIFICATE_OR_LEGAL",
            "TAX_VAT",
            "TECHNICAL_SPEC",
            "BID_SECURITY",
        ].includes(category) &&
        /\bminimum\b|\bat least\b|\bvalid\b|\bcomplete\b/i.test(text)
    ) {
        return "MANDATORY" as const;
    }

    if (
        category === "DEADLINE" &&
        /submission|clarification|bid|tender/i.test(text)
    ) {
        return "MANDATORY" as const;
    }

    if (
        category === "DELIVERY_TIMELINE" &&
        /project duration|must be completed|completion within|within \d+/i.test(text)
    ) {
        return "MANDATORY" as const;
    }

    if (
        category === "DISQUALIFICATION" &&
        /rejected|disqualif|conditional|incomplete|influence|prohibited/i.test(text)
    ) {
        return "MANDATORY" as const;
    }

    return "UNCLEAR" as const;
}

export function normalizeExtractedRequirement(
    requirement: ExtractedRequirement,
): ExtractedRequirement {
    return {
        ...requirement,
        category: normalizeRequirementCategory(
            requirement.category,
            requirement.text,
        ),
        obligation: inferRequirementObligation(requirement),
    };
}

export function requirementDeduplicationKey(
    requirement: ExtractedRequirement,
) {
    const source = normalized(requirement.text);
    const semanticKey = [
        [/(?:years?|months?) of experience|relevant experience/i, "experience"],
        [/(?:similar|completed) projects?/i, "similar_projects"],
        [/annual turnover|financial capacity/i, "annual_turnover"],
        [/trade license/i, "trade_license"],
        [/\btin\b/i, "tin"],
        [/vat registration/i, "vat_registration"],
        [/solar panels?.*(?:capacity|power)|(?:capacity|power).*solar panels?/i, "solar_capacity"],
        [/pump.*capacity|capacity.*pump/i, "pump_capacity"],
        [/storage tank.*capacity|capacity.*storage tank/i, "storage_tank_capacity"],
        [/panel.*efficiency|efficiency.*panel/i, "solar_efficiency"],
        [/(?:pipeline|pipe).*(?:diameter|mm)|(?:diameter|mm).*(?:pipeline|pipe)/i, "pipeline_diameter"],
        [/service life.*(?:solar|panel)|(?:solar|panel).*service life/i, "solar_service_life"],
        [/implementation schedule/i, "implementation_schedule"],
        [/preliminary site assessment/i, "site_assessment"],
        [/groundwater extraction well|drilling .*well/i, "well_installation"],
        [/solar photovoltaic panel|solar panel.*install/i, "solar_installation"],
        [/solar-powered water pump|water pump.*install/i, "pump_installation"],
        [/water storage tank|storage tank.*construct/i, "storage_tank"],
        [/water filtration|purification system/i, "water_filtration"],
        [/distribution pipeline|pipeline.*construct/i, "distribution_pipeline"],
        [/water quality test/i, "water_quality_testing"],
        [/operational training|maintenance personnel/i, "operational_training"],
        [/testing and commissioning/i, "testing_commissioning"],
        [/labor,? environmental,? and safety|public procurement act/i, "regulatory_compliance"],
        [/formal agreement.*commenc/i, "formal_agreement"],
    ] as const;

    const matchedSemanticKey = semanticKey.find(([pattern]) =>
        pattern.test(source),
    )?.[1];

    if (matchedSemanticKey) {
        return `${requirement.category}:${matchedSemanticKey}`;
    }

    const text = normalized(requirement.text)
        .replace(/\b(?:the|a|an|tender|total|estimated|is|are|scheduled|for|of)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return `${requirement.category}:${text}`;
}

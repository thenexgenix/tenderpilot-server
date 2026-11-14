import type { AnalysisPage } from "@/lib/ai/chunk-pages";
import type { ExtractedRequirement } from "@/lib/ai/schemas";

const OBLIGATION_SIGNAL = /\b(?:must|shall|required|compulsory|mandatory|responsible for|submit|provide|possess|demonstrate|complete|comply|eligible|valid|minimum|maximum|at least|not less than|within|before|no later than|deadline|clarification|will be rejected|disqualified)\b/i;
const SPECIFICATION_SIGNAL = /(?:\b\d+(?:[.,]\d+)?\s*(?:%|kw|mw|w|mm|cm|m|kg|litres?|l|days?|months?|years?|hours?)\b|\b(?:capacity|diameter|efficiency|service life|warranty|turnover|experience|projects?)\b)/i;
const METADATA_SIGNAL = /^(?:page \d+|component|minimum specification|details|total|estimated (?:total )?project budget|date of publication|tender opening|contact information|issued by)/i;
const SECTION_HEADING = /^(?:\d+[.)]?\s*)?(?:technical specifications?|equipment specifications?|eligibility|qualification requirements?|required documents?|submission instructions?|implementation schedule|work programme|delivery schedule|evaluation criteria)\b/i;

function sectionForLine(line: string, current: string) {
    if (/technical specifications?|equipment specifications?/i.test(line)) {
        return "TECHNICAL_SPEC";
    }

    if (/eligibility|qualification requirements?/i.test(line)) {
        return "ELIGIBILITY";
    }

    if (/required documents?|submission instructions?/i.test(line)) {
        return "SUBMISSION_METHOD";
    }

    if (/implementation schedule|work programme|delivery schedule/i.test(line)) {
        return "DELIVERY_TIMELINE";
    }

    if (/evaluation criteria/i.test(line)) {
        return "EVALUATION_CRITERIA";
    }

    if (/contact information|contact details/i.test(line)) {
        return "CONTACT";
    }

    if (/scope of work/i.test(line)) {
        return "SCOPE_OF_WORK";
    }

    return current;
}

function categoryForRequirement(text: string, section: string) {
    if (/license|certificate|registration|tax|tin|vat/i.test(text)) {
        return /tax|tin|vat/i.test(text) ? "TAX_VAT" : "CERTIFICATE_OR_LEGAL";
    }

    if (/experience|qualification|turnover|eligible|similar project|blacklist/i.test(text)) {
        return "ELIGIBILITY";
    }

    if (/deadline|no later than|before the specified deadline/i.test(text)) {
        return "DEADLINE";
    }

    if (/contact person|address:|email:|telephone:|phone:/i.test(text)) {
        return "CONTACT";
    }

    if (/warranty|capacity|diameter|efficiency|service life|equipment|technical|specification|solar|pump|tank|pipeline|filter/i.test(text)) {
        return "TECHNICAL_SPEC";
    }

    return section || "OTHER";
}

function isCandidateLine(line: string, section: string) {
    const text = line.trim();

    if (
        text.length < 12 ||
        text.length > 500 ||
        METADATA_SIGNAL.test(text) ||
        SECTION_HEADING.test(text) ||
        /^(?:the )?(?:project|tender) (?:will|is|has) /i.test(text)
    ) {
        return false;
    }

    const hasObligation = OBLIGATION_SIGNAL.test(text);
    const hasSpecification = SPECIFICATION_SIGNAL.test(text);
    const isListItem = /^(?:\d+[.)]|[•*-])\s*/.test(text);
    const isContactLine =
        section === "CONTACT" &&
        /contact person|address:|email:|telephone:|phone:/i.test(text);

    return (
        hasObligation ||
        (section === "TECHNICAL_SPEC" && hasSpecification) ||
        (Boolean(section) && isListItem) ||
        isContactLine
    );
}

function splitLegalDocuments(line: string) {
    const matches = line.match(
        /(?:valid |current )?(?:trade license|TIN certificate|VAT registration|tax registration|company registration certificate|business license)/gi,
    );

    return matches && matches.length > 1 ? matches : [line];
}

export function extractDeterministicRequirements(
    pages: AnalysisPage[],
) {
    const recovered: ExtractedRequirement[] = [];

    for (const page of pages) {
        let section = "";

        for (const rawLine of page.text.split(/\r?\n/)) {
            const line = rawLine.trim();
            section = sectionForLine(line, section);

            if (!isCandidateLine(line, section)) {
                continue;
            }

            for (const candidate of splitLegalDocuments(line)) {
                recovered.push({
                    category: categoryForRequirement(candidate, section),
                    text: candidate,
                    obligation:
                        section === "TECHNICAL_SPEC" ||
                        section === "ELIGIBILITY" ||
                        section === "SUBMISSION_METHOD" ||
                        section === "DELIVERY_TIMELINE" ||
                        section === "SCOPE_OF_WORK"
                            ? "MANDATORY"
                            : "UNCLEAR",
                    page_number: page.pageNumber,
                    quote: candidate,
                });
            }
        }
    }

    return recovered;
}

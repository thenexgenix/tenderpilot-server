import { describe, expect, it } from "vitest";
import {
    inferRequirementObligation,
    normalizeExtractedRequirement,
    requirementDeduplicationKey,
} from "./normalize-ai-requirement";

function requirement(
    text: string,
    category = "OTHER",
    obligation: "MANDATORY" | "OPTIONAL" | "UNCLEAR" = "UNCLEAR",
) {
    return {
        category,
        text,
        obligation,
        page_number: 1,
        quote: text,
    };
}

describe("normalize extracted requirements", () => {
    it("classifies direct bidder obligations as mandatory", () => {
        expect(
            inferRequirementObligation(
                requirement(
                    "The contractor is responsible for drilling and installing groundwater extraction wells.",
                ),
            ),
        ).toBe("MANDATORY");
    });

    it("keeps tender metadata informational", () => {
        expect(
            inferRequirementObligation(
                requirement(
                    "The estimated project budget is BDT 1,80,00,000.",
                    "FINANCIAL",
                ),
            ),
        ).toBe("UNCLEAR");
    });

    it("repairs categories and deduplicates repeated facts", () => {
        const first = normalizeExtractedRequirement(
            requirement(
                "The estimated project budget is BDT 1,80,00,000.",
                "OTHER",
            ),
        );
        const second = normalizeExtractedRequirement(
            requirement(
                "The estimated total project budget is BDT 1,80,00,000.",
                "FINANCIAL",
            ),
        );

        expect(first.category).toBe("FINANCIAL");
        expect(requirementDeduplicationKey(first)).toBe(
            requirementDeduplicationKey(second),
        );
    });
});

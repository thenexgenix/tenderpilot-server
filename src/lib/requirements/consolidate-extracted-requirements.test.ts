import { describe, expect, it } from "vitest";
import { consolidateExtractedRequirements } from "./consolidate-extracted-requirements";

function requirement(text: string, page = 2) {
    return {
        category: "OTHER",
        text,
        obligation: "MANDATORY" as const,
        page_number: page,
        quote: text,
    };
}

describe("consolidateExtractedRequirements", () => {
    it("expands wrapped lines and removes list-introducing headings", () => {
        const result = consolidateExtractedRequirements(
            [
                requirement("eligible and experienced contractors for the construction, installation, testing, and commissioning of solar-powered"),
                requirement("The selected contractor shall be responsible for the following:"),
                requirement("Each tender submission must include:"),
                requirement("Interested bidders must satisfy all of the following requirements:"),
                requirement("1."),
            ],
            [
                {
                    pageNumber: 2,
                    text: [
                        "The Department invites sealed tenders from",
                        "eligible and experienced contractors for the construction, installation, testing, and commissioning of solar-powered",
                        "community water supply systems.",
                        "The selected contractor shall be responsible for the following:",
                    ].join("\n"),
                },
            ],
        );

        expect(result).toHaveLength(1);
        expect(result[0].text).toContain("The Department invites sealed tenders");
        expect(result[0].text).toContain("community water supply systems.");
    });

    it("merges dependent warranty sentences but keeps separate technical rows", () => {
        const result = consolidateExtractedRequirements(
            [
                requirement("Minimum warranty covering equipment and workmanship.", 3),
                requirement("Defects identified during the warranty period must be repaired or replaced without additional cost.", 3),
                requirement("Solar Panels 8 kW photovoltaic capacity per installation", 3),
                requirement("Pump Capacity Minimum 12,000 litres per day", 3),
            ],
            [
                {
                    pageNumber: 3,
                    text: [
                        "The contractor must provide a minimum warranty covering equipment and workmanship.",
                        "Defects identified during the warranty period must be repaired or replaced without additional cost.",
                        "Solar Panels 8 kW photovoltaic capacity per installation",
                        "Pump Capacity Minimum 12,000 litres per day",
                    ].join("\n"),
                },
            ],
        );

        expect(result).toHaveLength(3);
        expect(result[0].text).toMatch(/warranty.*Defects/i);
        expect(result[1].text).toContain("Solar Panels");
        expect(result[2].text).toContain("Pump Capacity");
    });
});

import { describe, expect, it } from "vitest";
import { extractDeterministicRequirements } from "./deterministic-requirements";

describe("extractDeterministicRequirements", () => {
    it("captures high-value eligibility and technical table requirements", () => {
        const requirements = extractDeterministicRequirements([
            {
                pageNumber: 3,
                text: [
                    "Have at least 3 years of experience in infrastructure projects.",
                    "Have successfully completed at least 4 similar projects.",
                    "Demonstrate a minimum annual turnover over the last 3 financial years.",
                    "Possess a valid trade license. Have a valid TIN certificate and VAT registration.",
                    "7. Technical Specifications",
                    "Solar Panels 8 kW photovoltaic capacity per installation",
                    "Pump Capacity Minimum 12,000 litres per day",
                    "Storage Tank Minimum 12,000 litres capacity",
                    "Pipeline HDPE pipes, minimum 75 mm diameter",
                    "Solar Panel Efficiency Minimum 22%",
                    "Expected Service Life Minimum 20 years for solar panels",
                ].join("\n"),
            },
        ]);

        expect(requirements).toHaveLength(12);
        expect(requirements.map((item) => item.category)).toEqual(
            expect.arrayContaining(["ELIGIBILITY", "TAX_VAT", "TECHNICAL_SPEC"]),
        );
        expect(requirements.map((item) => item.text)).toEqual(
            expect.arrayContaining([
                expect.stringContaining("8 kW"),
                expect.stringContaining("75 mm"),
                expect.stringContaining("20 years"),
            ]),
        );
        expect(requirements.every((item) => item.quote.length >= 10)).toBe(true);
    });
});

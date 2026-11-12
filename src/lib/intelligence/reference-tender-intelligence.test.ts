import { describe, expect, it } from "vitest";
import {
    buildTenderIntelligence,
    type IntelligenceActiveTender,
    type IntelligenceReference,
} from "./reference-tender-intelligence";

const activeTender: IntelligenceActiveTender = {
    id: "active",
    title: "Current network tender",
    requirements: [
        {
            displayId: "R-01",
            category: "Technical",
            text: "The bidder must provide network switches and installation support.",
            obligation: "MANDATORY",
            verification: "VERIFIED",
            pageNumber: 2,
        },
        {
            displayId: "R-02",
            category: "Experience",
            text: "The bidder must provide evidence of two similar completed contracts.",
            obligation: "MANDATORY",
            verification: "VERIFIED",
            pageNumber: 4,
        },
    ],
};

const references: IntelligenceReference[] = [
    {
        id: "public",
        title: "Public tender",
        issuerName: "Public issuer",
        sourceType: "PUBLIC_REFERENCE",
        requirements: [
            {
                displayId: "P-01",
                category: "Technical",
                text: "The supplier must provide network equipment and installation support.",
                obligation: "MANDATORY",
                verification: "VERIFIED",
                pageNumber: 1,
            },
        ],
    },
    {
        id: "synthetic",
        title: "Synthetic tender",
        issuerName: "Test issuer",
        sourceType: "SYNTHETIC_REFERENCE",
        requirements: [
            {
                displayId: "S-01",
                category: "Experience",
                text: "Similar completed contracts and past performance evidence are required.",
                obligation: "MANDATORY",
                verification: "VERIFIED",
                pageNumber: 3,
            },
        ],
    },
];

describe("buildTenderIntelligence", () => {
    it("summarizes benchmark themes and matches active requirements", () => {
        const result = buildTenderIntelligence(activeTender, references);

        expect(result.referenceCount).toBe(2);
        expect(result.analyzedReferenceCount).toBe(2);
        expect(result.benchmarkThemes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    category: "Technical",
                    referenceTenderCount: 1,
                }),
            ]),
        );
        expect(result.prioritySignals).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    displayId: "R-01",
                    matchedReferences: ["Public tender"],
                }),
            ]),
        );
        expect(result.evidenceGaps).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ displayId: "R-02" }),
            ]),
        );
        expect(result.disclaimer).toMatch(/do not prove/i);
    });

    it("returns a safe fallback strategy without references", () => {
        const result = buildTenderIntelligence(activeTender, []);

        expect(result.referenceCount).toBe(0);
        expect(result.benchmarkThemes).toHaveLength(0);
        expect(result.winThemes.length).toBeGreaterThan(0);
        expect(result.evidenceGaps).toHaveLength(1);
    });
});

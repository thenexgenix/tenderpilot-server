import {
    describe,
    expect,
    it,
} from "vitest";
import {
    normalizeForVerification,
    verifyRequirementQuote,
} from "./verify-quote";

describe("normalizeForVerification", () => {
    it("normalizes whitespace and Bangla digits", () => {
        expect(
            normalizeForVerification(
                "সময়   ৩০   দিন",
            ),
        ).toBe("সময় 30 দিন");
    });
});

describe("verifyRequirementQuote", () => {
    const pages = [
        {
            pageNumber: 1,
            text:
                "The bidder shall submit a signed offer before 30 November 2026.",
        },
        {
            pageNumber: 2,
            text:
                "The offer must remain valid for 90 days.",
        },
    ];

    it("verifies a real quote on its cited page", () => {
        const result = verifyRequirementQuote(
            {
                pageNumber: 1,
                quote:
                    "The bidder shall submit a signed offer before 30 November 2026.",
            },
            pages,
        );

        expect(result).toEqual({
            verification: "VERIFIED",
            pageNumber: 1,
            matchedPageNumber: 1,
        });
    });

    it("marks a fake quote as unverified", () => {
        const result = verifyRequirementQuote(
            {
                pageNumber: 1,
                quote:
                    "The bidder must provide a performance guarantee.",
            },
            pages,
        );

        expect(result.verification).toBe("UNVERIFIED");
        expect(result.matchedPageNumber).toBeNull();
    });

    it("corrects a wrong cited page", () => {
        const result = verifyRequirementQuote(
            {
                pageNumber: 1,
                quote:
                    "The offer must remain valid for 90 days.",
            },
            pages,
        );

        expect(result).toEqual({
            verification: "VERIFIED",
            pageNumber: 2,
            matchedPageNumber: 2,
        });
    });

    it("verifies Bangla and Latin digit equivalents", () => {
        const result = verifyRequirementQuote(
            {
                pageNumber: 3,
                quote: "সময় 30 দিন",
            },
            [
                {
                    pageNumber: 3,
                    text: "প্রস্তাবের মেয়াদ সময় ৩০ দিন",
                },
            ],
        );

        expect(result.verification).toBe("VERIFIED");
        expect(result.pageNumber).toBe(3);
    });

    it("marks a missing quote as unverified", () => {
        const result = verifyRequirementQuote(
            {
                pageNumber: null,
                quote: null,
            },
            pages,
        );

        expect(result.verification).toBe("UNVERIFIED");
    });
});
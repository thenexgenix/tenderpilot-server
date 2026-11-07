import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import {
    AiProviderError,
    type AiProvider,
    type GenerateJsonRequest,
} from "./provider";
import { generateTenderDraft } from "./generate-draft";

const input = {
    tender: {
        title: "Network Upgrade Tender",
        issuerName: "Sample Issuer",
        reference: "TP-001",
        deadlineAt: new Date("2026-11-30T00:00:00.000Z"),
        notes: null,
    },
    requirements: [
        {
            displayId: "REQ-001",
            category: "TECHNICAL_SPEC",
            text: "Submit a network upgrade approach.",
            obligation: "MANDATORY",
            pageNumber: 1,
            quote: "The bidder shall submit a network upgrade approach.",
            verification: "VERIFIED",
            checkStatus: "CONFIRMED",
            checkNote: null,
        },
    ],
};

function createFakeProvider(
    response: unknown,
): AiProvider {
    return {
        async generateJson<T>(
            request: GenerateJsonRequest<T>,
        ): Promise<T> {
            return request.schema.parse(response);
        },
    };
}

const validSections = [
    {
        key: "executive_summary",
        content:
            "We guarantee a 99% compliant delivery approach.",
    },
    {
        key: "understanding",
        content:
            "The tender requires a network upgrade approach.",
    },
    {
        key: "technical_approach",
        content:
            "The bidder should provide a detailed implementation plan.",
    },
    {
        key: "compliance_response",
        content:
            "[COMPANY TO PROVIDE INFORMATION: describe relevant company capability]",
    },
    {
        key: "company_information",
        content:
            "[COMPANY TO PROVIDE INFORMATION: provide company profile]",
    },
];

describe("generateTenderDraft", () => {
    it("returns exactly five sections", async () => {
        const result = await generateTenderDraft(
            input,
            createFakeProvider({
                sections: validSections,
            }),
        );

        expect(result.sections).toHaveLength(5);
        expect(result.sections.map((item) => item.key)).toEqual([
            "executive_summary",
            "understanding",
            "technical_approach",
            "compliance_response",
            "company_information",
        ]);
    });

    it("removes forbidden phrases and flags unsupported numbers", async () => {
        const result = await generateTenderDraft(
            input,
            createFakeProvider({
                sections: validSections,
            }),
        );

        expect(result.sections[0].content).not.toMatch(
            /compliant|guarantee/i,
        );

        expect(result.warnings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    kind: "FORBIDDEN_PHRASE",
                    sectionKey: "executive_summary",
                }),
                expect.objectContaining({
                    kind: "UNSUPPORTED_NUMBER",
                    sectionKey: "executive_summary",
                }),
            ]),
        );
    });

    it("preserves company-information placeholders", async () => {
        const result = await generateTenderDraft(
            input,
            createFakeProvider({
                sections: validSections,
            }),
        );

        expect(result.sections[4].content).toContain(
            "[COMPANY TO PROVIDE INFORMATION:",
        );
    });

    it("propagates provider failures safely", async () => {
        const failingProvider: AiProvider = {
            async generateJson() {
                throw new AiProviderError(
                    "TIMEOUT",
                    "The provider timed out.",
                );
            },
        };

        await expect(
            generateTenderDraft(input, failingProvider),
        ).rejects.toThrow("The provider timed out.");
    });
});
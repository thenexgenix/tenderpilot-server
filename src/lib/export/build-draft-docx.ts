import {
    AlignmentType,
    Document,
    Footer,
    HeadingLevel,
    PageNumber,
    Paragraph,
    Packer,
    TextRun,
} from "docx";

const PLACEHOLDER_PATTERN =
    /\[COMPANY TO PROVIDE INFORMATION:[^\]]+\]/gi;

const COLORS = {
    body: "1F2937",
    heading: "17365D",
    muted: "6B7280",
    warning: "7C2D12",
};

export type DraftExportInput = {
    tender: {
        title: string;
        issuerName: string;
        reference: string | null;
    };
    sections: Array<{
        title: string;
        position: number;
        content: string;
    }>;
    strategy?: {
        referenceCount: number;
        analyzedReferenceCount: number;
        benchmarkThemes: Array<{
            category: string;
            referenceTenderCount: number;
            currentRequirementCount: number;
        }>;
        winThemes: string[];
        evidenceGaps: Array<{
            displayId: string;
            category: string;
            request: string;
            pageNumber: number | null;
        }>;
        references: Array<{
            title: string;
            issuerName: string;
            sourceType: "PUBLIC_REFERENCE" | "SYNTHETIC_REFERENCE";
        }>;
        disclaimer: string;
    };
};

function contentParagraphs(content: string) {
    return content.split(/\r?\n/).map((line) => {
        const parts = line.split(PLACEHOLDER_PATTERN);
        const placeholders =
            line.match(PLACEHOLDER_PATTERN) ?? [];

        const children: TextRun[] = [];

        parts.forEach((part, index) => {
            if (part) {
                children.push(new TextRun(part));
            }

            if (placeholders[index]) {
                children.push(
                    new TextRun({
                        text: placeholders[index],
                        bold: true,
                        color: COLORS.warning,
                        highlight: "yellow",
                    }),
                );
            }
        });

        return new Paragraph({
            children,
            
            spacing: {
                line: 240,
                after: 140,
            },
        });
    });
}

function metadataParagraph(
    label: string,
    value: string,
) {
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
            after: 100,
        },
        children: [
            new TextRun({
                text: `${label}: `,
                bold: true,
                color: COLORS.heading,
            }),
            new TextRun({
                text: value,
                color: COLORS.body,
            }),
        ],
    });
}

function bulletParagraph(text: string) {
    return new Paragraph({
        text,
        bullet: { level: 0 },
        spacing: {
            line: 260,
            after: 140,
        },
    });
}

function strategyHeading(text: string) {
    return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: {
            before: 260,
            after: 140,
        },
        keepNext: true,
    });
}

export async function buildDraftDocx(
    input: DraftExportInput,
) {
    const footer = new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({
                        text: "Tender Proposal Response  |  Page ",
                        font: "Arial",
                        size: 18,
                        color: COLORS.muted,
                    }),
                    new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: COLORS.muted }),
                ],
            }),
        ],
    });

    const children: Paragraph[] = [
        new Paragraph({
            text: "Tender Proposal Response",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 2400,
                after: 360,
            },
        }),

        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
                after: 500,
            },
            children: [
                new TextRun({
                    text: input.tender.title,
                    bold: true,
                    color: COLORS.heading,
                    size: 28,
                }),
            ],
        }),

        metadataParagraph("Issuer", input.tender.issuerName),
        metadataParagraph(
            "Reference",
            input.tender.reference ?? "Not provided",
        ),

        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
                before: 700,
                after: 360,
            },
            children: [
                new TextRun({
                    text:
                        "AI-assisted draft — must be reviewed by a person against the original tender.",
                    italics: true,
                    color: COLORS.warning,
                }),
            ],
        }),
    ];

    if (input.strategy) {
        children.push(
            new Paragraph({
                text: "Bid Intelligence & Win Strategy",
                heading: HeadingLevel.HEADING_1,
                pageBreakBefore: true,
                keepNext: true,
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Benchmark review based on ${input.strategy.analyzedReferenceCount} analyzed reference tender(s) out of ${input.strategy.referenceCount} uploaded benchmark source(s).`,
                        italics: true,
                        color: COLORS.muted,
                    }),
                ],
                spacing: { after: 240 },
            }),
            strategyHeading("Recommended win themes"),
        );

        input.strategy.winThemes.forEach((theme) => {
            children.push(bulletParagraph(theme));
        });

        children.push(strategyHeading("Recurring benchmark themes"));

        if (input.strategy.benchmarkThemes.length === 0) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "No recurring categories were detected in the analyzed reference tenders.",
                            italics: true,
                            color: COLORS.muted,
                        }),
                    ],
                }),
            );
        } else {
            input.strategy.benchmarkThemes.forEach((theme) => {
                children.push(
                    bulletParagraph(
                        `${theme.category}: appears in ${theme.referenceTenderCount} reference tender(s) and ${theme.currentRequirementCount} current requirement(s).`,
                    ),
                );
            });
        }

        children.push(strategyHeading("Evidence gaps before submission"));

        if (input.strategy.evidenceGaps.length === 0) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "No evidence-sensitive requirements were detected.",
                            italics: true,
                            color: COLORS.muted,
                        }),
                    ],
                }),
            );
        } else {
            input.strategy.evidenceGaps.forEach((gap) => {
                children.push(
                    bulletParagraph(
                        `${gap.displayId} (${gap.category}): ${gap.request}${gap.pageNumber ? ` Source page ${gap.pageNumber}.` : ""}`,
                    ),
                );
            });
        }

        children.push(strategyHeading("Benchmark source register"));

        input.strategy.references.forEach((reference) => {
            const sourceLabel =
                reference.sourceType === "SYNTHETIC_REFERENCE"
                    ? "Synthetic benchmark"
                    : "Public reference";

            children.push(
                bulletParagraph(
                    `${reference.title} — ${reference.issuerName} (${sourceLabel})`,
                ),
            );
        });

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: input.strategy.disclaimer,
                        italics: true,
                        color: COLORS.warning,
                    }),
                ],
                spacing: { before: 180, after: 320 },
            }),
        );
    }

    const orderedSections = [...input.sections].sort(
        (a, b) => a.position - b.position,
    );

    orderedSections.forEach((section, index) => {
        children.push(
            new Paragraph({
                text: `${index + 1}. ${section.title}`,
                heading: HeadingLevel.HEADING_1,
                pageBreakBefore: index === 0,
                keepNext: true,
                
            }),
        );

        children.push(...contentParagraphs(section.content));
    });

    const document = new Document({
        title: `${input.tender.title} - Tender Proposal Response`,
        subject: "AI-assisted tender proposal response",
        creator: "TenderPilot AI",
        description:
            "AI-assisted tender proposal response requiring human review.",
        styles: {
            default: {
                document: {
                    run: {
                        font: "Arial",
                        size: 22,
                        color: COLORS.body,
                    },
                    paragraph: {
                        spacing: {
                            line: 240,
                            after: 140,
                        },
                        
                    },
                },
                title: {
                    run: {
                        font: "Arial",
                        size: 32,
                        bold: true,
                        color: COLORS.heading,
                    },
                },
                heading1: {
                    run: {
                        font: "Arial",
                        size: 28,
                        bold: true,
                        color: COLORS.heading,
                    },
                    paragraph: {
                        spacing: {
                            before: 300,
                            after: 160,
                        },
                        keepNext: true,
                        
                    },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        size: {
                            width: 11906,
                            height: 16838,
                        },
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                            footer: 720,
                        },
                    },
                },
                footers: {
                    default: footer,
                },
                children,
            },
        ],
    });

    return Packer.toBuffer(document);
}

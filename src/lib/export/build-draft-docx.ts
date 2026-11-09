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
            widowControl: true,
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
                    PageNumber.CURRENT,
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
                widowControl: true,
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
                        widowControl: true,
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
                        widowControl: true,
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

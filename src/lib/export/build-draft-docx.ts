import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    HeadingLevel,
    PageBreak,
    PageNumber,
    Paragraph,
    Packer,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
} from "docx";
import type { TenderIntelligence } from "@/lib/intelligence/reference-tender-intelligence";

const PLACEHOLDER_PATTERN =
    /\[COMPANY TO PROVIDE INFORMATION:[^\]]+\]/gi;

const COLORS = {
    body: "1F2937",
    black: "000000",
    navy: "17365D",
    blue: "1F4E79",
    lightBlue: "EAF2F8",
    paleBlue: "F5F9FC",
    paleGray: "F3F4F6",
    border: "D9D9D9",
    muted: "6B7280",
    warning: "9A3412",
    success: "166534",
};

type ExportRequirement = {
    displayId: string;
    category: string;
    text: string;
    obligation: string;
    verification: string;
    pageNumber: number | null;
};

export type DraftExportInput = {
    tender: {
        title: string;
        issuerName: string;
        reference: string | null;
    };
    requirements: ExportRequirement[];
    sections: Array<{
        title: string;
        position: number;
        content: string;
    }>;
    strategy?: TenderIntelligence;
};

type DocxChild = Paragraph | Table;

function paragraphText(text: string, options: Record<string, unknown> = {}) {
    return new Paragraph({
        children: [new TextRun({ text, font: "Arial", size: 22 })],
        spacing: { line: 276, after: 140 },
        ...options,
    });
}

function contentParagraphs(content: string) {
    return content
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => {
            const trimmed = line.trim();
            const isBullet = /^[-*•]\s+/.test(trimmed);
            const normalized = isBullet
                ? trimmed.replace(/^[-*•]\s+/, "")
                : trimmed;
            const parts = normalized.split(PLACEHOLDER_PATTERN);
            const placeholders = normalized.match(PLACEHOLDER_PATTERN) ?? [];
            const children: TextRun[] = [];

            parts.forEach((part, index) => {
                if (part) {
                    children.push(
                        new TextRun({
                            text: part,
                            font: "Arial",
                            size: 22,
                        }),
                    );
                }

                if (placeholders[index]) {
                    children.push(
                        new TextRun({
                            text: placeholders[index],
                            bold: true,
                            color: COLORS.warning,
                            highlight: "yellow",
                            font: "Arial",
                            size: 21,
                        }),
                    );
                }
            });

            return new Paragraph({
                children,
                bullet: isBullet ? { level: 0 } : undefined,
                keepLines: true,
                spacing: { line: 276, after: 140 },
            });
        });
}

function heading(
    text: string,
    level: 1 | 2,
    pageBreakBefore = false,
) {
    return new Paragraph({
        text,
        heading:
            level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        pageBreakBefore,
        keepNext: true,
        spacing: {
            before: level === 1 ? 360 : 240,
            after: level === 1 ? 160 : 120,
        },
    });
}

function cell(
    text: string,
    options: {
        bold?: boolean;
        color?: string;
        fill?: string;
        width?: number;
        align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    } = {},
) {
    return new TableCell({
        width: options.width
            ? { size: options.width, type: WidthType.DXA }
            : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        shading: options.fill
            ? { type: ShadingType.CLEAR, fill: options.fill }
            : undefined,
        children: [
            new Paragraph({
                alignment: options.align,
                keepLines: true,
                spacing: { line: 230, after: 0 },
                children: [
                    new TextRun({
                        text,
                        bold: options.bold,
                        color: options.color ?? COLORS.body,
                        font: "Arial",
                        size: 19,
                    }),
                ],
            }),
        ],
    });
}

function table(rows: TableRow[]) {
    const border = {
        style: BorderStyle.SINGLE,
        size: 4,
        color: COLORS.border,
    };

    return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: border,
            bottom: border,
            left: border,
            right: border,
            insideHorizontal: border,
            insideVertical: border,
        },
    });
}

function metadataTable(input: DraftExportInput) {
    const rows = [
        ["Tender title", input.tender.title],
        ["Procuring entity", input.tender.issuerName],
        ["Tender reference", input.tender.reference ?? "Not provided"],
        [
            "Procurement type",
            input.strategy?.procurementType ?? "GENERAL",
        ],
        ["Document status", "Technical proposal response"],
        ["Review status", "Human review required before submission"],
    ];

    return table(
        rows.map(
            ([label, value], index) =>
                new TableRow({
                    children: [
                        cell(label, {
                            bold: true,
                            color: COLORS.navy,
                            fill:
                                index % 2 === 0
                                    ? COLORS.paleBlue
                                    : "FFFFFF",
                            width: 2400,
                        }),
                        cell(value, {
                            fill:
                                index % 2 === 0
                                    ? COLORS.paleBlue
                                    : "FFFFFF",
                            width: 6500,
                        }),
                    ],
                }),
        ),
    );
}

function responseLocation(requirement: ExportRequirement) {
    const category = `${requirement.category} ${requirement.text}`.toLowerCase();

    if (/experience|qualification|certificate|license|personnel|registration/.test(category)) {
        return "Company information and evidence";
    }

    if (/delivery|warranty|manufacturer|product|supply|spare/.test(category)) {
        return "Delivery and support response";
    }

    if (/work|method|technical|quality|safety|implementation|site/.test(category)) {
        return "Technical approach";
    }

    return "Compliance response";
}

function requirementStatus(requirement: ExportRequirement) {
    if (requirement.verification === "REJECTED") {
        return "Excluded from response";
    }

    if (requirement.verification === "VERIFIED") {
        return "Source checked";
    }

    return "Review required";
}

function complianceMatrix(
    requirements: ExportRequirement[],
    strategy?: TenderIntelligence,
) {
    const selectedCoverage = new Map(
        strategy?.coverage?.map((item) => [item.displayId, item]) ?? [],
    );
    const header = new TableRow({
        tableHeader: true,
        children: [
            cell("ID", {
                bold: true,
                color: "FFFFFF",
                fill: COLORS.navy,
                width: 750,
                align: AlignmentType.CENTER,
            }),
            cell("Tender requirement", {
                bold: true,
                color: "FFFFFF",
                fill: COLORS.navy,
                width: 3000,
            }),
            cell("Source", {
                bold: true,
                color: "FFFFFF",
                fill: COLORS.navy,
                width: 900,
                align: AlignmentType.CENTER,
            }),
            cell("Response location", {
                bold: true,
                color: "FFFFFF",
                fill: COLORS.navy,
                width: 1900,
            }),
            cell("Status", {
                bold: true,
                color: "FFFFFF",
                fill: COLORS.navy,
                width: 1500,
            }),
        ],
    });

    const rows = requirements.map((requirement, index) => {
        const coverage = selectedCoverage.get(requirement.displayId);
        const highPriority = coverage?.priority === "HIGH";
        const fill = index % 2 === 0 ? "FFFFFF" : COLORS.paleGray;
        const status = requirementStatus(requirement);

        return new TableRow({
            children: [
                cell(requirement.displayId, {
                    bold: true,
                    color: highPriority ? COLORS.warning : COLORS.navy,
                    fill,
                    width: 750,
                    align: AlignmentType.CENTER,
                }),
                cell(requirement.text, { fill, width: 3000 }),
                cell(
                    requirement.pageNumber
                        ? `Page ${requirement.pageNumber}`
                        : "Not found",
                    { fill, width: 900, align: AlignmentType.CENTER },
                ),
                cell(responseLocation(requirement), {
                    fill,
                    width: 1900,
                }),
                cell(status, {
                    bold: true,
                    color:
                        status === "Source checked"
                            ? COLORS.success
                            : COLORS.warning,
                    fill,
                    width: 1500,
                }),
            ],
        });
    });

    return table([header, ...rows]);
}

function sourceSummary(strategy?: TenderIntelligence) {
    if (!strategy || strategy.analyzedReferenceCount === 0) {
        return paragraphText(
            "The response is structured directly against the active tender requirements. Company-specific claims must be supported with verified evidence before submission.",
        );
    }

    return paragraphText(
        `The response structure prioritizes ${strategy.prioritySignals.length} tender signal(s) identified from the active tender and ${strategy.analyzedReferenceCount} relevant reference source(s). Reference documents inform structure only and are not treated as evidence of company experience.`,
    );
}

export async function buildDraftDocx(input: DraftExportInput) {
    const header = new Header({
        children: [
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [
                    new TextRun({
                        text: input.tender.reference
                            ? `${input.tender.reference}  |  Technical Proposal`
                            : "Technical Proposal",
                        font: "Arial",
                        size: 17,
                        color: COLORS.muted,
                    }),
                ],
            }),
        ],
    });
    const footer = new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: "Confidential  |  TenderPilot AI  |  Page ",
                        font: "Arial",
                        size: 17,
                        color: COLORS.muted,
                    }),
                    new TextRun({
                        children: [PageNumber.CURRENT],
                        font: "Arial",
                        size: 17,
                        color: COLORS.muted,
                    }),
                ],
            }),
        ],
    });

    const children: DocxChild[] = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1700, after: 260 },
            children: [
                new TextRun({
                    text: "TECHNICAL PROPOSAL",
                    bold: true,
                    color: COLORS.navy,
                    font: "Arial",
                    size: 25,
                    characterSpacing: 36,
                }),
            ],
        }),
        new Paragraph({
            text: input.tender.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 700 },
            children: [
                new TextRun({
                    text: input.tender.issuerName,
                    bold: true,
                    font: "Arial",
                    size: 26,
                    color: COLORS.black,
                }),
            ],
        }),
        metadataTable(input),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 720, after: 0 },
            children: [
                new TextRun({
                    text: "Prepared for formal review and submission",
                    italics: true,
                    font: "Arial",
                    size: 19,
                    color: COLORS.muted,
                }),
            ],
        }),
        new Paragraph({
            children: [new PageBreak()],
        }),
        heading("Proposal Overview", 1),
        sourceSummary(input.strategy),
        heading("Document Control", 2),
        metadataTable(input),
        paragraphText(
            "This proposal must be reviewed against the original tender document before submission. Company facts, certificates, project references, personnel details, prices, and legal declarations must be verified and completed by the bidder.",
            { spacing: { before: 180, after: 180 } },
        ),
    ];

    const orderedSections = [...input.sections].sort(
        (left, right) => left.position - right.position,
    );
    let sectionNumber = 1;

    for (const section of orderedSections) {
        children.push(heading(`${sectionNumber}. ${section.title}`, 1));
        children.push(...contentParagraphs(section.content));
        sectionNumber += 1;

        if (section.title.toLowerCase().includes("understanding")) {
            children.push(
                heading(`${sectionNumber}. Compliance Response Matrix`, 1),
                paragraphText(
                    "The following matrix maps the extracted tender requirements to the relevant response area. Source pages are included to support manual verification.",
                ),
                complianceMatrix(input.requirements, input.strategy),
            );
            sectionNumber += 1;
        }
    }

    if (!orderedSections.some((section) =>
        section.title.toLowerCase().includes("understanding"),
    )) {
        children.push(
            heading(`${sectionNumber}. Compliance Response Matrix`, 1),
            paragraphText(
                "The following matrix maps the extracted tender requirements to the relevant response area. Source pages are included to support manual verification.",
            ),
            complianceMatrix(input.requirements, input.strategy),
        );
        sectionNumber += 1;
    }

    children.push(
        heading(`${sectionNumber}. Submission Review Notes`, 1),
        paragraphText(
            "Before submission, replace every highlighted company-information placeholder, verify all requirement responses against the original tender, attach the required forms and supporting evidence, and confirm that the final version is signed by an authorized representative.",
        ),
        heading("Required Supporting Evidence", 2),
        paragraphText(
            "Attach the certificates, project references, personnel information, manufacturer authorizations, delivery schedules, drawings, declarations, and other documents required by the applicable tender clauses.",
        ),
    );

    const document = new Document({
        title: `${input.tender.title} - Technical Proposal`,
        subject: "Professional tender proposal response",
        creator: "TenderPilot AI",
        description:
            "Structured technical tender proposal requiring bidder verification before submission.",
        styles: {
            default: {
                document: {
                    run: {
                        font: "Arial",
                        size: 22,
                        color: COLORS.body,
                    },
                    paragraph: {
                        spacing: { line: 276, after: 140 },
                    },
                },
                title: {
                    run: {
                        font: "Arial",
                        size: 34,
                        bold: true,
                        color: COLORS.black,
                    },
                    paragraph: {
                        spacing: { after: 240 },
                    },
                },
                heading1: {
                    run: {
                        font: "Arial",
                        size: 28,
                        bold: true,
                        color: COLORS.black,
                    },
                    paragraph: {
                        spacing: {
                            before: 360,
                            after: 160,
                        },
                        keepNext: true,
                    },
                },
                heading2: {
                    run: {
                        font: "Arial",
                        size: 23,
                        bold: true,
                        color: COLORS.black,
                    },
                    paragraph: {
                        spacing: {
                            before: 240,
                            after: 120,
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
                            top: 1150,
                            right: 1250,
                            bottom: 1150,
                            left: 1250,
                            header: 500,
                            footer: 650,
                        },
                    },
                },
                headers: { default: header },
                footers: { default: footer },
                children,
            },
        ],
    });

    return Packer.toBuffer(document);
}

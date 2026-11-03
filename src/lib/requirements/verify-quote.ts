export type VerificationStatus =
    | "VERIFIED"
    | "UNVERIFIED";

export type VerificationPage = {
    pageNumber: number;
    text: string;
};

export type RequirementForVerification = {
    pageNumber: number | null;
    quote: string | null;
};

export type QuoteVerificationResult = {
    verification: VerificationStatus;
    pageNumber: number | null;
    matchedPageNumber: number | null;
};

function convertBanglaDigits(value: string) {
    const banglaDigits = "০১২৩৪৫৬৭৮৯";
    const latinDigits = "0123456789";

    return value.replace(
        /[০-৯]/g,
        (digit) =>
            latinDigits[banglaDigits.indexOf(digit)],
    );
}

export function normalizeForVerification(
    value: string,
) {
    return convertBanglaDigits(value)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

export function verifyRequirementQuote(
    requirement: RequirementForVerification,
    pages: VerificationPage[],
): QuoteVerificationResult {
    const quote = requirement.quote?.trim();

    if (!quote) {
        return {
            verification: "UNVERIFIED",
            pageNumber: requirement.pageNumber,
            matchedPageNumber: null,
        };
    }

    const normalizedQuote =
        normalizeForVerification(quote);

    if (!normalizedQuote) {
        return {
            verification: "UNVERIFIED",
            pageNumber: requirement.pageNumber,
            matchedPageNumber: null,
        };
    }

    const normalizedPages = pages.map((page) => ({
        ...page,
        normalizedText: normalizeForVerification(
            page.text,
        ),
    }));

    const citedPage = normalizedPages.find(
        (page) =>
            page.pageNumber === requirement.pageNumber,
    );

    if (
        citedPage?.normalizedText.includes(
            normalizedQuote,
        )
    ) {
        return {
            verification: "VERIFIED",
            pageNumber: citedPage.pageNumber,
            matchedPageNumber: citedPage.pageNumber,
        };
    }

    const correctedPage = normalizedPages.find(
        (page) =>
            page.normalizedText.includes(
                normalizedQuote,
            ),
    );

    if (correctedPage) {
        return {
            verification: "VERIFIED",
            pageNumber: correctedPage.pageNumber,
            matchedPageNumber: correctedPage.pageNumber,
        };
    }

    return {
        verification: "UNVERIFIED",
        pageNumber: requirement.pageNumber,
        matchedPageNumber: null,
    };
}
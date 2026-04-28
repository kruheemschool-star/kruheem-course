import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// A4 at 96 DPI
const A4_WIDTH_PX = 794;   // 210mm
const A4_HEIGHT_PX = 1123; // 297mm

let fontCache: { regular: string; bold: string } | null = null;

async function loadFontBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load font: ${url}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function getFonts() {
    if (fontCache) return fontCache;
    const [regular, bold] = await Promise.all([
        loadFontBase64("/fonts/Prompt-Regular.ttf"),
        loadFontBase64("/fonts/Prompt-Bold.ttf"),
    ]);
    fontCache = { regular, bold };
    return fontCache;
}

function waitForMathRender(container: HTMLElement, timeout = 5000): Promise<void> {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            const pending = container.querySelectorAll(".katex-mathml, mjx-container");
            const elapsed = Date.now() - start;
            if (pending.length === 0 || elapsed > timeout) {
                setTimeout(resolve, 500);
            } else {
                setTimeout(check, 200);
            }
        };
        check();
    });
}

/**
 * Generate a multi-page A4 PDF from exam content.
 * The content is reflowed to A4 width before capture so font sizes
 * are readable and each PDF page corresponds to one physical A4 sheet.
 */
export async function generateExamPdf(
    elementId: string,
    mode: "exam" | "answer",
    title: string,
    onProgress?: (currentPage: number, totalPages: number) => void
) {
    const element = document.getElementById(elementId);
    if (!element) throw new Error("Element not found");

    // Wait for math rendering to complete
    await waitForMathRender(element);

    // Load Thai fonts for PDF header/footer
    const fonts = await getFonts();

    // Prepare PDF
    const doc = new jsPDF("p", "mm", "a4");
    doc.addFileToVFS("Prompt-Regular.ttf", fonts.regular);
    doc.addFont("Prompt-Regular.ttf", "Prompt", "normal");
    doc.addFileToVFS("Prompt-Bold.ttf", fonts.bold);
    doc.addFont("Prompt-Bold.ttf", "Prompt", "bold");

    const safeTitle = title.replace(/[^a-zA-Z0-9\u0E00-\u0E7F _-]/g, "_").slice(0, 50);
    const modeLabel = mode === "exam" ? "โจทย์" : "เฉลย";
    const filename = `${safeTitle}-${modeLabel}.pdf`;

    // First pass: clone + reflow to A4 width to measure total height
    // We use a hidden iframe so styles apply cleanly
    const measureCanvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
            const cloned = clonedDoc.getElementById(elementId);
            if (!cloned) return;

            // Constrain to A4 width so content reflows properly
            cloned.style.width = `${A4_WIDTH_PX}px`;
            cloned.style.maxWidth = `${A4_WIDTH_PX}px`;
            cloned.style.margin = "0 auto";
            cloned.style.padding = "40px";
            cloned.style.fontSize = "16px";
            cloned.style.lineHeight = "1.7";
            cloned.style.boxSizing = "border-box";

            // Ensure images stay within bounds
            cloned.querySelectorAll("img, svg").forEach((img) => {
                (img as HTMLElement).style.maxWidth = "100%";
                (img as HTMLElement).style.height = "auto";
            });

            // Enlarge heading font sizes for print readability
            cloned.querySelectorAll("h1, .text-2xl, .text-xl").forEach((el) => {
                (el as HTMLElement).style.fontSize = "22px";
                (el as HTMLElement).style.lineHeight = "1.4";
            });
            cloned.querySelectorAll("h2, .text-lg").forEach((el) => {
                (el as HTMLElement).style.fontSize = "18px";
            });

            // Hide web-only UI bits in the clone
            cloned.querySelectorAll(".print\\:hidden, .no-print").forEach((el) => {
                (el as HTMLElement).style.display = "none";
            });
        },
    });

    // Total content height when reflowed to A4 width
    const totalHeight = measureCanvas.height;
    const totalPages = Math.max(1, Math.ceil(totalHeight / A4_HEIGHT_PX));

    // Capture each A4 viewport as a separate image
    const marginMM = 10;
    const contentWmm = 210 - marginMM * 2;  // 190mm
    const contentHmm = 297 - marginMM * 2;  // 277mm

    for (let page = 0; page < totalPages; page++) {
        const yOffset = page * A4_HEIGHT_PX;
        const remainingHeight = totalHeight - yOffset;
        const captureHeight = Math.min(A4_HEIGHT_PX, remainingHeight);

        const canvas = await html2canvas(element, {
            scale: 1.5, // 1.5x = ~144 DPI, good balance of quality vs size
            y: yOffset,
            height: captureHeight,
            width: A4_WIDTH_PX,
            windowWidth: A4_WIDTH_PX,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
            onclone: (clonedDoc) => {
                const cloned = clonedDoc.getElementById(elementId);
                if (!cloned) return;

                cloned.style.width = `${A4_WIDTH_PX}px`;
                cloned.style.maxWidth = `${A4_WIDTH_PX}px`;
                cloned.style.margin = "0 auto";
                cloned.style.padding = "40px";
                cloned.style.fontSize = "16px";
                cloned.style.lineHeight = "1.7";
                cloned.style.boxSizing = "border-box";

                cloned.querySelectorAll("img, svg").forEach((img) => {
                    (img as HTMLElement).style.maxWidth = "100%";
                    (img as HTMLElement).style.height = "auto";
                });

                cloned.querySelectorAll("h1, .text-2xl, .text-xl").forEach((el) => {
                    (el as HTMLElement).style.fontSize = "22px";
                    (el as HTMLElement).style.lineHeight = "1.4";
                });
                cloned.querySelectorAll("h2, .text-lg").forEach((el) => {
                    (el as HTMLElement).style.fontSize = "18px";
                });

                cloned.querySelectorAll(".print\\:hidden, .no-print").forEach((el) => {
                    (el as HTMLElement).style.display = "none";
                });
            },
        });

        const imgData = canvas.toDataURL("image/png");

        if (page > 0) {
            doc.addPage();
        }

        // Image dimensions in mm (fit within content area)
        const imgWmm = contentWmm;
        const imgHmm = (canvas.height / canvas.width) * imgWmm;

        // Add the page image
        doc.addImage(imgData, "PNG", marginMM, marginMM, imgWmm, imgHmm);

        // Footer with page number
        doc.setFont("Prompt", "normal");
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        const footerText = `${title} — ${modeLabel}  หน้า ${page + 1}/${totalPages}`;
        doc.text(footerText, 105, 290, { align: "center" });

        onProgress?.(page + 1, totalPages);
    }

    doc.save(filename);
}

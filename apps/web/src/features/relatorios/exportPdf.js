import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
// A4 retrato em pt (1 pt = 1/72 in). jsPDF usa pt como unidade default.
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MARGIN_PT = 28;
export async function exportarRelatorioPdf({ element, filename, title, subtitle }) {
    // Renderiza a área em alta resolução (scale 2) e força cores RGB válidas em modo escuro.
    const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        useCORS: true,
        logging: false,
    });
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    // Cabeçalho da primeira página
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(title, MARGIN_PT, MARGIN_PT + 12);
    if (subtitle) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(subtitle, MARGIN_PT, MARGIN_PT + 28);
        pdf.setTextColor(0);
    }
    const headerOffset = subtitle ? 48 : 32;
    const pageContentWidth = A4_WIDTH_PT - 2 * MARGIN_PT;
    const pageContentHeight = A4_HEIGHT_PT - 2 * MARGIN_PT - headerOffset;
    // Razão para mapear pixels do canvas em pt da página
    const ratio = pageContentWidth / canvas.width;
    const scaledFullHeight = canvas.height * ratio;
    if (scaledFullHeight <= pageContentHeight) {
        // Cabe em uma página
        const img = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(img, "JPEG", MARGIN_PT, MARGIN_PT + headerOffset, pageContentWidth, scaledFullHeight);
    }
    else {
        // Fatia a imagem em páginas A4
        const sliceHeightPx = pageContentHeight / ratio;
        let offsetPx = 0;
        let primeira = true;
        while (offsetPx < canvas.height) {
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - offsetPx);
            const ctx = sliceCanvas.getContext("2d");
            if (!ctx)
                break;
            ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#ffffff";
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(canvas, 0, offsetPx, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
            const img = sliceCanvas.toDataURL("image/jpeg", 0.92);
            const headerY = primeira ? MARGIN_PT + headerOffset : MARGIN_PT;
            if (!primeira)
                pdf.addPage();
            pdf.addImage(img, "JPEG", MARGIN_PT, headerY, pageContentWidth, sliceCanvas.height * ratio);
            offsetPx += sliceCanvas.height;
            primeira = false;
        }
    }
    // Rodapé com numeração de páginas
    const totalPaginas = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
        pdf.setPage(p);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(140);
        pdf.text(`Página ${p} de ${totalPaginas} • Finanças`, A4_WIDTH_PT / 2, A4_HEIGHT_PT - 12, { align: "center" });
    }
    pdf.save(filename);
}

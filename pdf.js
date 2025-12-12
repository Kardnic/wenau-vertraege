// pdf.js
// Erzeugt den Spielervertrag im Browser (Layout wie im alten Node/PDFKit-Programm)

async function generatePlayerPDF(s) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  // -----------------------------
  // Globale Skalierung
  // -----------------------------
  const SCALE = 0.92; // bei Bedarf: 0.9 / 0.95

  const FESTE_SAISON = `Saison ${s.saison}`;

  // A4
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const form = pdfDoc.getForm();

  const marginLeft = 50;
  const marginRight = 50;
  let y = pageHeight - 70;

  // -----------------------------
  // Hilfsfunktionen
  // -----------------------------
  function drawLineOfText(txt, { x = marginLeft, size = 10, bold = false } = {}) {
    const f = bold ? fontBold : font;
    page.drawText(txt, {
      x,
      y,
      size: size * SCALE,
      font: f,
      color: rgb(0, 0, 0),
    });
  }

  function drawParagraph(
    txt,
    { size = 10, bold = false, lineHeight = 14, align = "left" } = {}
  ) {
    const f = bold ? fontBold : font;
    const maxWidth = pageWidth - marginLeft - marginRight;
    const words = txt.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      const testWidth = f.widthOfTextAtSize(testLine, size * SCALE);
      if (testWidth > maxWidth) {
        drawWrappedLine(line, f, size, lineHeight, align, bold);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      drawWrappedLine(line, f, size, lineHeight, align, bold);
    }
  }

  function drawWrappedLine(text, fontUsed, size, lineHeight, align, bold) {
    let x = marginLeft;
    if (align === "center") {
      const tw = fontUsed.widthOfTextAtSize(text, size * SCALE);
      x = (pageWidth - tw) / 2;
    }
    drawLineOfText(text, { x, size, bold });
    y -= lineHeight * SCALE;
  }

  function moveDown(lines = 1, lineHeight = 14) {
    y -= lines * lineHeight * SCALE;
  }

  // -----------------------------
  // Logo
  // -----------------------------
  try {
    const logoBytes = await fetch("assets/logo.png").then(r => r.arrayBuffer());
    const logoImg = await pdfDoc.embedPng(logoBytes);
    const logoWidth = 60;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;

    page.drawImage(logoImg, {
      x: pageWidth - marginRight - logoWidth,
      y: pageHeight - 40 - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
  } catch {}

  // -----------------------------
  // Titel
  // -----------------------------
  const title = "Spielervertrag";
  const titleSize = 26;
  const tw = fontBold.widthOfTextAtSize(title, titleSize * SCALE);
  drawLineOfText(title, {
    x: (pageWidth - tw) / 2,
    size: titleSize,
    bold: true,
  });
  moveDown(3.5, 18);

  // -----------------------------
  // Einleitung
  // -----------------------------
  drawParagraph("Zwischen dem Verein", { size: 10, lineHeight: 12 });
  moveDown(0.3, 10);
  drawParagraph("Jugendsport Wenau e.V.", { size: 10, bold: true, lineHeight: 12 });
  drawParagraph('(im Folgenden „Verein“ genannt)', { size: 10, lineHeight: 12 });

  moveDown(0.8, 12);

  drawParagraph("und dem Spieler", { size: 10, lineHeight: 12 });
  moveDown(0.3, 10);
  drawParagraph(s.name, { size: 10, bold: true, lineHeight: 12 });
  drawParagraph('(im Folgenden „Spieler“ genannt)', { size: 10, lineHeight: 12 });

  moveDown(0.8, 12);

  drawParagraph("wird vereinbart, dass er in der ", { size: 10, lineHeight: 12 });
  drawParagraph(s.saison, { size: 10, bold: true, lineHeight: 12 });
  drawParagraph(
    " als aktiver Spieler des Jugendsport Wenau e.V. der 1. Mannschaft tätig sein wird.",
    { size: 10, lineHeight: 12 }
  );

  moveDown(0.8, 14);

  // -----------------------------
  // Prämiensystem
  // -----------------------------
  drawParagraph(`Prämiensystem: ${FESTE_SAISON}`, {
    size: 10,
    bold: true,
    lineHeight: 12,
  });
  moveDown(0.8, 12);

  // -----------------------------
  // Tabelle
  // -----------------------------
  const tableTop = y;
  const col1Width = 250;
  const col2Width = 100;
  const rowHeight = 18 * SCALE;

  const rows = [
    ["Fahrtgeld (€)", Number(s.fahrtgeld || 0).toFixed(2)],
    ["Trainingsprämie (€)", Number(s.trainingspraemie || 0).toFixed(2)],
    ["Spielprämie (€)", Number(s.spielpraemie || 0).toFixed(2)],
    ["Siegprämie pro Spiel (€)", Number(s.siegpraemie || 0).toFixed(2)],
    ["Gehalt/Monat (€)", Number(s.gehalt_monat || 0).toFixed(2)],
    ["Gehalt/Jahr (€)", Number(s.gehalt_jahr || 0).toFixed(2)],
  ];

  const tableLeft = marginLeft;
  const tableRight = marginLeft + col1Width + col2Width;

  for (let i = 0; i <= rows.length; i++) {
    const yy = tableTop - i * rowHeight;
    page.drawLine({
      start: { x: tableLeft, y: yy },
      end: { x: tableRight, y: yy },
      thickness: 0.6,
      color: rgb(0, 0, 0),
    });
  }

  [tableLeft, tableLeft + col1Width, tableRight].forEach(x =>
    page.drawLine({
      start: { x, y: tableTop },
      end: { x, y: tableTop - rows.length * rowHeight },
      thickness: 0.6,
      color: rgb(0, 0, 0),
    })
  );

  let rowY = tableTop - rowHeight + 4 * SCALE;
  rows.forEach(([label, value]) => {
    page.drawText(label, {
      x: tableLeft + 4,
      y: rowY,
      size: 9 * SCALE,
      font,
    });

    const vWidth = fontBold.widthOfTextAtSize(value, 9 * SCALE);
    page.drawText(value, {
      x: tableRight - 4 - vWidth,
      y: rowY,
      size: 9 * SCALE,
      font: fontBold,
    });

    rowY -= rowHeight;
  });

  y = tableTop - rows.length * rowHeight - 10;

  drawParagraph(
    "Als Ersatz für besondere Aufwendungen erhalten Torhüter einen Gutschein über 100,- €, falls sie am 01.02. noch im Aufgebot der Mannschaft stehen.",
    { size: 8, lineHeight: 10 }
  );

  moveDown(0.8, 12);

  // -----------------------------
  // Weitere Abschnitte
  // -----------------------------
  drawParagraph("Gehaltsschlüssel", { size: 11, bold: true });
  drawParagraph(
    "Für das Gehalt pro Monat wird von 8 Trainingseinheiten und 4 Spielen im Monat ausgegangen."
  );

  drawParagraph("Trainingsprämie", { size: 11, bold: true });
  drawParagraph(
    "Absagen jeglicher Art zu Trainingseinheiten führen zum Verlust der jeweiligen Trainingsprämie."
  );

  drawParagraph("Spielprämie", { size: 11, bold: true });
  drawParagraph("Spielprämien werden ab 1 Minute Spielzeit berechnet.");

  drawParagraph("Besondere Vereinbarungen", { size: 11, bold: true });
  drawParagraph(
    "Sollte es zu einer Kündigung durch den Spieler (Abmeldung vor dem 31.05.2026) kommen, wird eine Entschädigungszahlung an den Verein in Höhe der dreifachen Monats-Pauschale fällig."
  );
  drawParagraph(
    "Sollte es zu einer Kündigung seitens des Vereins kommen, ist der Verein von sämtlichen ausstehenden Gehaltszahlungen entbunden."
  );
  drawParagraph(
    "Diese Vereinbarung ist für die kommende Saison gültig."
  );

  // -----------------------------
  // Zusatzbedingungen – Formularfeld
  // -----------------------------
  drawParagraph("Zusatzbedingungen", { size: 11, bold: true });

  const fieldHeight = 20 * SCALE;
  const zusatzField = form.createTextField("zusatzbedingungen");
  zusatzField.enableMultiline();
  //zusatzField.setFontSize(10 * SCALE);
  //zusatzField.setText("Test"); 
  zusatzField.addToPage(page, {
    x: marginLeft,
    y: y - fieldHeight,
    width: pageWidth - marginLeft - marginRight,
    height: fieldHeight,
    borderWidth: 0,
    borderColor: rgb(0, 0, 0),
  });
  

  y -= fieldHeight + 10;

  // -----------------------------
  // Abschluss
  // -----------------------------
  drawParagraph("Aussetzung des Spielbetriebs durch eine Anordnung", {
    size: 11,
    bold: true,
  });
  drawParagraph(
    "Sollte es durch besondere Gründe zu einer Aussetzung des Spielbetriebs kommen (z.B. Pandemie), wird der Verein für diesen Zeitraum keine Aufwandsentschädigungen zahlen."
  );

  const heute = new Date().toLocaleDateString("de-DE");
  drawParagraph(`Wenau, den ${heute}`);

  moveDown(3, 14);

  // -----------------------------
  // Unterschriften
  // -----------------------------
  const sigWidth = 180;
  page.drawLine({
    start: { x: marginLeft, y },
    end: { x: marginLeft + sigWidth, y },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
  page.drawText("Unterschrift Spieler", {
    x: marginLeft,
    y: y - 12,
    size: 10 * SCALE,
    font,
  });

  const rightX = pageWidth - marginRight - sigWidth;
  page.drawLine({
    start: { x: rightX, y },
    end: { x: rightX + sigWidth, y },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
  page.drawText("Unterschrift Verein", {
    x: rightX,
    y: y - 12,
    size: 10 * SCALE,
    font,
  });

  //form.updateFieldAppearances(font);

  // -----------------------------
  // Download
  // -----------------------------
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${s.name}_Vertrag.pdf`;
  a.click();

  URL.revokeObjectURL(url);
}

window.generatePlayerPDF = generatePlayerPDF;

// pdf.js
// Erzeugt den Spielervertrag im Browser (Layout wie im alten Node/PDFKit-Programm)

async function generatePlayerPDF(s) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const FESTE_SAISON = "Saison 2026/2027";

  // A4-Seite: 595 x 842 (ca.)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginLeft = 50;
  const marginRight = 50;
  let y = pageHeight - 70; // Start oben

  // -----------------------------
  // Hilfsfunktionen
  // -----------------------------

  function drawLineOfText(txt, { x = marginLeft, size = 10, bold = false } = {}) {
    const f = bold ? fontBold : font;
    page.drawText(txt, { x, y, size, font: f, color: rgb(0, 0, 0) });
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
      const testWidth = f.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth) {
        drawWrappedLine(line, f, size, align);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      drawWrappedLine(line, f, size, align);
    }

    function drawWrappedLine(text, fontUsed, fontSize, alignMode) {
      if (alignMode === "center") {
        const tw = fontUsed.widthOfTextAtSize(text, fontSize);
        const x = (pageWidth - tw) / 2;
        drawLineOfText(text, { x, size: fontSize, bold });
      } else {
        drawLineOfText(text, { x: marginLeft, size: fontSize, bold });
      }
      y -= lineHeight;
    }
  }

  function moveDown(lines = 1, lineHeight = 14) {
    y -= lines * lineHeight;
  }

  // -----------------------------
  // Logo oben rechts
  // -----------------------------

  try {
    const logoBytes = await fetch("assets/logo.png").then((r) => r.arrayBuffer());
    const logoImg = await pdfDoc.embedPng(logoBytes);

    const logoWidth = 60;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;

    page.drawImage(logoImg, {
      x: pageWidth - marginRight - logoWidth,
      y: pageHeight - 60 - logoHeight + 20,
      width: logoWidth,
      height: logoHeight,
    });
  } catch (e) {
    console.warn("Logo konnte nicht geladen werden:", e);
  }

  // -----------------------------
  // Titel
  // -----------------------------
  {
    const title = "Spielervertrag";
    const size = 26;
    const tw = fontBold.widthOfTextAtSize(title, size);
    const x = (pageWidth - tw) / 2;
    drawLineOfText(title, { x, size, bold: true });
    moveDown(0.5, 18);
  }

  // -----------------------------
  // Einleitung wie im Original
  // -----------------------------

  // "Zwischen dem Verein ..."
  drawParagraph("Zwischen dem Verein", {
    size: 10,
    bold: false,
    lineHeight: 12,
  });

  moveDown(0.3, 10);
  drawParagraph("Jugendsport Wenau e.V.", {
    size: 10,
    bold: true,
    lineHeight: 12,
  });
  drawParagraph('(im Folgenden „Verein“ genannt)', {
    size: 10,
    bold: false,
    lineHeight: 12,
  });

  moveDown(0.5, 12);
  drawParagraph("und dem Spieler", {
    size: 10,
    bold: false,
    lineHeight: 12,
  });

  moveDown(0.3, 10);
  drawParagraph(s.name, { size: 10, bold: true, lineHeight: 12 });
  drawParagraph('(im Folgenden „Spieler“ genannt)', {
    size: 10,
    bold: false,
    lineHeight: 12,
  });

  moveDown(0.5, 12);
  drawParagraph(
    `wird vereinbart, dass er in der ${FESTE_SAISON} als aktiver Spieler des Jugendsport Wenau e.V. der 1. Mannschaft tätig sein wird.`,
    {
      size: 10,
      bold: false,
      lineHeight: 12,
    }
  );

  moveDown(0.8, 14);

  // -----------------------------
  // Prämiensystem Überschrift
  // -----------------------------
  drawParagraph(`Prämiensystem: ${FESTE_SAISON}`, {
    size: 10,
    bold: true,
    lineHeight: 12,
  });
  moveDown(0.5, 12);

  // -----------------------------
  // Tabelle (Fahrtgeld, Prämien, Gehalt)
  // -----------------------------
  const tableTop = y;
  const col1Width = 250;
  const col2Width = 100;
  const rowHeight = 18;

  const rows = [
    ["Fahrtgeld (€)", Number(s.fahrtgeld || 0).toFixed(2)],
    ["Trainingsprämie (€)", Number(s.trainingspraemie || 0).toFixed(2)],
    ["Spielprämie (€)", Number(s.spielpraemie || 0).toFixed(2)],
    ["Siegprämie pro Spiel (!)", Number(s.siegpraemie || 0).toFixed(2)],
    ["Gehalt/Monat (€)", Number(s.gehalt_monat || 0).toFixed(2)],
    ["Gehalt/Jahr (€)", Number(s.gehalt_jahr || 0).toFixed(2)],
  ];

  const tableLeft = marginLeft;
  const tableRight = marginLeft + col1Width + col2Width;

  // Linienbreite
  const lineThickness = 0.6;

  // horizontale Linien
  for (let i = 0; i <= rows.length; i++) {
    const yy = tableTop - i * rowHeight;
    page.drawLine({
      start: { x: tableLeft, y: yy },
      end: { x: tableRight, y: yy },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });
  }

  // vertikale Linien
  page.drawLine({
    start: { x: tableLeft, y: tableTop },
    end: { x: tableLeft, y: tableTop - rows.length * rowHeight },
    thickness: lineThickness,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: tableLeft + col1Width, y: tableTop },
    end: { x: tableLeft + col1Width, y: tableTop - rows.length * rowHeight },
    thickness: lineThickness,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: tableRight, y: tableTop },
    end: { x: tableRight, y: tableTop - rows.length * rowHeight },
    thickness: lineThickness,
    color: rgb(0, 0, 0),
  });

  // Tabelleninhalt
  let rowY = tableTop - rowHeight + 4;
  rows.forEach(([label, value]) => {
    // linke Spalte
    page.drawText(label, {
      x: tableLeft + 4,
      y: rowY,
      size: 9,
      font,
    });

    // rechte Spalte rechtsbündig
    const vText = value;
    const vWidth = fontBold.widthOfTextAtSize(vText, 9);
    const vx = tableRight - 4 - vWidth;

    page.drawText(vText, {
      x: vx,
      y: rowY,
      size: 9,
      font: fontBold,
    });

    rowY -= rowHeight;
  });

  // Unter die Tabelle springen
  y = tableTop - rows.length * rowHeight - 12;

  // Fußnote unter der Tabelle
  drawParagraph(
    "Als Ersatz für besondere Aufwendungen erhalten Torhüter einen Gutschein über 100,- €, falls sie am 01.02. noch im Aufgebot der Mannschaft stehen.",
    {
      size: 8,
      bold: false,
      lineHeight: 10,
    }
  );

  moveDown(0.5, 12);

  // -----------------------------
  // Weitere Abschnitte (wie Original)
  // -----------------------------

  // Gehaltsschlüssel
  drawParagraph("Gehaltsschlüssel", {
    size: 11,
    bold: true,
    lineHeight: 14,
  });
  drawParagraph(
    "Für das Gehalt pro Monat wird von 8 Trainingseinheiten und 4 Spielen im Monat ausgegangen.",
    {
      size: 10,
      bold: false,
      lineHeight: 12,
    }
  );
  moveDown(0.5, 12);

  // Trainingsprämie
  drawParagraph("Trainingsprämie", {
    size: 11,
    bold: true,
    lineHeight: 14,
  });
  drawParagraph(
    "Absagen jeglicher Art zu Trainingseinheiten führen zum Verlust der jeweiligen Trainingsprämie.",
    {
      size: 10,
      bold: false,
      lineHeight: 12,
    }
  );
  moveDown(0.5, 12);

  // Spielprämie
  drawParagraph("Spielprämie", {
    size: 11,
    bold: true,
    lineHeight: 14,
  });
  drawParagraph("Spielprämien werden ab 1 Minute Spielzeit berechnet.", {
    size: 10,
    bold: false,
    lineHeight: 12,
  });
  moveDown(0.5, 12);

  // Technischer Ablauf
  drawParagraph("Technischer Ablauf für die Zahlungen", {
    size: 11,
    bold: true,
    lineHeight: 14,
  });
  drawParagraph(
    "Die Zusammenstellung der aufwandsbezogenen Zahlungen für den Steuerberater findet monatlich statt. Die Prämien werden am Monatsende überwiesen.",
    {
      size: 10,
      bold: false,
      lineHeight: 12,
    }
  );
  moveDown(0.5, 12);

  // Besondere Vereinbarungen
  drawParagraph("Besondere Vereinbarungen", {
    size: 11,
    bold: true,
    lineHeight: 14,
  });
  drawParagraph(
    "Sollte es zu einer Kündigung durch den Spieler (Abmeldung vor dem 31.05.2027) kommen, wird eine Entschädigungszahlung an den Verein in Höhe der dreifachen Monats-Pauschale fällig.",
    { size: 10, bold: false, lineHeight: 12 }
  );
  drawParagraph(
    "Sollte es zu einer Kündigung seitens des Vereins kommen, ist der Verein von sämtlichen ausstehenden Gehaltszahlungen entbunden.",
    { size: 10, bold: false, lineHeight: 12 }
  );
  drawParagraph(
    "Diese Vereinbarung ist für die kommende Saison gültig. Es kann sein, dass eine redaktionelle Überarbeitung wegen zu erwartender Auswirkungen durch die Berufsgenossenschaft notwendig ist.",
    { size: 10, bold: false, lineHeight: 12 }
  );
  moveDown(0.5, 12);

  // Aussetzung Spielbetrieb
  drawParagraph("Aussetzung des Spielbetriebs durch eine Anordnung", {
    size: 11,
    bold: true,
    lineHeight: 14,
  });
  drawParagraph(
    "Sollte es durch besondere Gründe zu einer Aussetzung des Spielbetriebs kommen (z.B. Pandemie), wird der Verein für diesen Zeitraum keine Aufwandsentschädigungen zahlen.",
    { size: 10, bold: false, lineHeight: 12 }
  );
  drawParagraph(
    "Eine besondere finanzielle Entwicklung auf Vereinsebene berechtigt beide Seiten zur außerordentlichen Kündigung.",
    { size: 10, bold: false, lineHeight: 12 }
  );

  moveDown(0.5, 12);

  // Datum
  const heute = new Date().toLocaleDateString("de-DE");
  drawParagraph(`Wenau, den ${heute}`, {
    size: 10,
    bold: false,
    lineHeight: 12,
  });

  moveDown(2.5, 14);

  // -----------------------------
  // Unterschriftenlinien
  // -----------------------------
  const sigWidth = 180;
  const sigY = y;

  // Spieler
  page.drawLine({
    start: { x: marginLeft, y: sigY },
    end: { x: marginLeft + sigWidth, y: sigY },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
  page.drawText("Unterschrift Spieler", {
    x: marginLeft,
    y: sigY - 12,
    size: 10,
    font,
  });

  // Verein
  const rightStartX = pageWidth - marginRight - sigWidth;
  page.drawLine({
    start: { x: rightStartX, y: sigY },
    end: { x: rightStartX + sigWidth, y: sigY },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
  page.drawText("Unterschrift Verein", {
    x: rightStartX,
    y: sigY - 12,
    size: 10,
    font,
  });

  // -----------------------------
  // Download des PDFs
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

// global verfügbar für app.js
window.generatePlayerPDF = generatePlayerPDF;

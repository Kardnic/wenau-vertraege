// pdf.js
// Erzeugt den Spielervertrag im Browser (Layout wie im alten Node/PDFKit-Programm)
// + Rückseite (Seite 2) mit Zusatzvereinbarung (ohne neues Datum/Unterschrift)

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

  // ✅ WICHTIG: muss "let" sein, weil wir auf Seite 2 neu setzen
  let { width: pageWidth, height: pageHeight } = page.getSize();

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

  const paragraphs = String(txt || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  paragraphs.forEach((para, pIndex) => {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";

    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      const testWidth = f.widthOfTextAtSize(testLine, size * SCALE);

      if (testWidth > maxWidth) {
        if (line) {
          drawWrappedLine(line, f, size, lineHeight, align, bold);
        }
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      drawWrappedLine(line, f, size, lineHeight, align, bold);
    }

    // manueller Zeilenumbruch im Textfeld
    if (pIndex < paragraphs.length - 1) {
      y -= lineHeight * SCALE;
    }
  });
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
  async function drawLogoTopRight() {
    try {
      // Hinweis: In CRA/Vite liegt das i.d.R. unter /assets/logo.png in "public"
      // Wenn du es in /public/assets/logo.png hast, ist fetch("/assets/logo.png") korrekt.
      const logoBytes = await fetch("assets/logo.png").then((r) => r.arrayBuffer());
      const logoImg = await pdfDoc.embedPng(logoBytes);

      const logoWidth = 60;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;

      page.drawImage(logoImg, {
        x: pageWidth - marginRight - logoWidth,
        y: pageHeight - 40 - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
    } catch {
      // Logo optional
    }
  }

  await drawLogoTopRight();

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
    ["max. möglich/ Monat (€)", Number(s.gehalt_monat || 0).toFixed(2)],
    ["Monatliche Prämie (€)", Number(s.fahrtgeld || 0).toFixed(2)],
    ["Trainingsprämie (€)", Number(s.trainingspraemie || 0).toFixed(2)],
    ["Spielprämie (€)", Number(s.spielpraemie || 0).toFixed(2)],
    
    
    
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

  [tableLeft, tableLeft + col1Width, tableRight].forEach((x) =>
    page.drawLine({
      start: { x, y: tableTop },
      end: { x, y: tableTop - rows.length * rowHeight },
      thickness: 0.6,
      color: rgb(0, 0, 0),
    })
  );

  let rowY = tableTop - rowHeight + 4 * SCALE;
  rows.forEach(([label, value]) => {
  const isBoldRow =
    label === "Gehalt/Jahr (€)" || label === "Gehalt/Monat (€)";

  // Label links (kann bleiben wie vorher oder auch fett – je nach Wunsch)
  page.drawText(label, {
    x: tableLeft + 4,
    y: rowY,
    size: 9 * SCALE,
    font: isBoldRow ? fontBold : font,
  });

  // 👉 Wert rechts – jetzt abhängig fett oder normal
  const valueFont = isBoldRow ? fontBold : font;
  const vWidth = valueFont.widthOfTextAtSize(value, 9 * SCALE);

  page.drawText(value, {
    x: tableRight - 4 - vWidth,
    y: rowY,
    size: 9 * SCALE,
    font: valueFont,
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
  drawParagraph("Spielprämien werden ab 1 Minute Spielzeit im Meisterschaftsspiel berechnet.");

  drawParagraph("Besondere Vereinbarungen", { size: 11, bold: true });
  drawParagraph(
    "Sollte es zu einer Kündigung durch den Spieler (Abmeldung vor dem 31.05) kommen, wird eine Entschädigungszahlung an den Verein in Höhe der dreifachen Monats-Pauschale fällig."
  );
  drawParagraph(
    "Sollte es zu einer Kündigung seitens des Vereins kommen, ist der Verein von sämtlichen ausstehenden Gehaltszahlungen entbunden."
  );
  drawParagraph("Diese Vereinbarung ist für die kommende Saison gültig.");

  // -----------------------------
  // Zusatzbedingungen (Frontseite)
  // -----------------------------
  if (s.zusatzbedingungen && s.zusatzbedingungen.trim()) {
    drawParagraph("Zusatzbedingungen", { size: 11, bold: true });
    drawParagraph(s.zusatzbedingungen, { size: 10, lineHeight: 12 });
    moveDown(0.8, 12);
  }

  // -----------------------------
  // Abschluss (Frontseite)
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
  // Unterschriften (Frontseite)
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

  // =====================================================
  // Rückseite / Seite 2: Zusatzvereinbarung (OHNE Datum/Signatur)
  // =====================================================
  page = pdfDoc.addPage([595, 842]);
  ({ width: pageWidth, height: pageHeight } = page.getSize());
  y = pageHeight - 70;

  await drawLogoTopRight();

  // Titel Rückseite
  const t2 = "Zusatzvereinbarung zum Spielervertrag";
  const t2Size = 18;
  const t2w = fontBold.widthOfTextAtSize(t2, t2Size * SCALE);
  drawLineOfText(t2, { x: (pageWidth - t2w) / 2, size: t2Size, bold: true });
  moveDown(2.0, 16);

  // Text (inhaltlich aus deiner Zusatzvereinbarung)
  drawParagraph(
    `Diese Zusatzvereinbarung ergänzt den Spielervertrag vom ${heute} für die Saison ${s.saison}.`,
    { size: 10, lineHeight: 12 }
  );
  drawParagraph(
    "Alle nachfolgenden Regelungen gelten zusätzlich zu den bestehenden Vertragsinhalten.",
    { size: 10, lineHeight: 12 }
  );

  moveDown(0.9, 14);

  drawParagraph("§1 Monatliche Prämie", { size: 11, bold: true, lineHeight: 14 });
  drawParagraph(
    "Die monatliche Prämie wird monatlich ab dem 01.08. bis zum 31.05. ausgezahlt.",
    { size: 10, lineHeight: 12 }
  );
  drawParagraph(
    "Die monatliche Prämie wird nur für Monate gezahlt, in denen der Spieler dem Trainings- und Spielbetrieb zur Verfügung steht.",
    { size: 10, lineHeight: 12 }
  );
  drawParagraph(
    "Bei längerer Verletzung (ab mehr als 4 zusammenhängenden Wochen Trainings- und Spielausfall) entfällt die monatliche Prämie für den Zeitraum der vollständigen Sportuntauglichkeit.",
    { size: 10, lineHeight: 12 }
  );
  drawParagraph("Die Auszahlung erfolgt jeweils monatsweise rückwirkend.", {
    size: 10,
    lineHeight: 12,
  });

  moveDown(0.7, 14);

  drawParagraph("§2 Trainingsprämie", { size: 11, bold: true, lineHeight: 14 });
  drawParagraph("Die Trainingsprämie wird ab dem 01.08. bis zum 31.05. gezahlt.", {
    size: 10,
    lineHeight: 12,
  });
  drawParagraph(
    "Die Auszahlung erfolgt ab der ersten offiziellen Trainingseinheit der neuen Saison.",
    { size: 10, lineHeight: 12 }
  );
  drawParagraph("Trainingsprämien werden nur für absolvierte Trainingseinheiten gezahlt.", {
    size: 10,
    lineHeight: 12,
  });
  drawParagraph("Absagen oder Nichtteilnahmen führen weiterhin zum Wegfall der jeweiligen Trainingsprämie.", {
    size: 10,
    lineHeight: 12,
  });
  drawParagraph("F-Spiele (Freundschaftsspiele) gelten nicht als Trainingseinheit im Sinne der Trainingsprämie.", {
    size: 10,
    lineHeight: 12,
  });

  moveDown(0.7, 14);

  drawParagraph("§3 Spielprämie (M-Spielprämie)", { size: 11, bold: true, lineHeight: 14 });
  drawParagraph(
    "Die bisherige Spielprämie wird in M-Spielprämie (Meisterschaftsspiel-Prämie) umbenannt.",
    { size: 10, lineHeight: 12 }
  );
  drawParagraph("Die Prämie wird ausschließlich für Einsätze in Meisterschaftsspielen gezahlt.", {
    size: 10,
    lineHeight: 12,
  });
  drawParagraph("Freundschaftsspiele (F-Spiele) sind von der Prämienzahlung ausgeschlossen.", {
    size: 10,
    lineHeight: 12,
  });
  drawParagraph("Die Prämie wird ab 1 Minute Einsatzzeit gewährt.", {
    size: 10,
    lineHeight: 12,
  });

  moveDown(0.7, 14);

  drawParagraph("§4 Gültigkeit", { size: 11, bold: true, lineHeight: 14 });
  drawParagraph(
    "Diese Zusatzvereinbarung tritt mit Unterzeichnung in Kraft und gilt für die " + FESTE_SAISON + ".",
    { size: 10, lineHeight: 12 }
  );
  drawParagraph("Alle übrigen Regelungen des ursprünglichen Spielervertrags bleiben unberührt.", {
    size: 10,
    lineHeight: 12,
  });

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
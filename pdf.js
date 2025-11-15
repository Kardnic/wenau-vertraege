// pdf.js – erzeugt einen Spielervertrag im Browser mit pdf-lib

async function generatePlayerPDF(player) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const FESTE_SAISON = "Saison 2026/27";

  // A4 Hochformat
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // [Breite, Höhe]
  const { width, height } = page.getSize();

  const marginLeft = 50;
  const marginRight = 50;

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 70;

  // Helper: einfache Zeile
  function drawLine(text, opts = {}) {
    const {
      x = marginLeft,
      size = 10,
      font = helvetica,
      color = rgb(0, 0, 0),
      lineGap = 3,
    } = opts;

    page.drawText(String(text), { x, y, size, font, color });
    y -= size + lineGap;
  }

  // Helper: Absatz mit Zeilenumbruch
  function drawParagraph(text, opts = {}) {
    const {
      x = marginLeft,
      size = 10,
      font = helvetica,
      color = rgb(0, 0, 0),
      maxWidth = width - marginLeft - marginRight,
      lineGap = 3,
    } = opts;

    const words = String(text).split(" ");
    let line = "";

    words.forEach((word) => {
      const testLine = line ? line + " " + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line !== "") {
        page.drawText(line, { x, y, size, font, color });
        y -= size + lineGap;
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line) {
      page.drawText(line, { x, y, size, font, color });
      y -= size + lineGap;
    }

    y -= 2; // kleiner extra Abstand nach Absatz
  }

  // ---------- Logo oben rechts ----------
  try {
    const logoUrl = "assets/logo.png"; // muss im Web-Ordner liegen
    const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoBytes);

    const logoWidth = 60;
    const logoHeight = 60;

    page.drawImage(logoImage, {
      x: width - marginRight - logoWidth,
      y: height - 40 - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
  } catch (e) {
    console.warn("Logo konnte nicht geladen werden:", e);
  }

  // ---------- Titel zentriert ----------
  const titleSize = 26;
  const title = "Spielervertrag";
  const titleWidth = helveticaBold.widthOfTextAtSize(title, titleSize);
  const titleX = (width - titleWidth) / 2;

  page.drawText(title, {
    x: titleX,
    y,
    size: titleSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  y -= titleSize + 10;

  // ---------- Einleitung ----------
  drawLine("Zwischen dem Verein", { size: 10, font: helvetica });
  drawLine("Jugendsport Wenau e.V.", {
    size: 10,
    font: helveticaBold,
  });
  drawLine('(im Folgenden „Verein“ genannt)', { size: 10 });

  y -= 5;

  drawLine("und dem Spieler", { size: 10 });
  drawLine(player.name, { size: 10, font: helveticaBold });
  drawLine('(im Folgenden „Spieler“ genannt)', { size: 10 });

  y -= 5;

  drawParagraph(
    `wird vereinbart, dass er in der ${FESTE_SAISON} als aktiver Spieler des Jugendsport Wenau e.V. der 1. Mannschaft tätig sein wird.`,
    { size: 10 }
  );

  y -= 5;

  // ---------- Prämiensystem ----------
  drawLine(`Prämiensystem: ${FESTE_SAISON}`, {
    size: 10,
    font: helveticaBold,
  });

  y -= 5;

  // ---------- Tabelle mit Konditionen ----------
  const tableTop = y;
  const col1Width = 250;
  const col2Width = 100;
  const rowHeight = 18;

  const rows = [
    ["Fahrtgeld (€)", Number(player.fahrtgeld || 0).toFixed(2)],
    ["Trainingsprämie (€)", Number(player.trainingspraemie || 0).toFixed(2)],
    ["Spielprämie (€)", Number(player.spielpraemie || 0).toFixed(2)],
    ["Siegprämie pro Spiel (!)", Number(player.siegpraemie || 0).toFixed(2)],
    ["Gehalt/Monat (€)", Number(player.gehalt_monat || 0).toFixed(2)],
    ["Gehalt/Jahr (€)", Number(player.gehalt_jahr || 0).toFixed(2)],
  ];

  // Tabellenrahmen
  const tableWidth = col1Width + col2Width;
  const tableHeight = rows.length * rowHeight;

  // horizontale Linien
  for (let i = 0; i <= rows.length; i++) {
    const yy = tableTop - i * rowHeight;
    page.drawLine({
      start: { x: marginLeft, y: yy },
      end: { x: marginLeft + tableWidth, y: yy },
      thickness: 0.6,
      color: rgb(0, 0, 0),
    });
  }

  // vertikale Linien
  page.drawLine({
    start: { x: marginLeft, y: tableTop },
    end: { x: marginLeft, y: tableTop - tableHeight },
    thickness: 0.6,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: marginLeft + col1Width, y: tableTop },
    end: { x: marginLeft + col1Width, y: tableTop - tableHeight },
    thickness: 0.6,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: marginLeft + tableWidth, y: tableTop },
    end: { x: marginLeft + tableWidth, y: tableTop - tableHeight },
    thickness: 0.6,
    color: rgb(0, 0, 0),
  });

  // Tabelleninhalt
  rows.forEach((row, i) => {
    const yy = tableTop - i * rowHeight - 5;

    page.drawText(row[0], {
      x: marginLeft + 4,
      y: yy,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    const valueText = row[1];
    const valueWidth = helveticaBold.widthOfTextAtSize(valueText, 9);
    const valueX = marginLeft + col1Width + col2Width - 4 - valueWidth;

    page.drawText(valueText, {
      x: valueX,
      y: yy,
      size: 9,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
  });

  // y unterhalb der Tabelle
  y = tableTop - tableHeight - 12;

  // ---------- Text unter der Tabelle ----------
  drawParagraph(
    "Als Ersatz für besondere Aufwendungen erhalten Torhüter einen Gutschein über 100,- €, falls sie am 01.02. noch im Aufgebot der Mannschaft stehen.",
    { size: 8 }
  );

  // ---------- Gehaltsschlüssel ----------
  drawLine("Gehaltsschlüssel", { size: 11, font: helveticaBold });
  drawParagraph(
    "Für das Gehalt pro Monat wird von 8 Trainingseinheiten und 4 Spielen im Monat ausgegangen.",
    { size: 10 }
  );

  // ---------- Trainingsprämie ----------
  drawLine("Trainingsprämie", { size: 11, font: helveticaBold });
  drawParagraph(
    "Absagen jeglicher Art zu Trainingseinheiten führen zum Verlust der jeweiligen Trainingsprämie.",
    { size: 10 }
  );

  // ---------- Spielprämie ----------
  drawLine("Spielprämie", { size: 11, font: helveticaBold });
  drawParagraph(
    "Spielprämien werden ab 1 Minute Spielzeit berechnet.",
    { size: 10 }
  );

  // ---------- Technischer Ablauf ----------
  drawLine("Technischer Ablauf für die Zahlungen", {
    size: 11,
    font: helveticaBold,
  });
  drawParagraph(
    "Die Zusammenstellung der aufwandsbezogenen Zahlungen für den Steuerberater findet monatlich statt. Die Prämien werden am Monatsende überwiesen.",
    { size: 10 }
  );

  // ---------- Besondere Vereinbarungen ----------
  drawLine("Besondere Vereinbarungen", {
    size: 11,
    font: helveticaBold,
  });
  drawParagraph(
    "Sollte es zu einer Kündigung durch den Spieler (Abmeldung vor dem 31.05.2027) kommen, wird eine Entschädigungszahlung an den Verein in Höhe der dreifachen Monats-Pauschale fällig.",
    { size: 10 }
  );
  drawParagraph(
    "Sollte es zu einer Kündigung seitens des Vereins kommen, ist der Verein von sämtlichen ausstehenden Gehaltszahlungen entbunden.",
    { size: 10 }
  );
  drawParagraph(
    "Diese Vereinbarung ist für die kommende Saison gültig. Es kann sein, dass eine redaktionelle Überarbeitung wegen zu erwartender Auswirkungen durch die Berufsgenossenschaft notwendig ist.",
    { size: 10 }
  );

  // ---------- Aussetzung Spielbetrieb ----------
  drawLine("Aussetzung des Spielbetriebs durch eine Anordnung", {
    size: 11,
    font: helveticaBold,
  });
  drawParagraph(
    "Sollte es durch besondere Gründe zu einer Aussetzung des Spielbetriebs kommen (z.B. Pandemie), wird der Verein für diesen Zeitraum keine Aufwandsentschädigungen zahlen.",
    { size: 10 }
  );
  drawParagraph(
    "Eine besondere finanzielle Entwicklung auf Vereinsebene berechtigt beide Seiten zur außerordentlichen Kündigung.",
    { size: 10 }
  );

  // ---------- Datum ----------
  const heute = new Date();
  const datumStr = heute.toLocaleDateString("de-DE");
  drawLine(`Wenau, den ${datumStr}`, { size: 10 });

  y -= 20;

  // ---------- Unterschriften ----------
  const sigWidth = 180;
  const sigY = y;

  // Spieler-Linie
  page.drawLine({
    start: { x: marginLeft, y: sigY },
    end: { x: marginLeft + sigWidth, y: sigY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText("Unterschrift Spieler", {
    x: marginLeft,
    y: sigY - 12,
    size: 10,
    font: helvetica,
  });

  // Vereins-Linie
  const rightX = width - marginRight - sigWidth;
  page.drawLine({
    start: { x: rightX, y: sigY },
    end: { x: rightX + sigWidth, y: sigY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText("Unterschrift Verein", {
    x: rightX,
    y: sigY - 12,
    size: 10,
    font: helvetica,
  });

  // ---------- PDF erzeugen & Download ----------
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${player.name}_Vertrag.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

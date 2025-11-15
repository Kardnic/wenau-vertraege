import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generatePlayerPDF(player) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 780;

  function text(txt, x = 50, size = 12, f = font) {
    page.drawText(txt, { x, y, size, font: f, color: rgb(0, 0, 0) });
    y -= size + 6;
  }

  // Titel
  text("Spielervertrag", 50, 24, bold);
  y -= 10;

  // Spieler-Daten
  text(`Spieler: ${player.name}`, 50, 14, bold);

  text(`Fahrtgeld: ${player.fahrtgeld.toFixed(2)} €`);
  text(`Trainingsprämie: ${player.trainingspraemie.toFixed(2)} €`);
  text(`Spielprämie: ${player.spielpraemie.toFixed(2)} €`);
  text(`Siegprämie: ${player.siegpraemie.toFixed(2)} €`);
  text(`Gehalt pro Monat: ${player.gehalt_monat.toFixed(2)} €`);
  text(`Gehalt pro Jahr: ${player.gehalt_jahr.toFixed(2)} €`);

  y -= 20;

  text("Saison 2026/27", 50, 14, bold);
  y -= 10;

  text(
    "Der Spieler verpflichtet sich für die oben genannte Saison für den Jugendsport Wenau e.V. zu spielen.",
    50
  );

  y -= 40;

  // Unterschriftenlinien
  text("_____________________________", 50);
  text("Unterschrift Spieler", 50, 10);

  y -= 40;

  text("_____________________________", 300);
  text("Unterschrift Verein", 300, 10);

  // PDF erzeugen
  const pdfBytes = await pdf.save();

  // Download
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${player.name}_Vertrag.pdf`;
  link.click();

  URL.revokeObjectURL(url);
}

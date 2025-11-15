//------------------------------------------------------------
// Excel Export
//------------------------------------------------------------

import { getPlayers } from "./db.js";

export async function exportExcel() {
    const players = await getPlayers();

    const sheet = [
        ["ID", "Name", "Fahrtgeld", "Trainingsprämie", "Spielprämie", "Siegprämie", "Monat", "Jahr"]
    ];

    players.forEach(p => {
        sheet.push([
            p.id,
            p.name,
            p.fahrtgeld,
            p.trainingspraemie,
            p.spielpraemie,
            p.siegpraemie,
            p.gehalt_monat,
            p.gehalt_jahr
        ]);
    });

    // XLSX Bibliothek dynamisch laden
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, "Spieler");

    XLSX.writeFile(wb, "Spielerverwaltung.xlsx");
}

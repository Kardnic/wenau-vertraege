//------------------------------------------------------------
// Excel Import
//------------------------------------------------------------

import { savePlayer } from "./db.js";

export async function importExcel(file) {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs");

    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer);
    const ws = wb.Sheets[wb.SheetNames[0]];

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Erste Zeile ist Kopf → überspringen
    const rows = data.slice(1);

    for (const r of rows) {
        if (!r[1]) continue;

        await savePlayer({
            name: r[1],
            fahrtgeld: parseFloat(r[2]) || 0,
            trainingspraemie: parseFloat(r[3]) || 0,
            spielpraemie: parseFloat(r[4]) || 0,
            siegpraemie: parseFloat(r[5]) || 0,
            gehalt_monat: parseFloat(r[6]) || 0,
            gehalt_jahr: parseFloat(r[7]) || 0
        });
    }

    return "Import abgeschlossen!";
}

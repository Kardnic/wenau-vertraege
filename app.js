// -----------------------------------------------------
//  IndexedDB Setup
// -----------------------------------------------------

const DB_NAME = "wenauVertraegeDB";
const DB_VERSION = 1;
const STORE_NAME = "spieler";

const ZIP_PASSWORD = "WenauerJungs1957!"; // festes ZIP Passwort

const saisonFilter = document.getElementById("saisonFilter");

// -----------------------------------------------------
//  Saison-Optionen generieren
// -----------------------------------------------------

function generateSaisonOptions(selectElement) {
  const currentYear = new Date().getFullYear();
  const start = currentYear - 1;
  const end = currentYear + 5;

  for (let y = start; y <= end; y++) {
    const saison = `${y}/${y + 1}`;
    const option = document.createElement("option");
    option.value = saison;
    option.textContent = saison;
    selectElement.appendChild(option);
  }
}

generateSaisonOptions(saisonFilter);
generateSaisonOptions(document.getElementById("saison")); // Formular Auswahl

// -----------------------------------------------------
//  IndexedDB Grundfunktionen
// -----------------------------------------------------

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("name", "name", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllPlayers() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function addPlayerToDB(player) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(player);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function updatePlayerInDB(player) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(player);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deletePlayerFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// -----------------------------------------------------
//  DOM Elemente / FormLogic
// -----------------------------------------------------

const fahrtgeldInput = document.getElementById("fahrtgeld");
const trainingsInput = document.getElementById("trainingspraemie");
const spielInput = document.getElementById("spielpraemie");
const monatInput = document.getElementById("gehalt_monat");
const jahrInput = document.getElementById("gehalt_jahr");

const formToggle = document.getElementById("formToggle");
const listToggle = document.getElementById("listToggle");
const formContainer = document.getElementById("formContainer");

let spielerData = [];
window.currentEditId = null;

let sortColumn = null;
let sortDirection = 1; // 1 = aufsteigend, -1 = absteigend

function sortTable(key) {
  // Richtung umkehren, falls gleiche Spalte erneut angeklickt wurde
  if (sortColumn === key) {
    sortDirection *=  -1;
  } else {
    sortColumn = key;
    sortDirection = 1;
  }

  spielerData.sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    // Numerisch sortieren, wenn beide Werte Zahlen sind
    if (!isNaN(valA) && !isNaN(valB)) {
      return (parseFloat(valA) - parseFloat(valB)) * sortDirection;
    }

    // Sonst alphabetisch
    return valA.toString().localeCompare(valB.toString()) * sortDirection;
  });

  renderSortedTable();
}

function renderSortedTable() {
  const tbody = document.getElementById("spielerBody");
  tbody.innerHTML = "";

  spielerData.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${Number(s.fahrtgeld || 0).toFixed(2)}</td>
      <td>${Number(s.trainingspraemie || 0).toFixed(2)}</td>
      <td>${Number(s.spielpraemie || 0).toFixed(2)}</td>
      <td>${Number(s.siegpraemie || 0).toFixed(2)}</td>
      <td>${Number(s.gehalt_monat || 0).toFixed(2)}</td>
      <td>${Number(s.gehalt_jahr || 0).toFixed(2)}</td>
      <td><button class="editBtn" data-id="${s.id}">✏️</button></td>
      <td><button class="deleteBtn" data-id="${s.id}">🗑️</button></td>
      <td><button class="contractBtn" data-id="${s.id}">📄</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Buttons neu verbinden
  addListenersToButtons();
}

function addListenersToButtons() {
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-id"));
      await deletePlayerFromDB(id);
      ladeSpieler();
    });
  });

  document.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-id"));
      const spieler = spielerData.find((p) => p.id === id);
      // ... dein Edit-Code
    });
  });

  document.querySelectorAll(".contractBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const s = spielerData.find((p) => p.id === id);
      generatePlayerPDF(s);
    });
  });
}


// -----------------------------------------------------
//  Gehalt berechnen
// -----------------------------------------------------

function berechneGehalt() {
  const fahrtgeld = parseFloat(fahrtgeldInput.value) || 0;
  const trainings = parseFloat(trainingsInput.value) || 0;
  const spiel = parseFloat(spielInput.value) || 0;

  const gehaltMonat = fahrtgeld + 8 * trainings + 4 * spiel;

  const saison = document.getElementById("saison").value;
  let gehaltJahr;

  if (saison === "2025/2026") {
    gehaltJahr = gehaltMonat * 5; // Sonderfall
  } else {
    gehaltJahr = gehaltMonat * 10;
  }

  monatInput.value = gehaltMonat.toFixed(2);
  jahrInput.value = gehaltJahr.toFixed(2);
}

fahrtgeldInput.addEventListener("input", berechneGehalt);
trainingsInput.addEventListener("input", berechneGehalt);
spielInput.addEventListener("input", berechneGehalt);

// -----------------------------------------------------
//  Accordion Öffnen / Schließen
// -----------------------------------------------------

formToggle.addEventListener("click", () => {
  formContainer.classList.toggle("open");
  formToggle.classList.toggle("open");
});
listToggle.addEventListener("click", () => {
  formContainer.classList.toggle("open");
  listToggle.classList.toggle("open");
});
// -----------------------------------------------------
//  Tabelle aktualisieren
// -----------------------------------------------------

async function ladeSpieler() {
  const allPlayers = await getAllPlayers();
  const activeSaison = saisonFilter.value;

  spielerData = allPlayers.filter(p => p.saison === activeSaison);

  const tbody = document.getElementById("spielerBody");
  tbody.innerHTML = "";

  if (spielerData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding:20px;">
          Noch keine Spieler für Saison ${activeSaison} gespeichert.
        </td>
      </tr>`;
    return;
  }

  spielerData.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${Number(s.fahrtgeld).toFixed(2)}</td>
      <td>${Number(s.trainingspraemie).toFixed(2)}</td>
      <td>${Number(s.spielpraemie).toFixed(2)}</td>
      <td>${Number(s.siegpraemie).toFixed(2)}</td>
      <td>${Number(s.gehalt_monat).toFixed(2)}</td>
      <td>${Number(s.gehalt_jahr).toFixed(2)}</td>
      <td><button class="editBtn" data-id="${s.id}">✏️</button></td>
      <td><button class="deleteBtn" data-id="${s.id}">🗑️</button></td>
      <td><button class="contractBtn" data-id="${s.id}">📄</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Bearbeiten
  document.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const s = spielerData.find(p => p.id === id);

      window.currentEditId = id;

      formContainer.classList.add("open");
      formToggle.classList.add("open");
      listToggle.classList.add("open");

      document.getElementById("name").value = s.name;
      document.getElementById("saison").value = s.saison;
      document.getElementById("fahrtgeld").value = s.fahrtgeld;
      document.getElementById("trainingspraemie").value = s.trainingspraemie;
      document.getElementById("spielpraemie").value = s.spielpraemie;
      document.getElementById("siegpraemie").value = s.siegpraemie;

      berechneGehalt();

      document.getElementById("status").innerText = "Bearbeite Spieler...";
    });
  });

  // Löschen
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      await deletePlayerFromDB(id);
      ladeSpieler();
    });
  });

  // Vertrag PDF
  document.querySelectorAll(".contractBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const s = spielerData.find(p => p.id === id);
      generatePlayerPDF(s);
    });
  });
}

saisonFilter.addEventListener("change", ladeSpieler);

// -----------------------------------------------------
//  Speichern
// -----------------------------------------------------

document.getElementById("spielerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    id: window.currentEditId || undefined,
    name: document.getElementById("name").value,
    saison: document.getElementById("saison").value,
    fahrtgeld: parseFloat(fahrtgeldInput.value) || 0,
    trainingspraemie: parseFloat(trainingsInput.value) || 0,
    spielpraemie: parseFloat(spielInput.value) || 0,
    siegpraemie: parseFloat(document.getElementById("siegpraemie").value) || 0,
    gehalt_monat: parseFloat(monatInput.value) || 0,
    gehalt_jahr: parseFloat(jahrInput.value) || 0,
  };

  if (!data.name.trim()) {
    document.getElementById("status").innerText = "❌ Bitte einen Namen eingeben";
    return;
  }

  if (data.id) {
    await updatePlayerInDB(data);
  } else {
    delete data.id;
    await addPlayerToDB(data);
  }

  formContainer.classList.remove("open");
  formToggle.classList.remove("open");
  listToggle.classList.remove("open");

  document.getElementById("spielerForm").reset();
  monatInput.value = "";
  jahrInput.value = "";
  window.currentEditId = null;

  ladeSpieler();
});

// -----------------------------------------------------
// ZIP Export mit Passwort
// -----------------------------------------------------

document.getElementById("exportBtn").addEventListener("click", async () => {
  const data = await getAllPlayers();
  if (!data.length) {
    alert("Keine Spieler vorhanden!");
    return;
  }

  // Excel in Speicher erzeugen
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Spieler");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  // ZIPWriter
  const writer = new zip.ZipWriter(
    new zip.BlobWriter("application/zip"),
    {
      password: ZIP_PASSWORD,
      encryptionStrength: 1 // ZipCrypto
    }
  );

  await writer.add(
    "Spielerverwaltung.xlsx",
    new zip.BlobReader(new Blob([excelBuffer]))
  );

  const zipBlob = await writer.close();

  // Download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zipBlob);
  link.download = "Spielerverwaltung_geschuetzt.zip";
  link.click();
});

// -----------------------------------------------------
//  Excel Import (ohne ZIP)
// -----------------------------------------------------

// ------- Excel Import -------
document.getElementById("importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);

    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Fallback-Saison
    const defaultSaison = "2025/2026";

    // Prüfen: Hat die Excel eine Saison-Spalte?
    const excelHatSaison = rows.length > 0 && Object.keys(rows[0]).includes("saison");

    // Falls keine Saison-Spalte existiert → hinzufügen
    rows.forEach(r => {
      if (!excelHatSaison) {
        r.saison = defaultSaison;
      } else {
        // Saison-Spalte existiert, aber Feld leer
        if (!r.saison || String(r.saison).trim() === "") {
          r.saison = defaultSaison;
        }
      }
    });

    // Alte DB löschen
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();

    // Neue Spieler speichern
    for (const r of rows) {
      delete r.id; // neue ID vergeben
      await addPlayerToDB(r);
    }

    document.getElementById("status").innerText = "📄 Excel erfolgreich importiert!";
    ladeSpieler();
  };

  reader.readAsArrayBuffer(file);
});


// -----------------------------------------------------
//  Start
// -----------------------------------------------------

ladeSpieler();
// Sortier-Events einmalig setzen
document.querySelectorAll("th.sortable").forEach(th => {
  th.addEventListener("click", () => {
    const key = th.getAttribute("data-key");
    sortTable(key);
  });
});

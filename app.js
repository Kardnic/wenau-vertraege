// ------- IndexedDB Setup -------

const DB_NAME = "wenauVertraegeDB";
const DB_VERSION = 1;
const STORE_NAME = "spieler";

const saisonFilter = document.getElementById("saisonFilter");

const ZIP_PASSWORD = "WenauerJungs1957!";   // Festes Passwort


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
generateSaisonOptions(document.getElementById("saison")); // Formular-Dropdown

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
        // optionale Indexe, falls irgendwann benötigt
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

// ------- DOM Elemente / Gehaltslogik -------

const fahrtgeldInput = document.getElementById("fahrtgeld");
const trainingsInput = document.getElementById("trainingspraemie");
const spielInput = document.getElementById("spielpraemie");
const monatInput = document.getElementById("gehalt_monat");
const jahrInput = document.getElementById("gehalt_jahr");

const formToggle = document.getElementById("formToggle");
const formContainer = document.getElementById("formContainer");

let spielerData = [];
window.currentEditId = null;

// Gehalt berechnen
function berechneGehalt() {
  const fahrtgeld = parseFloat(fahrtgeldInput.value) || 0;
  const trainings = parseFloat(trainingsInput.value) || 0;
  const spiel = parseFloat(spielInput.value) || 0;

  const gehaltMonat = fahrtgeld + 8 * trainings + 4 * spiel;

  // Saison aus dem Formular
  const saison = document.getElementById("saison").value;

  let gehaltJahr;

  // Spezialfall Saison 2025/2026
  if (saison === "2025/2026") {
    gehaltJahr = gehaltMonat * 5;
  } else {
    gehaltJahr = gehaltMonat * 10;
  }

  monatInput.value = gehaltMonat.toFixed(2);
  jahrInput.value = gehaltJahr.toFixed(2);
}



fahrtgeldInput.addEventListener("input", berechneGehalt);
trainingsInput.addEventListener("input", berechneGehalt);
spielInput.addEventListener("input", berechneGehalt);

// Accordion
formToggle.addEventListener("click", () => {
  formContainer.classList.toggle("open");
  formToggle.classList.toggle("open");
});

// ------- Tabelle rendern -------

async function ladeSpieler() {
  const allPlayers = await getAllPlayers();
  const activeSaison = document.getElementById("saisonFilter").value;

  // Spieler nach Saison filtern
  spielerData = allPlayers.filter(p => p.saison === activeSaison);

  const tbody = document.getElementById("spielerBody");
  tbody.innerHTML = "";

  if (!spielerData || spielerData.length === 0) {
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

  // DELETE
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-id"));
      await deletePlayerFromDB(id);
      document.getElementById("status").innerText = "✅ Spieler gelöscht";
      ladeSpieler();
    });
  });

  // EDIT
  document.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      formContainer.classList.add("open");
      formToggle.classList.add("open");

      const id = Number(btn.getAttribute("data-id"));
      const spieler = spielerData.find((p) => p.id === id);
      if (!spieler) return;

      document.getElementById("name").value = spieler.name;
      document.getElementById("fahrtgeld").value = spieler.fahrtgeld;
      document.getElementById("trainingspraemie").value = spieler.trainingspraemie;
      document.getElementById("spielpraemie").value = spieler.spielpraemie;
      document.getElementById("siegpraemie").value = spieler.siegpraemie;
      document.getElementById("saison").value = spieler.saison;

      berechneGehalt();

      window.currentEditId = id;
      document.getElementById("status").innerText = "Bearbeite Spieler...";
    });
  });

  // CONTRACT
  document.querySelectorAll(".contractBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const s = spielerData.find((p) => p.id === id);
      if (!s) return;
      generatePlayerPDF(s);
    });
  });
}



// ------- Speichern Formular -------

document
  .getElementById("spielerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      id: window.currentEditId || undefined,
      name: document.getElementById("name").value,
      saison: document.getElementById("saison").value,
      fahrtgeld: parseFloat(fahrtgeldInput.value) || 0,
      trainingspraemie: parseFloat(trainingsInput.value) || 0,
      spielpraemie: parseFloat(spielInput.value) || 0,
      siegpraemie: parseFloat(
        document.getElementById("siegpraemie").value
      ) || 0,
      gehalt_monat: parseFloat(monatInput.value) || 0,
      gehalt_jahr: parseFloat(jahrInput.value) || 0,
    };

    if (!data.name.trim()) {
      document.getElementById("status").innerText =
        "❌ Bitte einen Namen eingeben";
      return;
    }

    if (data.id) {
      await updatePlayerInDB(data);
      document.getElementById("status").innerText =
        "✅ Spieler wurde aktualisiert";
    } else {
      delete data.id; // wichtig, damit IndexedDB neue ID vergibt
      await addPlayerToDB(data);
      document.getElementById("status").innerText =
        "✅ Spieler erfolgreich gespeichert";
    }

    // Formular schließen
    formContainer.classList.remove("open");
    formToggle.classList.remove("open");

    // Formular reset
    document.getElementById("spielerForm").reset();
    monatInput.value = "";
    jahrInput.value = "";
    window.currentEditId = null;

    ladeSpieler();
  });

/// ------- Excel Export -------

document.getElementById("exportBtn").addEventListener("click", async () => {
  const data = await getAllPlayers();

  if (!data.length) {
    alert("Keine Spieler vorhanden!");
    return;
  }

  // XLSX erzeugen
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Spieler");

  const xlsxBinary = XLSX.write(wb, {
    bookType: "xlsx",
    type: "binary"
  });

  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }

  const xlsxArray = s2ab(xlsxBinary);

  // ZIP erzeugen
  const zip = new JSZip();
  zip.file("Spielerverwaltung.xlsx", xlsxArray);

  zip.generateAsync({ type: "blob" }).then((zipBlob) => {

    // AES verschlüsseln (Binary → WordArray)
    const reader = new FileReader();
    reader.onload = function () {
      const wordArray = CryptoJS.lib.WordArray.create(reader.result);
      const encrypted = CryptoJS.AES.encrypt(wordArray, ZIP_PASSWORD).toString();

      const encryptedBlob = new Blob([encrypted], { type: "text/plain" });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(encryptedBlob);
      a.download = "Spielerverwaltung_geschuetzt.zip";  // <<< OHNE .enc
      a.click();
    };

    reader.readAsArrayBuffer(zipBlob);
  });

  document.getElementById("status").innerText =
    "🔐 ZIP erfolgreich exportiert und passwortgeschützt!";
});


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


// ------- Start -------

ladeSpieler();

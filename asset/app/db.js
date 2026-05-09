const DATA_API = "/api/data";

async function addOrUpdateData(key, data) {
  const typeMap = { component: "components", site: "sites", lib: "libs" };
  const type = typeMap[key];
  if (!type) throw new Error("Type inconnu: " + key);

  const resp = await fetch(`${DATA_API}/${type}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Erreur sauvegarde");
  console.log("Données sauvegardées:", key);
}

async function loadData(key) {
  const typeMap = { component: "components", site: "sites", lib: "libs" };
  const type = typeMap[key];
  if (!type) throw new Error("Type inconnu: " + key);

  const resp = await fetch(`${DATA_API}/${type}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  return Object.keys(data).length > 0 ? data : null;
}

async function resetAllData() {
  const resp = await fetch("/api/data", { method: "DELETE" });
  return resp.ok;
}

async function exportQSWB() {
  const resp = await fetch("/api/export");
  const blob = await resp.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `qswb-export-${Date.now()}.qswb`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importQSWB(file) {
  const text = await file.text();
  const resp = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
  if (!resp.ok) throw new Error("Échec import");
  return await resp.json();
}

const SETTINGS_KEY = "qswb_settings";

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  document.querySelectorAll(`input[name="theme"]`).forEach(el => {
    el.checked = el.value === theme;
  });
}

function applySettings() {
  const s = loadSettings();
  if (s.theme) applyTheme(s.theme);
  const mode = s.autosaveMode || "interval";
  document.querySelectorAll('input[name="autosave"]').forEach(el => {
    el.checked = el.value === mode;
  });
  document.getElementById("autosave-interval").value = s.autosaveInterval || 30;
  toggleAutosaveIntervalConfig(mode === "interval");

}

function toggleAutosaveIntervalConfig(show) {
  document.getElementById("autosave-interval-config").classList.toggle("d-none", !show);
}

document.addEventListener("DOMContentLoaded", applySettings);

document.querySelectorAll('input[name="theme"]').forEach(el => {
  el.addEventListener("change", function () {
    if (this.checked) {
      const s = loadSettings();
      s.theme = this.value;
      saveSettings(s);
      applyTheme(this.value);
    }
  });
});

document.querySelectorAll('input[name="autosave"]').forEach(el => {
  el.addEventListener("change", function () {
    if (this.checked) {
      const s = loadSettings();
      s.autosaveMode = this.value;
      saveSettings(s);
      toggleAutosaveIntervalConfig(this.value === "interval");
    }
  });
});

document.getElementById("autosave-interval").addEventListener("change", function () {
  const s = loadSettings();
  s.autosaveInterval = parseInt(this.value) || 30;
  saveSettings(s);
});


function confirmReset() {
  document.getElementById("reset-confirm").classList.remove("d-none");
}

function cancelReset() {
  document.getElementById("reset-confirm").classList.add("d-none");
}

async function executeReset() {
  if (!(await showConfirm("Confirmez-vous la réinitialisation complète ? Toutes les données seront perdues."))) return;
  try {
    await resetAllData();
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.clear();
    notify("Application réinitialisée. La page va se recharger.", "success");
    location.href = "/";
  } catch (e) {
    notify("Erreur lors de la réinitialisation: " + e.message, "error");
  }
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const result = await importQSWB(file);
    notify(result.message || "Import réussi ! Rechargez la page pour voir les données.", "success");
    location.reload();
  } catch (e) {
    notify("Erreur import: " + e.message, "error");
  }
}

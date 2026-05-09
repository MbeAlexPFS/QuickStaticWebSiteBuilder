// site/site-elements.js
// Element selection, tree manipulation, params (from make_site.js)

function setRoot() {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  const root = findElementById(page.data, selectedElement)["param"][
    elPageEditor.emptyParam.value
  ][2];
  if (!Array.isArray(root)) {
    findElementById(page.data, selectedElement)["param"][
      elPageEditor.emptyParam.value
    ][2] = [];
  }

  componentRootID = [
    selectedElement,
    elPageEditor.emptyParam.value,
    selectedPage,
  ];
  selectedElement = "";
  renderPageSelector();
  updatePageForm();
  show("page", page.name);
}

elPageEditor.toInitRoot.onclick = () => {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  componentRootID = [];
  updatePageForm();
  show("page", page.name);
};

function findElementAndParent(
  dataArray = [],
  idToFind,
  parent = null,
  paramKey = null,
) {
  for (let i = 0; i < dataArray.length; i++) {
    const el = dataArray[i];
    if (el.id === idToFind)
      return { parentArray: dataArray, index: i, parent, paramKey };
    for (const key of Object.keys(el.param || {})) {
      const [label, type, value] = el.param[key];
      if (type === "empty" && Array.isArray(value)) {
        const result = findElementAndParent(value, idToFind, el, key);
        if (result) return result;
      }
    }
  }
  return null;
}

if (elPageEditor.anim) {
  elPageEditor.anim.oninput = () => {
    const page = sitePages.find((pg) => pg.name === selectedPage);
    if (!page) return;
    const selectedEl = findElementById(page.data, selectedElement);
    if (!selectedEl) return;
    selectedEl.anim = elPageEditor.anim.value;
    updatePageForm();
  };
}

function copieElement() {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  const selectedEl = findElementById(page.data, selectedElement);
  if (!selectedEl) return;
  const deepCopy = JSON.parse(JSON.stringify(selectedEl));
  copiedElement = [selectedElement, deepCopy];
  updatePageForm();
}

function cancelCopie() {
  copiedElement = [];
  updatePageForm();
}

function makeComponentInstance(componentName) {
  const cpn = JSON.parse(JSON.stringify(componentData[componentName]));
  cpn.id = ``;
  cpn.tagName = componentName;
  cpn.component = componentName;
  cpn.anim = "none";
  return cpn;
}

function addRootStart(paste = false) {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const instance = paste
    ? JSON.parse(JSON.stringify(copiedElement[1]))
    : makeComponentInstance(selectedComponent);
  if (componentRootID.length === 0) {
    page.data.unshift(instance);
  } else {
    const root = findElementById(page.data, componentRootID[0])["param"][
      componentRootID[1]
    ][2];
    root.unshift(instance);
  }

  updatePageForm();
  show("page", page.name);
}

function addRootEnd(paste = false) {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const instance = paste
    ? JSON.parse(JSON.stringify(copiedElement[1]))
    : makeComponentInstance(selectedComponent);
  if (componentRootID.length === 0) {
    page.data.push(instance);
  } else {
    const root = findElementById(page.data, componentRootID[0])["param"][
      componentRootID[1]
    ][2];
    root.push(instance);
  }
  updatePageForm();
  show("page", page.name);
}

function addBefore(paste = false) {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const found = findElementAndParent(page.data, selectedElement);
  if (!found) return;
  const instance = paste
    ? JSON.parse(JSON.stringify(copiedElement[1]))
    : makeComponentInstance(selectedComponent);
  found.parentArray.splice(found.index, 0, instance);
  updatePageForm();
}

function addAfter(paste = false) {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const found = findElementAndParent(page.data, selectedElement);
  if (!found) return;
  const instance = paste
    ? JSON.parse(JSON.stringify(copiedElement[1]))
    : makeComponentInstance(selectedComponent);
  found.parentArray.splice(found.index + 1, 0, instance);
  updatePageForm();
}

function addIn(paste = false) {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const selectedEl = findElementById(page.data, selectedElement);
  const emptyTarget = elPageEditor.emptyParam.value;
  if (
    !selectedEl ||
    !emptyTarget ||
    selectedEl.param[emptyTarget][1] !== "empty"
  )
    return;
  if (!Array.isArray(selectedEl.param[emptyTarget][2]))
    selectedEl.param[emptyTarget][2] = [];
  const targetArray = selectedEl.param[emptyTarget][2];
  const insertIndex = Math.min(2, targetArray.length);
  const instance = paste
    ? JSON.parse(JSON.stringify(copiedElement[1]))
    : makeComponentInstance(selectedComponent);
  targetArray.splice(insertIndex, 0, instance);
  updatePageForm();
}

function delElement() {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const found = findElementAndParent(page.data, selectedElement);
  if (!found) return;
  found.parentArray.splice(found.index, 1);
  if (selectedElement === copiedElement[0]) copiedElement = [];
  selectedElement = null;
  updatePageForm();
  show("page", page.name);
}

function submitParam() {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const found = findElementById(page.data, selectedElement);
  if (!found) return;
  for (const param of Object.keys(found.param || {})) {
    if (found.param[param][1] !== "empty") {
      if (found.param[param][1] === "list") {
        found.param[param][3] = document.querySelector(
          `#param-data-${param}`,
        ).value;
      } else {
        let val = document.querySelector(`#param-data-${param}`).value;
        if (found.param[param][1] === "ressource" && val && !val.startsWith('/')) val = '/' + val;
        found.param[param][2] = val;
      }
    }
  }
  updatePageForm();
}

// ========================== Médias du projet ============================= //

async function refreshMediaList() {
  await refreshMediaCache($("#site-name").value.trim());
}

async function uploadMedia() {
  const siteName = $("#site-name").value.trim();
  if (!siteName) return notify("Sauvegardez d'abord le projet.", "warning");
  const input = document.getElementById("media-upload-input");
  if (!input) return;
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function () {
    const base64 = reader.result.split(",")[1];
    try {
      const r = await fetch("/api/project/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_name: siteName, filename: file.name, content: base64 }),
      });
      if (!r.ok) throw new Error("Upload échoué");
      input.value = "";
      await refreshMediaList();
      await resourceRefreshList();
      notify("Fichier uploadé", "success");
    } catch (e) { notify("Erreur upload: " + e.message, "error"); }
  };
  reader.readAsDataURL(file);
}

async function deleteMedia(filename) {
  const siteName = $("#site-name").value.trim();
  if (!siteName || !(await showConfirm(`Supprimer ${filename} ?`))) return;
  try {
    await fetch(`/api/project/ressource/${encodeURIComponent(siteName)}/${encodeURIComponent(filename)}`, { method: "DELETE" });
    await refreshMediaList();
    await resourceRefreshList();
  } catch (e) { notify("Erreur suppression", "error"); }
}

// Cache de la liste des médias pour usage synchrone
let mediaCache = {};

async function refreshMediaCache(siteName) {
  if (!siteName) { mediaCache = {}; return; }
  try {
    const r = await fetch(`/api/project/ressources/${encodeURIComponent(siteName)}`);
    if (!r.ok) throw new Error();
    mediaCache = { siteName, files: await r.json() };
  } catch (e) { mediaCache = { siteName, files: [] }; }
}

// ====================== CRUD Ressources (Configuration du site) ========================== //

function getFileTypeMeta(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','svg','webp','ico','bmp'].includes(ext)) return { icon: 'bi-file-image', label: 'Image', color: 'text-info' };
  if (['mp4','webm','avi','mov','mkv','ogv'].includes(ext)) return { icon: 'bi-file-play', label: 'Vidéo', color: 'text-warning' };
  if (['mp3','wav','ogg','flac','aac','m4a','wma'].includes(ext)) return { icon: 'bi-file-music', label: 'Audio', color: 'text-success' };
  if (['pdf'].includes(ext)) return { icon: 'bi-file-pdf', label: 'PDF', color: 'text-danger' };
  if (['doc','docx'].includes(ext)) return { icon: 'bi-file-word', label: 'Document', color: 'text-primary' };
  if (['zip','rar','7z','tar','gz'].includes(ext)) return { icon: 'bi-file-zip', label: 'Archive', color: 'text-secondary' };
  if (['js','ts','py','html','css','json','xml','php'].includes(ext)) return { icon: 'bi-file-code', label: 'Code', color: 'text-secondary' };
  return { icon: 'bi-file-earmark', label: 'Fichier', color: 'text-secondary' };
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1048576).toFixed(1) + ' Mo';
}

function getMediaPreviewHTML(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const imgExts = ['png','jpg','jpeg','gif','svg','webp','ico','bmp'];
  const audioExts = ['mp3','wav','ogg','flac','aac','m4a','wma'];
  const videoExts = ['mp4','webm','avi','mov','mkv','ogv'];

  if (imgExts.includes(ext)) return `<a href="${file.url}" target="_blank"><img src="${file.url}" alt="${file.name}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;"></a>`;
  if (audioExts.includes(ext)) return `<audio src="${file.url}" controls style="width:120px;height:32px;"></audio>`;
  if (videoExts.includes(ext)) return `<a href="${file.url}" target="_blank"><video src="${file.url}" style="width:80px;height:48px;object-fit:cover;border-radius:4px;"></video></a>`;
  const meta = getFileTypeMeta(file.name);
  return `<i class="bi ${meta.icon} ${meta.color}" style="font-size:1.8rem;"></i>`;
}

async function resourceRefreshList() {
  const siteName = $("#site-name").value.trim();
  const list = $("#media-crud-list");
  const empty = $("#media-crud-empty");
  const unsaved = $("#media-panel-unsaved");
  const ready = $("#media-panel-ready");

  if (!siteName) {
    unsaved.classList.remove("d-none");
    ready.classList.add("d-none");
    return;
  }
  unsaved.classList.add("d-none");
  ready.classList.remove("d-none");

  await refreshMediaCache(siteName);
  const files = (mediaCache.siteName === siteName) ? mediaCache.files : [];
  empty.classList.toggle("d-none", files.length > 0);
  list.innerHTML = files.map(f => {
      const meta = getFileTypeMeta(f.name);
      return `<tr>
        <td class="align-middle">${getMediaPreviewHTML(f)}</td>
        <td class="align-middle small text-break">${f.name}</td>
        <td class="align-middle small"><span class="${meta.color}"><i class="bi ${meta.icon} me-1"></i>${meta.label}</span></td>
        <td class="align-middle small text-muted">${formatFileSize(f.size)}</td>
        <td class="align-middle">
          <div class="d-flex gap-1">
            <button class="btn btn-outline-primary btn-sm py-0" onclick="resourceRenameMedia('${escapeQuotes(f.name)}')" title="Renommer"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm py-0" onclick="resourceDeleteMedia('${escapeQuotes(f.name)}')" title="Supprimer"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join("");
}

async function resourceUploadMedia() {
  const siteName = $("#site-name").value.trim();
  if (!siteName) return notify("Sauvegardez d'abord le site.", "warning");
  const input = document.getElementById("media-upload-input-crud");
  const file = input.files[0];
  if (!file) return notify("Sélectionnez un fichier.", "warning");
  const reader = new FileReader();
  reader.onload = async function () {
    try {
      const base64 = reader.result.split(",")[1];
      const r = await fetch("/api/project/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_name: siteName, filename: file.name, content: base64 }),
      });
      if (!r.ok) throw new Error("Upload échoué");
      const data = await r.json();
      input.value = "";
      await resourceRefreshList();
      await refreshMediaList();
      const savedName = data.finalName || file.name;
      const msg = savedName !== file.name ? `Fichier importé sous le nom "${savedName}" (déjà existant)` : "Fichier importé";
      notify(msg, "success");
    } catch (e) { notify("Erreur upload: " + e.message, "error"); }
  };
  reader.readAsDataURL(file);
}

async function resourceDeleteMedia(filename) {
  const siteName = $("#site-name").value.trim();
  if (!siteName || !(await showConfirm(`Supprimer "${filename}" ?`))) return;
  try {
    await fetch(`/api/project/ressource/${encodeURIComponent(siteName)}/${encodeURIComponent(filename)}`, { method: "DELETE" });
    await resourceRefreshList();
    await refreshMediaList();
    notify("Fichier supprimé", "success");
  } catch (e) { notify("Erreur suppression", "error"); }
}

async function resourceRenameMedia(oldName) {
  const siteName = $("#site-name").value.trim();
  if (!siteName) return;
  const newName = await showPrompt(`Nouveau nom pour "${oldName}" :`, oldName);
  if (!newName || newName === oldName) return;
  if (newName.includes('/') || newName.includes('\\')) return notify("Le nom ne peut pas contenir de séparateurs de dossier.", "warning");
  try {
    const r = await fetch("/api/project/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_name: siteName, old_name: oldName, new_name: newName }),
    });
    if (!r.ok) { const err = await r.text(); throw new Error(err); }
    const data = await r.json();
    await resourceRefreshList();
    await refreshMediaList();
    const savedName = data.finalName || newName;
    const msg = savedName !== newName ? `Fichier renommé en "${savedName}" (déjà existant)` : "Fichier renommé";
    notify(msg, "success");
  } catch (e) { notify("Erreur renommage: " + e.message, "error"); }
}

// Listen for site-name changes and page loads to toggle media panel visibility
document.addEventListener("DOMContentLoaded", () => {
  const siteInput = $("#site-name");
  if (siteInput) siteInput.addEventListener("input", () => resourceRefreshList());
});

function selectElement(idVal) {
  selectedElement = idVal;
  updatePageForm();
}

// ========================== Rafraîchir les instances de composants ============================= //

async function refreshComponentInstances() {
  if (!componentData || Object.keys(componentData).length === 0) {
    return notify("Aucun composant dans la base. Créez des composants d'abord.", "warning");
  }
  if (sitePages.length === 0) {
    return notify("Aucune page dans le site.", "warning");
  }

  let updatedCount = 0;

  function syncElementFromComponent(el) {
    const compName = el.component;
    if (!compName || !componentData[compName]) return false;

    const compDef = componentData[compName];
    let changed = false;

    if (el["html-code"] !== compDef["html-code"]) {
      el["html-code"] = compDef["html-code"];
      changed = true;
    }
    if (el["css-code"] !== compDef["css-code"]) {
      el["css-code"] = compDef["css-code"];
      changed = true;
    }
    if (el["js-code"] !== compDef["js-code"]) {
      el["js-code"] = compDef["js-code"];
      changed = true;
    }

    const oldParams = el.param || {};
    const newParams = {};

    for (const [key, paramDef] of Object.entries(compDef.param || {})) {
      if (oldParams[key]) {
        const oldVal = oldParams[key];
        const defType = paramDef[1];
        const defLabel = paramDef[0];

        if (defType === "empty") {
          newParams[key] = [defLabel, "empty"];
          if (Array.isArray(oldVal[2])) {
            for (const child of oldVal[2]) {
              if (syncElementFromComponent(child)) changed = true;
            }
          }
          if (Array.isArray(oldVal[2])) {
            newParams[key] = [defLabel, "empty", oldVal[2]];
          }
        } else if (defType === "list") {
          const userSelection = oldVal[3];
          const validChoices = paramDef[2] || [];
          if (validChoices.includes(userSelection)) {
            newParams[key] = [defLabel, defType, [...validChoices], userSelection];
          } else {
            newParams[key] = [defLabel, defType, [...validChoices], paramDef[3] || (validChoices[0] || "")];
          }
        } else if (defType === "ressource") {
          let url = oldVal[2] || "";
          if (url && !url.startsWith('/')) url = '/' + url;
          newParams[key] = [defLabel, defType, url];
        } else {
          newParams[key] = [defLabel, defType, oldVal[2]];
        }
      } else {
        newParams[key] = [...paramDef];
      }
    }

    if (Object.keys(oldParams).length !== Object.keys(newParams).length || JSON.stringify(oldParams) !== JSON.stringify(newParams)) {
      el.param = newParams;
      changed = true;
    }

    return changed;
  }

  function traversePageData(dataArray) {
    for (const el of dataArray) {
      if (syncElementFromComponent(el)) updatedCount++;
      for (const key of Object.keys(el.param || {})) {
        if (el.param[key][1] === "empty" && Array.isArray(el.param[key][2])) {
          traversePageData(el.param[key][2]);
        }
      }
    }
  }

  for (const page of sitePages) {
    traversePageData(page.data);
  }

  await resourceRefreshList();
  updatePageForm();
  if (selectedPage) show("page", selectedPage);
  updateComponentSelector();
  notify(`${updatedCount} instance(s) de composant mise(s) à jour.`, "success");
}

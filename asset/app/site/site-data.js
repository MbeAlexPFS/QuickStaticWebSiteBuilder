// site/site-data.js
// Site CRUD, page CRUD, global code CRUD (from make_site.js)

// ============================ Sauvegarde du site ============================ //
async function saveSite() {
  const site = {
    name: $("#site-name").value.trim(),
    desc: $("#site-desc").value.trim(),
    lang: $("#site-lang").value.trim(),
    meta: $("#site-meta").value.trim(),
    lib: library,
    js: globalJSFiles,
    css: globalCSSFiles,
    content: sitePages,
  };

  if (!site.name) return notify("veuillez assigner un nom au site", "warning");
  const data = (await loadData("site")) || {};

  const editingNull = sessionStorage.getItem("editsite") === "null";
  if (Object.keys(data).includes(site.name) && editingNull) {
    if (!(await showConfirm("Un site avec ce nom existe déjà. Écraser ? Pour une meilleure expérience, ouvrez le site existant depuis la liste des sites."))) return;
  }

  data[site.name] = site;
  await addOrUpdateData("site", data);

  // Create project folder structure
  await saveProjectData(site.name, site);

  notify("Site sauvegardé", "success");
}

async function saveProjectData(siteName, siteData) {
  try {
    await fetch("/api/project/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_name: siteName, data: siteData }),
    });
  } catch (e) {
    console.error("Erreur création projet:", e);
  }
}

async function siteExists(siteName) {
  try {
    const r = await fetch(`/project/${encodeURIComponent(siteName)}/data.json`);
    return r.status === 200;
  } catch { return false; }
}

// ============================ Page Selector ============================ //
function renderPageSelector() {
  const elPageSelector = $("#page-selector");
  const previewName = $("#page-name-editing");

    elPageSelector.innerHTML = sitePages
    .map(
      (pg) =>
        `<button type="button" class="btn btn-sm ${
          pg.name === selectedPage ? "btn-warning" : "btn-outline-danger"
        }" onclick="show('page','${escapeQuotes(pg.name)}')"><i class="bi bi-file-earmark"></i> ${pg.name}${
          componentRootID.length > 0
            ? " <i class='bi bi-chevron-right'></i> " + componentRootID[0] + "." + componentRootID[1]
            : ""
        }</button>`,
    )
    .join("");

  previewName.textContent = selectedPage;
}

// helper: build lib inclusion html (simple)
function buildLibInclusionHTML(libMapOrArray, libDataRef) {
  if (!libMapOrArray) return "";
  const keys = Array.isArray(libMapOrArray)
    ? libMapOrArray
    : Object.keys(libMapOrArray);
  return keys
    .flatMap((lib_name) =>
      Object.keys(libDataRef || {}).map((key) =>
        key === lib_name
          ? libDataRef[key].type
            ? libDataRef[key].link
            : libDataRef[key].file
          : "",
      ),
    )
    .join("");
}

// ============================ JS ============================ //
function addGlobalCodeJS() {
  const nameInput = id("global-js-name");
  const contentInput = id("global-js-content");
  const name = nameInput.value.trim();
  const content = contentInput.value.trim();

  if (!name || !content) return notify("Remplir tous les champs JS", "warning");
  if (globalJSFiles.find((g) => g.name === name))
    return notify("Cet script existe déjà", "warning");

  globalJSFiles.push({ id: Date.now(), name, content });
  renderGlobalCodeJS();
  nameInput.value = "";
  contentInput.value = "";
  renderPages();
}

function deleteGlobalCodeJS(idVal) {
  const idx = globalJSFiles.findIndex((f) => f.id === idVal);
  if (idx === -1) return;
  const fileName = globalJSFiles[idx].name;
  for (const page of sitePages) delete page.include["js"][fileName];
  globalJSFiles.splice(idx, 1);
  renderGlobalCodeJS();
  renderPages();
}

function renderGlobalCodeJS() {
  const tbody = id("globalCodeJSList");
  tbody.innerHTML = "";
  for (const file of globalJSFiles) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${file.name}</td>
      <td>
        <div class="input-block w-100">
          <textarea style="white-space: pre-wrap;" id="code-js-content-${
            file.id
          }">${file.content}</textarea>
          <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier javascript : ${escapeQuotes(
            file.name,
          )}','#code-js-content-${file.id}')"><i class="bi bi-arrows-angle-expand"></i></button>
        </div>
      </td>
      <td>
        <button class="btn btn-outline-primary btn-sm" onclick="updateGlobalCodeJS(${
          file.id
        })"><i class="bi bi-check-lg"></i></button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteGlobalCodeJS(${
          file.id
        })"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
}

function updateGlobalCodeJS(idVal) {
  const data = document.querySelector(`#code-js-content-${idVal}`).value;
  const index = globalJSFiles.findIndex((f) => f.id === idVal);
  if (index !== -1) {
    globalJSFiles[index].content = data;
    renderGlobalCodeJS();
    renderPages();
    notify("fichier js global mis à jour avec succès", "success");
  }
}

// ============================ CSS ============================ //
function addGlobalCodeCSS() {
  const name = id("global-css-name").value.trim();
  const content = id("global-css-content").value.trim();

  if (!name || !content) return notify("Remplir tous les champs CSS", "warning");
  if (globalCSSFiles.find((g) => g.name === name))
    return notify("Cet style existe déjà", "warning");

  globalCSSFiles.push({ id: Date.now(), name, content });
  renderGlobalCodeCSS();
  id("global-css-name").value = "";
  id("global-css-content").value = "";
  renderPages();
}

function deleteGlobalCodeCSS(idVal) {
  const idx = globalCSSFiles.findIndex((f) => f.id === idVal);
  if (idx === -1) return;
  const fileName = globalCSSFiles[idx].name;
  for (const page of sitePages) delete page.include["css"][fileName];
  globalCSSFiles.splice(idx, 1);
  renderGlobalCodeCSS();
  renderPages();
}

function renderGlobalCodeCSS() {
  const tbody = id("globalCodeCSSList");
  tbody.innerHTML = "";
  for (const file of globalCSSFiles) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${file.name}</td>
      <td>
        <div class="input-block w-100">
          <textarea style="white-space: pre-wrap;" id="code-css-content-${
            file.id
          }">${file.content}</textarea>
          <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier css : ${escapeQuotes(
            file.name,
          )}','#code-css-content-${file.id}')"><i class="bi bi-arrows-angle-expand"></i></button>
        </div>
      </td>
      <td>
        <button class="btn btn-outline-primary btn-sm" onclick="updateGlobalCodeCSS(${
          file.id
        })"><i class="bi bi-check-lg"></i></button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteGlobalCodeCSS(${
          file.id
        })"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
}

function updateGlobalCodeCSS(idVal) {
  const data = document.querySelector(`#code-css-content-${idVal}`).value;
  const index = globalCSSFiles.findIndex((f) => f.id === idVal);
  if (index !== -1) {
    globalCSSFiles[index].content = data;
    renderGlobalCodeCSS();
    renderPages();
    notify("fichier css global mis à jour avec succès", "success");
  }
}

// ============================ Pages ============================ //
function addPage() {
  const name = id("page-name").value.trim();
  const title = id("page-title").value.trim();
  const js = id("page-js").value.trim();
  const css = id("page-css").value.trim();

  if (!name || !title)
    return notify("Nom du fichier et titre de la page obligatoires", "warning");
  if (sitePages.find((pg) => pg.name === name))
    return notify("Cette page existe déjà", "warning");

  const page = {
    id: Date.now(),
    name,
    title,
    js,
    css,
    include: { lib: {}, js: {}, css: {}, "lib-required": [] },
    data: [],
  };

  sitePages.push(page);
  renderPages();
  renderPageSelector();
  id("page-name").value = "";
  id("page-title").value = "";
  id("page-js").value = "";
  id("page-css").value = "";
  triggerAutosave();
}

function deletePage(idVal) {
  const idx = sitePages.findIndex((p) => p.id === idVal);
  if (idx === -1) return;
  sitePages.splice(idx, 1);
  renderPages();
  renderPageSelector();
  triggerAutosave();
}

function renderPages() {
  const tbody = id("page-list");
  tbody.innerHTML = "";

  for (const page of sitePages) {
    const libs = [...new Set([...library, ...Array.from(requiredLibrary)])]
      .map(
        (lib) => `
          <div class="form-check">
            <input class="form-check-input" id="page-${
              page.name
            }-lib-${lib}" type="checkbox" ${
              page.include["lib-required"].includes(lib)
                ? "checked disabled"
                : Object.keys(page.include.lib || {}).includes(lib)
                  ? "checked"
                  : ""
            } onchange="addInclude('${escapeQuotes(page.name)}', '${escapeQuotes(
              lib,
            )}', 'lib')" />
            <label class="form-check-label">${lib} ${
              !Object.keys(libData).includes(lib)
                ? "(absente dans la base)"
                : ""
            }</label>
          </div>`,
      )
      .join("");

    const jsCheckboxes = globalJSFiles
      .map(
        (gljs) => `
          <div class="form-check">
            <input class="form-check-input" id="page-${page.name}-js-${
              gljs.name
            }" type="checkbox" ${
              Object.keys(page.include.js || {}).includes(gljs.name)
                ? "checked"
                : ""
            } onchange="addInclude('${escapeQuotes(page.name)}', '${escapeQuotes(
              gljs.name,
            )}', 'js')" />
            <label class="form-check-label">${gljs.name}</label>
          </div>`,
      )
      .join("");

    const cssCheckboxes = globalCSSFiles
      .map(
        (glcss) => `
          <div class="form-check">
            <input class="form-check-input" id="page-${page.name}-css-${
              glcss.name
            }" type="checkbox" ${
              Object.keys(page.include.css || {}).includes(glcss.name)
                ? "checked"
                : ""
            } onchange="addInclude('${escapeQuotes(page.name)}', '${escapeQuotes(
              glcss.name,
            )}', 'css')" />
            <label class="form-check-label">${glcss.name}</label>
          </div>`,
      )
      .join("");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${page.name}</td>
      <td>${page.title}</td>
      <td>
        <div class="input-block w-100">
          <textarea style="white-space: pre-wrap;" id="code-js-page-${
            page.id
          }">${page.js}</textarea>
          <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier javascript de la page : ${escapeQuotes(
            page.name,
          )}','#code-js-page-${page.id}')">+</button>
        </div>
      </td>
      <td>
        <div class="input-block w-100">
          <textarea style="white-space: pre-wrap;" id="code-css-page-${
            page.id
          }">${page.css}</textarea>
          <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier css de la page : ${escapeQuotes(
            page.name,
          )}','#code-css-page-${page.id}')">+</button>
        </div>
      </td>
      <td>${libs}</td>
      <td>${jsCheckboxes}</td>
      <td>${cssCheckboxes}</td>
      <td>
        <button class="btn btn-outline-primary btn-sm" onclick="updatePage(${
          page.id
        })" title="Mettre à jour"><i class="bi bi-check-lg"></i></button>
        <button class="btn btn-outline-danger btn-sm" onclick="deletePage(${
          page.id
        })" title="Supprimer"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  }
}

function updatePage(idVal) {
  const dataCSS = document.querySelector(`#code-css-page-${idVal}`).value;
  const dataJS = document.querySelector(`#code-js-page-${idVal}`).value;
  const index = sitePages.findIndex((f) => f.id === idVal);
  if (index !== -1) {
    sitePages[index].js = dataJS;
    sitePages[index].css = dataCSS;
    renderPages();
    notify("les codes locaux js, css et la librairie mises à jour avec succès", "success");
    triggerAutosave();
  }
}

function addInclude(pageName, inclusion, type) {
  const page = sitePages.find((p) => p.name === pageName);
  if (!page) return;
  const checkbox = document.getElementById(
    `page-${pageName}-${type}-${inclusion}`,
  );
  if (!checkbox) return;
  if (checkbox.checked) page.include[type][inclusion] = true;
  else delete page.include[type][inclusion];
  renderPages();
}

// ========================== Page Edition ============================= //
$("#searchComponent").oninput = () => {
  updateComponentSelector($("#searchComponent").value);
};

function selectComponent(component) {
  selectedComponent = component;
  updatePageForm();
  updateComponentSelector();
}

function updateComponentSelector(search = "") {
  elPageEditor.component.innerHTML = "";
  const lowerSearch = String(search).toLowerCase();

  for (const cpn of Object.keys(componentData || {})) {
    let componentHtml = componentData[cpn]["html-code"] || "";

    extractClassTokens(componentHtml).forEach((param) => {
      const paramInfo = componentData[cpn].param[param];
      if (!paramInfo) return;
      const type = paramInfo[1];
      if (type !== "empty") {
        const defaultValue = type === "list" ? paramInfo[3] : paramInfo[2];
        componentHtml = componentHtml.split(`{*${param}*}`).join(defaultValue);
      }
    });

    const isSelected = cpn === selectedComponent;
    if (cpn.toLowerCase().includes(lowerSearch)) {
      elPageEditor.component.insertAdjacentHTML(
        "beforeend",
        `<div class="component-card p-2 rounded cursor-pointer transition ${
          isSelected
            ? "bg-primary text-white shadow"
            : "bg-light text-dark border"
        }" onclick="selectComponent('${escapeQuotes(
          cpn,
        )}')" title="${escapeQuotes(
          componentData[cpn].desc || "",
        )}"><i class="bi bi-puzzle me-1"></i> ${cpn}</div>`,
      );
    }
  }
}

function findElementById(dataArray = [], idToFind) {
  for (const el of dataArray) {
    if (el.id === idToFind) return el;
    for (const key of Object.keys(el.param || {})) {
      const [label, type, value] = el.param[key];
      if (type === "empty" && Array.isArray(value)) {
        const found = findElementById(value, idToFind);
        if (found) return found;
      }
    }
  }
  return null;
}

function updatePageForm() {
  elPageEditor.selectedComponent.textContent = selectedComponent || "";
  elPageEditor.selected.textContent = selectedElement || "";

  elPageEditor.root.classList.toggle("d-none", !selectedComponent);
  elPageEditor.form.classList.toggle("d-none", !selectedElement);

  elPageEditor.emptyParamForm.classList.add("d-none");
  elPageEditor.paramForm.classList.add("d-none");
  elPageEditor.copiedForm.classList.add("d-none");
  elPageEditor.emptyParam.innerHTML = "";
  elPageEditor.paramForm.innerHTML = `<div class="d-grid"><button class="btn btn-primary" onclick=submitParam() > Mettre à jour </button></div>`;

  componentRootID.length === 0
    ? elPageEditor.toInitRoot.classList.add("d-none")
    : elPageEditor.toInitRoot.classList.remove("d-none");

  if (copiedElement[0]) {
    elPageEditor.copiedForm.classList.remove("d-none");
    elPageEditor.copied.textContent = copiedElement[0];
  }

  if (!selectedElement) return;

  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const selectedEl = findElementById(page.data, selectedElement);
  if (!selectedEl) return;

  elPageEditor.tagName.value = selectedEl.tagName;

  const paramKeys = Object.keys(selectedEl.param || {});
  for (const param of paramKeys) {
    elPageEditor.paramForm.classList.remove("d-none");
    const p = selectedEl.param[param];
    const [label, type, value] = p;
    if (type === "empty") {
      elPageEditor.emptyParamForm.classList.remove("d-none");
      elPageEditor.emptyParam.insertAdjacentHTML(
        "beforeend",
        `<option value="${param}">${param}</option>`,
      );
    } else if (type === "list") {
      const options = (selectedEl.param[param][2] || [])
        .map(
          (el) =>
            `<option value="${el}" ${
              selectedEl.param[param][3] === el ? "selected" : ""
            }>${el}</option>`,
        )
        .join("");
      elPageEditor.paramForm.insertAdjacentHTML(
        "afterbegin",
        `<div class="mb-3">
           <label class="form-label">${param}</label>
           <select class="form-control" id="param-data-${param}">${options}</select>
         </div>`,
      );
    } else if (type === "textarea") {
      elPageEditor.paramForm.insertAdjacentHTML(
        "afterbegin",
        `<div class="mb-3">
           <label class="form-label">${param}</label>
           <textarea class="form-control" id="param-data-${param}">${selectedEl.param[param][2]}</textarea>
         </div>`,
      );
    } else if (type === "ressource") {
      let currentVal = selectedEl.param[param][2] || "";
      if (currentVal && !currentVal.startsWith('/')) currentVal = '/' + currentVal;
      selectedEl.param[param][2] = currentVal;
      const siteName = $("#site-name").value.trim();
      const hasCache = mediaCache.siteName === siteName;
      const files = hasCache ? mediaCache.files : [];
      const inCache = files.some(f => f.url === currentVal);
      const extraOption = currentVal && !inCache
        ? `<option value="${escapeQuotes(currentVal)}" selected>${currentVal.split('/').pop()}</option>`
        : "";
      elPageEditor.paramForm.insertAdjacentHTML(
        "afterbegin",
        `<div class="mb-3" id="param-ressource-${param}">
           <label class="form-label">${param} <small class="text-muted">(fichier média)</small></label>
           <select class="form-control" id="param-data-${param}">
             <option value="">-- Sélectionnez un fichier --</option>
             ${extraOption}
             ${files.map(f => `<option value="${f.url}" ${currentVal === f.url ? "selected" : ""}>${f.name}</option>`).join("")}
           </select>
           <small class="text-danger d-none" id="param-ressource-warn-${param}">${!hasCache ? '⚠ Rechargez la liste des médias dans la section Ressources média.' : ''}</small>
         </div>`
      );
    } else {
      elPageEditor.paramForm.insertAdjacentHTML(
        "afterbegin",
        `<div class="mb-3">
           <label class="form-label">${param}</label>
           <input type="${type}" class="form-control" id="param-data-${param}" value="${escapeQuotes(
             selectedEl.param[param][2] || "",
           )}" />
         </div>`,
      );
    }
  }

  elPageEditor.anim.value = selectedEl.anim || "none";
  show("page", page.name);
  triggerAutosave();
}

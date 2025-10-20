// make_site.js
// Refactorisé: sécurisé + optimisé (préserve la logique originale)

// ========================== Utilitaires ============================= //
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const id = (i) => document.getElementById(i);
const showAlert = (msg) => alert(msg);

// Extraction regex (retourne valeurs sans {* *})
const extractClassTokens = (input = "") => {
  if (!input) return [];
  const re = /\{\*([A-Za-z0-9]+)\*\}/g;
  const set = new Set();
  let m;
  while ((m = re.exec(input)) !== null) set.add(m[1]);
  return Array.from(set);
};

// isHTML vérification simplifiée
const isHTML = (str = "") => /<\/?[a-z][\s\S]*>/i.test(str);

// -------------------------- Promise-based listFiles -------------------------
// NOTE: retourne un objet: { filename: content, ... }
async function listFiles(folder) {
  const list = {};
  try {
    const resp = await fetch(folder);
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const fileLinks = doc.querySelectorAll(".view-tiles a");

    // Fetch all files in parallel (limited to those not '..')
    const fetches = Array.from(fileLinks)
      .filter((a) => a.title !== "..")
      .map(async (a) => {
        try {
          const r = await fetch(a.href);
          const dt = await r.text();
          if (!isHTML(dt)) list[a.title] = dt;
        } catch (e) {
          // ignore failures per-file but log
          console.error("file fetch failed:", a.href, e);
        }
      });

    await Promise.all(fetches);
  } catch (e) {
    console.error("Error fetching file list:", e);
  }
  return list;
}

// ========================== Globals / State ============================= //
let globalJSFiles = [];
let globalCSSFiles = [];
let sitePages = [];
let componentData = {};
let libData = {};

let library = [];
const requiredLibrary = new Set();

// Editor data
let selectedPage = "";
let selectedElement = "";
let copiedElement = [];
let selectedComponent = "";
let editorInputID = "";

// Cached DOM nodes
const element = {
  site: $("#site-form"),
  page: $("#site-page-editor"),
};

const elPageEditor = {
  view: $("#page-view"),
  form: $("#element-form"),
  root: $("#root-form"),
  selected: $("#selected-element"),
  selectedComponent: $("#selected-component"),
  emptyParam: $("#element-empty-param"),
  emptyParamForm: $("#form-empty-param"),
  paramForm: $("#element-param-form"),
  anim: $("#element-onview-anim"),
  component: $("#component-selector"),
  copied: $("#copied-element"),
  copiedForm: $("#element-copied-form"),
  viewed: $("#page"),
  realView: $("#realview"),
  addLib: $("#lib-add"),
  searchLib: $("#lib-search"),
};

// ========================== Data load/save helpers ============================= //
// (on suppose l'existence de loadData / addOrUpdateData dans le contexte)
// Si elles n'existent pas, on peut stubber -> ici on les appelle comme avant.

async function initSiteEditor() {
  componentData = (await loadData("component")) || {};
  libData = (await loadData("lib")) || {};

  // Chargement asynchrone du site si présent dans sessionStorage
  const editSiteKey = sessionStorage.getItem("editsite");
  if (editSiteKey && editSiteKey !== "null") {
    const siteKey = editSiteKey;
    const allSites = (await loadData("site")) || {};
    if (allSites[siteKey]) {
      const data = allSites[siteKey];
      $("#site-name").value = data.name || "";
      $("#site-desc").value = data.desc || "";
      $("#site-lang").value = data.lang || "";
      $("#site-meta").value = data.meta || "";
      library = Array.isArray(data.lib) ? [...data.lib] : [];
      globalCSSFiles = Array.isArray(data.css) ? [...data.css] : [];
      globalJSFiles = Array.isArray(data.js) ? [...data.js] : [];
      sitePages = Array.isArray(data.content) ? [...data.content] : [];

      updatePageForm();
      renderGlobalCodeCSS();
      renderGlobalCodeJS();
      renderPageSelector();
      renderPages();
      checklibDependance();
      showAlert("page chargé avec succès");
    }
  }

  show("site");
  updateRealView();
  updatePageForm();
  updateComponentSelector();
  updateLib();
}

document.addEventListener("DOMContentLoaded", initSiteEditor);

// ============================ Navigation ============================ //
function show(page, pageSelection = null) {
  Object.keys(element).forEach((pg) => {
    element[pg].classList.toggle("d-none", pg !== page);
  });

  if (pageSelection !== null) {
    selectedPage = pageSelection;
    renderPageSelector();
    const headerData = renderPagesView();

    // initialise iframe pour la page sélectionnée
    const pageObj = sitePages.find((pg) => pg.name === selectedPage);
    if (!pageObj) return;

    // Construire head HTML optimisé
    const libsHtml = buildLibInclusionHTML(pageObj.include.lib, libData);
    const requiredLibsHtml = buildLibInclusionHTML(
      pageObj.include["lib-required"],
      libData
    );

    const cssInline = Object.keys(pageObj.include.css)
      .flatMap((css_name) =>
        globalCSSFiles
          .filter((css) => css.name === css_name)
          .map((css) => `<style>${css.content}</style>`)
      )
      .join("");

    elPageEditor.view.contentDocument.head.innerHTML =
      `<meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <link rel="stylesheet" href="/asset/aos.css">
       <script src="/asset/aos.js"></script>
       ` +
      libsHtml +
      requiredLibsHtml +
      cssInline +
      (pageObj.css ? `<style>${pageObj.css}</style>` : "") +
      headerData +
      `
      <style>
         .component-element { border: 2px dashed dodgerblue; padding: 5px; }
         .component-element:hover { box-shadow: 0 0 10px rgba(255, 0, 0, 1); cursor: pointer; }
         .component-element-selected { border: 2px solid purple; box-shadow: 0 0 10px rgb(30, 0, 255); padding: 4px; border-radius: 4px; }
         .component-element-debug-name { color: dodgerblue; }
       </style>`;

    // click handling: select nearest .component-element
    elPageEditor.view.contentDocument.body.onclick = (e) => {
      if (e.target.tagName === "A" || e.target.closest("a")) e.preventDefault();
      const target = e.target.closest(".component-element");
      if (target && target.dataset.id) {
        e.stopPropagation();
        selectElement(target.dataset.id);
      }
    };
  }
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
          : ""
      )
    )
    .join("");
}

// ======================== Editeur de code =========================== //
function openEditor(label, inputID) {
  const modalEl = document.getElementById("codeEditor");
  const editorModal = new bootstrap.Modal(modalEl);
  editorModal.show();
  $("#codeEditorLabel").textContent = label;
  editorInputID = inputID;
  const ta = $("#codeEditor").querySelector("textarea");
  ta.value = document.querySelector(editorInputID).value;
  ta.focus();
}

function beautify() {
  const ta = $("#codeEditor").querySelector("textarea");
  ta.value = autoBeautify(ta.value);
  document.querySelector(editorInputID).value = ta.value;
}

$("#codeEditor").querySelector("textarea").oninput = () => {
  document.querySelector(editorInputID).value =
    $("#codeEditor").querySelector("textarea").value;
};

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

  if (!site.name) return showAlert("veuillez assigner un nom au site");
  const data = (await loadData("site")) || {};

  const editingNull = sessionStorage.getItem("editsite") === "null";
  if (Object.keys(data).includes(site.name) && editingNull) {
    return showAlert("Erreur: un site avec le même nom existe déjà");
  }

  data[site.name] = site;
  await addOrUpdateData("site", data);
  showAlert("Site sauvegardé");
}

// ============================ Page Selector ============================ //
function renderPageSelector() {
  const elPageSelector = $("#page-selector");
  const previewName = $("#page-name-editing");

  elPageSelector.innerHTML = sitePages
    .map(
      (pg) =>
        `<button type="button" class="btn btn-${
          pg.name === selectedPage ? "warning" : "danger"
        }" onclick="show('page','${escapeQuotes(pg.name)}')">${
          pg.name
        }</button>`
    )
    .join("");

  previewName.textContent = selectedPage;
}

function escapeQuotes(s) {
  return String(s).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ============================ Library ============================ //
function checklibDependance() {
  requiredLibrary.clear();
  for (const pg of sitePages) {
    const pageLibs = [];
    for (const data of pg.data) pageLibs.push(...checkComponentLib(data));
    pg.include["lib-required"] = Array.from(new Set(pageLibs));
    // cleanup unused libs from include.lib
    Object.keys(pg.include["lib"] || {}).forEach((pglib) => {
      if (!requiredLibrary.has(pglib) && !library.includes(pglib)) {
        delete pg.include["lib"][pglib];
      }
    });
    // collect into requiredLibrary set
    pg.include["lib-required"].forEach((l) => requiredLibrary.add(l));
  }
  updateLib();
}

function checkComponentLib(data) {
  // returns array of libs used by data and children
  const childLib = [];
  const render = data["html-code"] || "";
  extractClassTokens(render).forEach((param) => {
    const p = data.param[param];
    if (!p) return;
    const [label, type, value] = p;
    if (type === "empty" && Array.isArray(value)) {
      value.forEach((child) => {
        childLib.push(...checkComponentLib(child));
      });
    }
  });
  return [...(data["lib"] || []), ...childLib];
}

function updateLib() {
  const libListBody = $("#lib-select")?.querySelector("tbody");
  const libIncludeList = $("#lib-include-list");
  if (!libListBody || !libIncludeList || !libData) return;

  libListBody.innerHTML = "";
  libIncludeList.innerHTML = "";

  Object.keys(libData).forEach((libName) => {
    if (libName.includes(elPageEditor.searchLib?.value || "")) {
      const checkedAndDisabled = requiredLibrary.has(libName)
        ? "checked disabled"
        : library.includes(libName)
        ? "checked"
        : "";
      const action = library.includes(libName) ? "delete" : "add";

      libListBody.insertAdjacentHTML(
        "beforeend",
        `<tr>
            <td scope="row">${libName}${
          requiredLibrary.has(libName) ? " (inclus automatiquement) " : ""
        }</td>
            <td>
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" ${checkedAndDisabled} oninput="libAction('${action}','${escapeQuotes(
          libName
        )}')" />
              </div>
            </td>
        </tr>`
      );
    }

    if (library.includes(libName) || requiredLibrary.has(libName)) {
      libIncludeList.insertAdjacentHTML("beforeend", `<li>${libName}</li>`);
    }
  });

  if (!libIncludeList.innerHTML)
    libIncludeList.innerHTML = `Aucune librairie incluse`;

  renderPages();
}

if (elPageEditor.searchLib) elPageEditor.searchLib.oninput = () => updateLib();

function libAction(action, lib) {
  if (action === "add") {
    if (!library.includes(lib)) library.push(lib);
  } else {
    library = library.filter((item) => item !== lib);
  }
  checklibDependance();
  updateLib();
}

// ============================ JS ============================ //
function addGlobalCodeJS() {
  const nameInput = id("global-js-name");
  const contentInput = id("global-js-content");
  const name = nameInput.value.trim();
  const content = contentInput.value.trim();

  if (!name || !content) return showAlert("Remplir tous les champs JS");
  if (globalJSFiles.find((g) => g.name === name))
    return showAlert("Cet script existe déjà");

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
            file.name
          )}','#code-js-content-${file.id}')">+</button>
        </div>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="updateGlobalCodeJS(${
          file.id
        })">Mettre à jour</button>
        <button class="btn btn-danger btn-sm" onclick="deleteGlobalCodeJS(${
          file.id
        })">Supprimer</button>
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
    showAlert("fichier js global mis à jour avec succès");
  }
}

// ============================ CSS ============================ //
function addGlobalCodeCSS() {
  const name = id("global-css-name").value.trim();
  const content = id("global-css-content").value.trim();

  if (!name || !content) return showAlert("Remplir tous les champs CSS");
  if (globalCSSFiles.find((g) => g.name === name))
    return showAlert("Cet style existe déjà");

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
            file.name
          )}','#code-css-content-${file.id}')">+</button>
        </div>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="updateGlobalCodeCSS(${
          file.id
        })">Mettre à jour</button>
        <button class="btn btn-danger btn-sm" onclick="deleteGlobalCodeCSS(${
          file.id
        })">Supprimer</button>
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
    showAlert("fichier css global mis à jour avec succès");
  }
}

// ============================ Pages ============================ //
function addPage() {
  const name = id("page-name").value.trim();
  const title = id("page-title").value.trim();
  const js = id("page-js").value.trim();
  const css = id("page-css").value.trim();

  if (!name || !title)
    return showAlert("Nom du fichier et titre de la page obligatoires");
  if (sitePages.find((pg) => pg.name === name))
    return showAlert("Cette page existe déjà");

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
}

function deletePage(idVal) {
  const idx = sitePages.findIndex((p) => p.id === idVal);
  if (idx === -1) return;
  sitePages.splice(idx, 1);
  renderPages();
  renderPageSelector();
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
          lib
        )}', 'lib')" />
            <label class="form-check-label">${lib} ${
          !Object.keys(libData).includes(lib) ? "(absente dans la base)" : ""
        }</label>
          </div>`
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
          gljs.name
        )}', 'js')" />
            <label class="form-check-label">${gljs.name}</label>
          </div>`
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
          glcss.name
        )}', 'css')" />
            <label class="form-check-label">${glcss.name}</label>
          </div>`
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
            page.name
          )}','#code-js-page-${page.id}')">+</button>
        </div>
      </td>
      <td>
        <div class="input-block w-100">
          <textarea style="white-space: pre-wrap;" id="code-css-page-${
            page.id
          }">${page.css}</textarea>
          <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier css de la page : ${escapeQuotes(
            page.name
          )}','#code-css-page-${page.id}')">+</button>
        </div>
      </td>
      <td>${libs}</td>
      <td>${jsCheckboxes}</td>
      <td>${cssCheckboxes}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="updatePage(${
          page.id
        })">Mettre à jour</button>
        <button class="btn btn-danger btn-sm" onclick="deletePage(${
          page.id
        })">Supprimer</button>
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
    showAlert(
      "les codes locaux js, css et la librairie mises à jour avec succès"
    );
  }
}

function addInclude(pageName, inclusion, type) {
  const page = sitePages.find((p) => p.name === pageName);
  if (!page) return;
  const checkbox = document.getElementById(
    `page-${pageName}-${type}-${inclusion}`
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

    // remplacer paramètres par leurs valeurs par défaut (non-empty only)
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
        `<div class="component-card p-2 bg-primary rounded ${
          isSelected
            ? "text-primary border border-2 border-primary shadow bg-light"
            : "text-light"
        }" onclick="selectComponent('${escapeQuotes(
          cpn
        )}')" title="${escapeQuotes(
          componentData[cpn].desc || ""
        )}">${cpn}</div>`
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

  if (copiedElement[0]) {
    elPageEditor.copiedForm.classList.remove("d-none");
    elPageEditor.copied.textContent = copiedElement[0];
  }

  if (!selectedElement) return;

  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const selectedEl = findElementById(page.data, selectedElement);
  if (!selectedEl) return;

  // Build param form (reverse order maintained so that last push shows first like original)
  const paramKeys = Object.keys(selectedEl.param || {});
  for (const param of paramKeys) {
    elPageEditor.paramForm.classList.remove("d-none");
    const p = selectedEl.param[param];
    const [label, type, value] = p;
    if (type === "empty") {
      elPageEditor.emptyParamForm.classList.remove("d-none");
      elPageEditor.emptyParam.insertAdjacentHTML(
        "beforeend",
        `<option value="${param}">${param}</option>`
      );
    } else if (type === "list") {
      const options = (selectedEl.param[param][2] || [])
        .map(
          (el) =>
            `<option value="${el}" ${
              selectedEl.param[param][3] === el ? "selected" : ""
            }>${el}</option>`
        )
        .join("");
      elPageEditor.paramForm.insertAdjacentHTML(
        "afterbegin",
        `<div class="mb-3">
           <label class="form-label">${param}</label>
           <select class="form-control" id="param-data-${param}">${options}</select>
         </div>`
      );
    } else if (type === "textarea") {
      elPageEditor.paramForm.insertAdjacentHTML(
        "afterbegin",
        `<div class="mb-3">
           <label class="form-label">${param}</label>
           <textarea class="form-control" id="param-data-${param}">${selectedEl.param[param][2]}</textarea>
         </div>`
      );
    } else {
      elPageEditor.paramForm.insertAdjacentHTML(
        "afterbegin",
        `<div class="mb-3">
           <label class="form-label">${param}</label>
           <input type="${type}" class="form-control" id="param-data-${param}" value="${escapeQuotes(
          selectedEl.param[param][2] || ""
        )}" />
         </div>`
      );
    }
  }

  elPageEditor.anim.value = selectedEl.anim || "none";
  show("page", page.name);
}

function findElementAndParent(
  dataArray = [],
  idToFind,
  parent = null,
  paramKey = null
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
  page.data.unshift(instance);
  show("page", page.name);
}

function addRootEnd(paste = false) {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const instance = paste
    ? JSON.parse(JSON.stringify(copiedElement[1]))
    : makeComponentInstance(selectedComponent);
  page.data.push(instance);
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
          `#param-data-${param}`
        ).value;
      } else {
        found.param[param][2] = document.querySelector(
          `#param-data-${param}`
        ).value;
      }
    }
  }
  updatePageForm();
  show("page", page.name);
}

function selectElement(idVal) {
  selectedElement = idVal;
  updatePageForm();
}

// ========================== Render / Build ============================= //
// renderComponent: retourne [html, {component, custom, default}, {component, custom, default}]

let renderCSSPerComponentCache = {};
let renderJSPerComponentCache = {};
let record = 0;

function renderComponent(data, isRealView = false) {
  // clone strings to avoid mutation
  let render = data["html-code"] || "";
  data.id = `component-${data.component}-${record}`;
  record += 1;
  // replace tokens in HTML
  extractClassTokens(render).forEach((param) => {
    const p = data.param[param];
    if (!p) return;
    const [label, type, value] = p;
    if (type === "empty" && Array.isArray(value)) {
      const nested = value
        .map((child) => renderComponent(child, isRealView))
        .join("");

      render = render.split(`{*${param}*}`).join(nested);
    } else if (type === "list") {
      render = render.split(`{*${param}*}`).join(data.param[param][3]);
    } else {
      render = render.split(`{*${param}*}`).join(value);
    }
  });

  //recupere tous les composants et leur customs (css et js)
  if (data["css-code"].trim() !== "") {
    if (!renderCSSPerComponentCache[data.component]) {
      renderCSSPerComponentCache[data.component] = [];
    }
    // CSS token replacement and custom detection
    let customCSS = false;
    let renderCSS = data["css-code"];
    extractClassTokens(renderCSS).forEach((param) => {
      const p = data.param[param];
      if (!p) return;
      const [label, type] = p;
      if (type === "list") {
        if (
          data.param[param][3] !== componentData[data.component].param[param][3]
        ) {
          renderCSS = renderCSS
            .split(`{*${param}*}`)
            .join(data.param[param][3]);
          customCSS = true;
        }
      } else {
        if (p[2] !== componentData[data.component].param[param][2]) {
          renderCSS = renderCSS.split(`{*${param}*}`).join(p[2]);
          customCSS = true;
        }
      }
    });
    if (customCSS) {
      renderCSSPerComponentCache[data.component].push(
        scopeComponentCSS(`.${data.id}`, renderCSS, data["html-code"])
      );
    }
  }

  if (data["js-code"].trim() !== "") {
    if (!renderJSPerComponentCache[data.component]) {
      renderJSPerComponentCache[data.component] = [];
    }
    // JS token replacement and custom detection
    let customJS = false;
    let renderJS = data["js-code"];
    extractClassTokens(renderJS).forEach((param) => {
      const p = data.param[param];
      if (!p) return;
      const [label, type] = p;
      if (type === "list") {
        if (
          data.param[param][3] !== componentData[data.component].param[param][3]
        ) {
          renderJS = renderJS.split(`{*${param}*}`).join(data.param[param][3]);
          customJS = true;
        }
      } else {
        if (p[2] !== componentData[data.component].param[param][2]) {
          renderJS = renderJS.split(`{*${param}*}`).join(p[2]);
          customJS = true;
        }
      }
    });
    if (customJS) {
      renderJSPerComponentCache[data.component].push(
        ` if (component.classList.contains("${data.id}")) { ${renderJS} }`
      );
    }
  }

  // Parse HTML and add attributes/classes
  const parser = new DOMParser();
  const doc = parser.parseFromString(render, "text/html");
  const body = doc.body;
  const firstElement = [...body.childNodes].find((n) => n.nodeType === 1);

  if (firstElement) {
    firstElement.classList.add("component-classname-" + data.component);
    firstElement.classList.add(data.id);

    if (isRealView && data.anim && data.anim !== "none") {
      firstElement.setAttribute("data-aos", data.anim);
    }

    if (!isRealView) {
      const isSelected = data.id === selectedElement;
      const baseClass = "component-element" + (isSelected ? "-selected" : "");
      firstElement.classList.add(...baseClass.split(" "));
      firstElement.setAttribute("data-id", data.id);
      firstElement.setAttribute("title", `ID: ${data.id}`);
    }
  }

  return body.innerHTML;
}

// postRenderComponents: produce html, css, js aggregated
function postRenderComponents(page, isRealView = false) {
  let allComponentsHTML = "";
  renderCSSPerComponentCache = {};
  renderJSPerComponentCache = {};
  record = 0;

  for (const data of page.data) {
    // call renderComponent once and reuse result
    allComponentsHTML += renderComponent(data, isRealView);
  }

  // aggregate default CSS
  let allComponentsCSS = "";
  for (let key of Object.keys(renderCSSPerComponentCache)) {
    let defaultCSS = componentData[key]["css-code"];
    extractClassTokens(defaultCSS).forEach((param) => {
      const p = componentData[key].param[param];
      if (!p) return;
      const [label, type] = p;
      if (type === "list") {
        defaultCSS = defaultCSS
          .split(`{*${param}*}`)
          .join(componentData[key].param[param][3]);
      } else {
        defaultCSS = defaultCSS.split(`{*${param}*}`).join(p[2]);
      }
    });

    allComponentsCSS +=
      scopeComponentCSS(
        `.component-classname-${key}`,
        defaultCSS,
        componentData[key]["html-code"]
      ) + renderCSSPerComponentCache[key].join("");
  }

  // aggregate JS into a single script string
  let allComponentsJS = "";
  for (let key of Object.keys(renderJSPerComponentCache)) {
    let defaultJS = componentData[key]["js-code"];
    extractClassTokens(defaultJS).forEach((param) => {
      const p = componentData[key].param[param];
      if (!p) return;
      const [label, type] = p;
      if (type === "list") {
        defaultJS = defaultJS
          .split(`{*${param}*}`)
          .join(componentData[key].param[param][3]);
      } else {
        defaultJS = defaultJS.split(`{*${param}*}`).join(p[2]);
      }
    });

    const customsJoined =
      renderJSPerComponentCache[key].length > 0
        ? renderJSPerComponentCache[key].join(" else ")
        : "";

    const block = `for (const component of document.querySelectorAll(".component-classname-${key}")) {
      ${customsJoined ? customsJoined : ""}
      ${customsJoined ? `else { ${defaultJS} }` : defaultJS}
    };`;

    allComponentsJS += block;
  }

  return {
    html: allComponentsHTML,
    css: allComponentsCSS,
    js: allComponentsJS,
  };
}

function renderPagesView() {
  elPageEditor.view.contentDocument.body.innerHTML = "";
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;

  const content = postRenderComponents(page);

  elPageEditor.view.contentDocument.body.innerHTML = content.html;
  if (content.js)
    elPageEditor.view.contentDocument.body.innerHTML += `<script>${content.js}</script>`;

  updateRealView();

  // include page-specific global JS (fixed closing tag)
  elPageEditor.view.contentDocument.body.innerHTML +=
    Object.keys(page.include.js || {})
      .flatMap((js_name) =>
        globalJSFiles
          .filter((js) => js.name === js_name)
          .map((js) => `<script>${js.content}</script>`)
      )
      .join("") + (page.js ? `<script>${page.js}</script>` : "");

  checklibDependance();

  return content.css === "" ? "" : `<style>${content.css}</style>`;
}

function updateRealView() {
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!selectedPage || !page) {
    elPageEditor.viewed.textContent = "Aucune page sélectionnée";
    elPageEditor.realView.contentDocument.head.innerHTML = "";
    elPageEditor.realView.contentDocument.body.innerHTML = "";
    return;
  }

  const content = postRenderComponents(page, true);
  elPageEditor.viewed.textContent = selectedPage;

  // CSS globaux inclus (correct closing tags)
  const cssLinks = Object.keys(page.include.css || {})
    .map((name) => {
      const file = globalCSSFiles.find((f) => f.name === name);
      return file ? `<style>\n${file.content}\n</style>` : "";
    })
    .join("\n");

  // JS globaux inclus
  const jsScripts = Object.keys(page.include.js || {})
    .map((name) => {
      const file = globalJSFiles.find((f) => f.name === name);
      return file ? `<script>\n${file.content}\n</script>` : "";
    })
    .join("\n");

  const pageCSS = page.css ? `<style>\n${page.css}\n</style>` : "";
  const pageJS = page.js ? `<script>\n${page.js}\n</script>` : "";

  const aosNeeded = page.data.some((comp) => comp.anim && comp.anim !== "none");
  const aosInit = aosNeeded ? `<script>AOS.init();</script>` : "";

  const libInclusion =
    buildLibInclusionHTML(page.include.lib, libData) +
    buildLibInclusionHTML(page.include["lib-required"], libData);

  elPageEditor.realView.srcdoc = `<!DOCTYPE html>
<html lang="${$("#site-lang").value}">
<head>
  ${$("#site-meta").value}
  <link href="/asset/aos.css" rel="stylesheet">
  <script src="/asset/aos.js"></script>
  ${libInclusion}
  ${cssLinks}
  ${pageCSS}
  ${content.css ? `<style>${content.css}</style>` : ""}
</head>
<body>
  ${content.html}
  ${jsScripts}
  ${pageJS}
  ${content.js ? `<script>${content.js}</script>` : ""}
  ${aosInit}
</body>
</html>`;

  elPageEditor.realView.classList.add("d-none");
  elPageEditor.viewed.textContent = "Chargement...";

  setTimeout(() => {
    if (elPageEditor.realView.contentDocument.body) {
      elPageEditor.realView.contentDocument.body.onclick = (e) => {
        if (e.target.tagName === "A" || e.target.closest("a"))
          e.preventDefault();
      };
    }
    elPageEditor.realView.classList.remove("d-none");
    elPageEditor.viewed.textContent = "";
  }, 2000);
}

function buildPage(page, root = "../asset/") {
  const content = postRenderComponents(page, true);
  const htmlBody = content.html;

  const cssLinks = Object.keys(page.include.css || {})
    .map((name) => {
      const file = globalCSSFiles.find((f) => f.name === name);
      return file
        ? `<link href="${root}asset_site/${file.name}.css" rel="stylesheet">`
        : "";
    })
    .join("\n");

  const jsScripts = Object.keys(page.include.js || {})
    .map((name) => {
      const file = globalJSFiles.find((f) => f.name === name);
      return file
        ? `<script src="${root}asset_site/${file.name}.js"></script>`
        : "";
    })
    .join("\n");

  const pageCSS = page.css ? `<style>\n${page.css}\n</style>` : "";
  const pageJS = page.js ? `<script>\n${page.js}\n</script>` : "";

  const aosNeeded = page.data.some((comp) => comp.anim && comp.anim !== "none");
  const aosInit = aosNeeded ? `<script>AOS.init();</script>` : "";

  // lib inclusion: differenciate css/js assets (close tags fixed)
  let libInclusion = "";
  libInclusion +=
    Object.keys(page.include.lib || {})
      .flatMap((lib_name) =>
        Object.keys(libData).map((key) =>
          key === lib_name
            ? libData[key].type
              ? libData[key].link
              : libData[key].file.includes("<script>")
              ? `<script src="${root}asset_sys/${key}.js"></script>`
              : `<link href="${root}asset_sys/${key}.css" rel="stylesheet">`
            : ""
        )
      )
      .join("") +
    page.include["lib-required"]
      .flatMap((lib_name) =>
        Object.keys(libData).map((key) =>
          key === lib_name
            ? libData[key].type
              ? libData[key].link
              : libData[key].file.includes("<script>")
              ? `<script src="${root}asset_sys/${key}.js"></script>`
              : `<link href="${root}asset_sys/${key}.css" rel="stylesheet">`
            : ""
        )
      )
      .join("");

  const fullHTML = `<!DOCTYPE html>
<html lang="${$("#site-lang").value}">
<head>
  ${$("#site-meta").value}
  <title>${page.title}</title>
  <link href="${root}asset_sys/aos.css" rel="stylesheet">
  <script src="${root}asset_sys/aos.js"></script>
  ${libInclusion}
  ${cssLinks}
  ${pageCSS}
  ${content.css ? `<style>${content.css}</style>` : ""}
</head>
<body>
  ${htmlBody}
  ${jsScripts}
  ${pageJS}
  ${content.js ? `<script>${content.js}</script>` : ""}
  ${aosInit}
</body>
</html>`.trim();

  return fullHTML;
}

async function build() {
  const data = (await loadData("site")) || {};
  const site_name = $("#site-name").value;
  const asset_file = ["aos.css", "aos.js"];

  if (!Object.keys(data).includes(site_name))
    return showAlert("Sauvegarder d'abord le site");

  const zip = new JSZip();
  const fpage = zip.folder("page");
  const asset = zip.folder("asset");
  const asset_sys = asset.folder("asset_sys");
  const ressource = zip.folder("ressource");

  // Charger fichiers système en parallèle
  await Promise.all(
    asset_file.map(async (file) => {
      try {
        const response = await fetch("../asset/" + file);
        const text = await response.text();
        asset_sys.file(file, text);
      } catch (e) {
        console.error("Erreur lors du chargement des fichiers système :", e);
      }
    })
  );

  // Ajouter librairies (non-type = fichier)
  for (const file of library) {
    if (!libData[file]) continue;
    if (!libData[file].type) {
      if (libData[file].file.includes("<script>")) {
        asset_sys.file(
          file + ".js",
          libData[file].file.replace("<script>", "").replace("</script>", "")
        );
        continue;
      }
      asset_sys.file(
        file + ".css",
        libData[file].file.replace("<style>", "").replace("</style>", "")
      );
    }
  }

  // Styles et scripts globaux
  const asset_site = asset.folder("asset_site");
  for (const css of globalCSSFiles)
    asset_site.file(css.name + ".css", autoBeautify(css.content));
  for (const js of globalJSFiles)
    asset_site.file(js.name + ".js", autoBeautify(js.content));

  // Construire pages
  const pageContents = sitePages.map((page) => {
    if (page.name === "index")
      return { name: "index.html", content: buildPage(page, "asset/") };
    return { name: page.name + ".html", content: buildPage(page) };
  });

  for (const page of pageContents) {
    if (page.name === "index.html")
      zip.file("index.html", html_beautify(page.content, { indent_size: 2 }));
    else fpage.file(page.name, html_beautify(page.content, { indent_size: 2 }));
  }

  // Ajouter ressources trouvées
  const files = await listFiles("/ressource");
  for (const [fileName, fileContent] of Object.entries(files)) {
    ressource.file(fileName, fileContent);
  }

  // Générer zip et sauvegarder
  zip.generateAsync({ type: "blob" }).then((content) => {
    saveAs(content, site_name + "-build.zip");
    showAlert("site construit avec succès");
  });
}

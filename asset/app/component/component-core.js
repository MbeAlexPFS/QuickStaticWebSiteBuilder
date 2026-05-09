// component/component-core.js
// State, init, save, Monaco for component editor (from make_component.js)

// =======================
// Monaco Editor state
// =======================
let monacoEditors = {};
let monacoComponentContainer = null;
let monacoComponentType = '';
let monacoLoaded = false;

function loadMonacoComponent(callback) {
  if (monacoLoaded) { callback(); return; }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
  script.onload = function () {
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monacoLoaded = true;
      callback();
    });
  };
  document.head.appendChild(script);
}

function initMonacoEditors() {
  const configs = [
    { id: 'monaco-html', textareaId: 'cdeComponent', lang: 'html' },
    { id: 'monaco-css', textareaId: 'cdeCSSComponent', lang: 'css' },
    { id: 'monaco-js', textareaId: 'cdeJSComponent', lang: 'javascript' },
  ];

  configs.forEach(({ id, textareaId, lang }) => {
    const container = document.getElementById(id);
    const ta = document.getElementById(textareaId);
    if (!container || !ta) return;

    monacoEditors[lang] = monaco.editor.create(container, {
      value: ta.value,
      language: lang,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
    });

    monacoEditors[lang].onDidChangeModelContent(() => {
      ta.value = monacoEditors[lang].getValue();
    });
  });
}

function syncMonacoEditors() {
  const configs = [
    { textareaId: 'cdeComponent', lang: 'html' },
    { textareaId: 'cdeCSSComponent', lang: 'css' },
    { textareaId: 'cdeJSComponent', lang: 'javascript' },
  ];
  configs.forEach(({ textareaId, lang }) => {
    const ta = document.getElementById(textareaId);
    const editor = monacoEditors[lang];
    if (ta && editor && ta.value !== editor.getValue()) {
      editor.setValue(ta.value);
    }
  });
}

// =======================
// Sélection des éléments
// =======================
const el = {
  cdeComponentInput: document.querySelector("#cdeComponent"),
  cdeJSComponentInput: document.querySelector("#cdeJSComponent"),
  cdeCSSComponentInput: document.querySelector("#cdeCSSComponent"),
  addLib: document.querySelector("#lib-add"),
  searchLib: document.querySelector("#lib-search"),
  setCdeCont: document.querySelector("#setCode"),
  editCdeCont: document.querySelector("#editCode"),
  editComponentParam: document.querySelector("#edit-component-param"),
  realView: document.querySelector("#realview"),
  previewBtn: document.querySelector("#preview"),
};

// =======================
// Etat du composant
// =======================
let cdeComponent = "";
let cdeCSSComponent = "";
let cdeJSComponent = "";
let choicesComponent = {};
let paramsComponent = {};
let libComponent = [];

let libData;

// Beautify (gardé tel quel, appelle fonctions externes)
function beautify() {
  loadMonacoComponent(function () {
    if (!monacoLoaded) return;
    const htmlEditor = monacoEditors['html'];
    const cssEditor = monacoEditors['css'];
    const jsEditor = monacoEditors['js'];
    if (htmlEditor) {
      const val = html_beautify(htmlEditor.getValue(), { indent_size: 2 });
      htmlEditor.setValue(val);
    }
    if (cssEditor) {
      const val = autoBeautify(cssEditor.getValue());
      cssEditor.setValue(val);
    }
    if (jsEditor) {
      const val = autoBeautify(jsEditor.getValue());
      jsEditor.setValue(val);
    }
  });
}

// =======================
// Vues
// =======================
function showEditView() {
  if (el.setCdeCont) el.setCdeCont.style.display = "none";
  if (el.editCdeCont) el.editCdeCont.style.display = "initial";
}

function showUploadView() {
  if (el.setCdeCont) el.setCdeCont.style.display = "initial";
  if (el.editCdeCont) el.editCdeCont.style.display = "none";
}

// =======================
// Soumission du code
// =======================
async function submitCode() {
  const html = el.cdeComponentInput?.value || "";
  const css = el.cdeCSSComponentInput?.value || "";
  const js = el.cdeJSComponentInput?.value || "";

  if (!html.trim()) { notify("Vous devez entrer un code pour continuer.", "warning"); return; }

  let params = [
    ...extractClassTokens(html),
    ...extractClassTokens(css),
    ...extractClassTokens(js),
  ];

  for (let key of Object.keys(paramsComponent)) {
    if (key in params) {
      continue;
    } else {
      delete paramsComponent[key];
    }
  }

  cdeComponent = html;
  cdeCSSComponent = css;
  cdeJSComponent = js;
  showEditView();

  const isEditing = sessionStorage.getItem("edit") !== "null";
  await initComponentParamForm(isEditing);
}

// =======================
// Gestion des params
// =======================

async function initComponentParamForm(editing = false) {
  if (!el.editComponentParam) return;
  el.editComponentParam.innerHTML = "";

  const tokens = [
    ...extractClassTokens(cdeComponent),
    ...extractClassTokens(cdeCSSComponent),
    ...extractClassTokens(cdeJSComponent),
  ].filter(Boolean);
  const uniqueTokens = [...new Set(tokens)];

  const compoData = editing ? await loadData("component") : null;
  const editKey = editing ? sessionStorage.getItem("edit") : null;

  uniqueTokens.forEach((name) => {
    el.editComponentParam.insertAdjacentHTML(
      "beforeend",
      `<div class="mb-3">
          <h6 class="form-label">Nom du paramètre</h6>
          <input type="text" class="form-control" id="param-name-${name}" value="${name}" disabled />
      </div>
      <div class="mb-3">
          <label class="form-label">Type de paramètre</label>
          <select class="form-select form-select-lg" id="param-type-${name}" oninput="toggleComponentParamTypeForm('${name}')">
              ${
                extractClassTokens(cdeComponent).includes(name)
                  ? `<option value="empty">Vide</option>`
                  : ``
              }
              <option value="text">Texte</option>
              <option value="number">Nombre</option>
              <option value="list">Liste</option>
              <option value="textarea">LongText</option>
              <option value="ressource">Ressource (fichier média)</option>
          </select>
      </div>
      <div id="form-choice-${name}">
          <div class="mb-3">
              <label class="form-label">Choix</label>
              <input type="text" class="form-control" id="choice-name-${name}" placeholder="ex: blue" />
          </div>
          <div class="d-grid gap-2 my-2">
              <button type="button" onclick="addComponentChoice('${name}')" class="btn btn-primary">Ajouter le choix</button>
          </div>
          <div class="table-responsive">
              <table class="table table-primary">
                  <thead>
                      <tr><th>Choix</th><th>Action</th></tr>
                  </thead>
                  <tbody id="choice-list-${name}"></tbody>
              </table>
          </div>
      </div>
      <div class="mb-3" id="form-default-${name}">
          <label class="form-label">Valeur par defaut</label>
          <div id="default-param-${name}"></div>
      </div>`
    );

    if (!editing) {
      choicesComponent[name] = [];
      paramsComponent[name] = [name, "empty"];
      toggleComponentParamTypeForm(name);
      updateComponentChoiceList(name);
    } else {
      const compo = compoData?.[editKey];
      const paramState = compo?.param?.[name];
      if (paramState) {
        paramsComponent[name] = paramState;
        const select = getById(`param-type-${name}`);
        if (select) select.value = paramState[1];
        if (paramState[1] === "list") {
          choicesComponent[name] = paramState[2] ?? [];
          const listEl = getById(`choice-list-${name}`);
          if (listEl)
            listEl.innerHTML = (choicesComponent[name] || [])
              .map(
                (choice, i) => `
                <tr>
                  <td>${choice}</td>
                  <td><button type="button" class="btn btn-danger" onclick="delComponentChoice('${name}',${i})">Supprimer</button></td>
                </tr>`
              )
              .join("");
          const formChoice = getById(`form-choice-${name}`);
          if (formChoice) formChoice.style.display = "initial";
        } else {
          choicesComponent[name] = [];
          const formChoice = getById(`form-choice-${name}`);
          if (formChoice) formChoice.style.display = "none";
        }
      } else {
        choicesComponent[name] = [];
        paramsComponent[name] = [name, "empty"];
      }
      toggleComponentParamTypeForm(name);
    }
  });
}

function toggleComponentParamTypeForm(element) {
  const form = getById("form-default-" + element);
  const typeInput = getById("param-type-" + element);
  const inputForm = getById("default-param-" + element);
  const formChoice = getById("form-choice-" + element);

  const type = typeInput ? typeInput.value : "empty";
  const isList = type === "list";

  if (formChoice) formChoice.style.display = isList ? "initial" : "none";
  if (form) form.classList.remove("d-none");

  if (isList) {
    const choices = (choicesComponent[element] || []).map((ch) =>
      ch === paramsComponent[element]?.[3]
        ? `<option selected value="${ch}">${ch}</option>`
        : `<option value="${ch}">${ch}</option>`
    );
    if (inputForm)
      inputForm.innerHTML = `<select class="form-select form-select-lg input-default">${choices.join(
        ""
      )}</select>`;
  } else {
    if (type === "empty") {
      if (form) form.classList.add("d-none");
      if (inputForm) inputForm.innerHTML = "";
    } else {
      const val = paramsComponent[element]?.[2] ?? "";
      if (inputForm)
        if (type === "textarea") {
          inputForm.innerHTML = `<textarea class="input-default form-control" >${val}</textarea>`;
        } else {
          inputForm.innerHTML = `<input class="input-default form-control" type="${type}" value="${val}" />`;
        }
    }
    choicesComponent[element] = [];
  }
}

function updateComponentChoiceList(element) {
  const inputDefault = getById("default-param-" + element)?.querySelector(
    ".input-default"
  );
  const def = inputDefault ? inputDefault.value : "";
  const listEl = getById("choice-list-" + element);
  if (listEl)
    listEl.innerHTML = (choicesComponent[element] || [])
      .map(
        (choice, i) => `
      <tr>
        <td>${choice}</td>
        <td><button type="button" class="btn btn-danger" onclick="delComponentChoice('${element}',${i})">Supprimer</button></td>
      </tr>`
      )
      .join("");

  const type = getById("param-type-" + element)?.value ?? "empty";
  const newParam =
    type === "list"
      ? [element, type, [...(choicesComponent[element] || [])], def]
      : type === "empty"
      ? [element, type]
      : [element, type, def];

  paramsComponent[element] = newParam;
  toggleComponentParamTypeForm(element);
}

function updateComponentParamAll() {
  const tokens = [
    ...extractClassTokens(cdeComponent),
    ...extractClassTokens(cdeCSSComponent),
    ...extractClassTokens(cdeJSComponent),
  ].filter(Boolean);
  const uniqueTokens = [...new Set(tokens)];

  uniqueTokens.forEach((element) => {
    const inputDefault = getById("default-param-" + element)?.querySelector(
      ".input-default"
    );
    const def = inputDefault ? inputDefault.value : "";
    const type = getById("param-type-" + element)?.value ?? "empty";

    const newParam =
      type === "list"
        ? [element, type, [...(choicesComponent[element] || [])], def]
        : type === "empty"
        ? [element, type]
        : [element, type, def];

    paramsComponent[element] = newParam;
    toggleComponentParamTypeForm(element);
  });
}

function addComponentChoice(element) {
  const input = getById("choice-name-" + element);
  const name = input ? input.value.trim() : "";
  if (!name) { notify("Veuillez renseigner un choix.", "warning"); return; }
  if ((choicesComponent[element] || []).includes(name))
    { notify("Ce choix existe déjà.", "warning"); return; }
  choicesComponent[element] = [...(choicesComponent[element] || []), name];
  updateComponentChoiceList(element);
}

function delComponentChoice(element, index) {
  choicesComponent[element] = (choicesComponent[element] || []).filter(
    (_, i) => i !== index
  );
  updateComponentChoiceList(element);
}

// =======================
// Sauvegarde / copie
// =======================
async function saveComponent() {
  const component_name = document.querySelector("#component-name")?.value || "";
  updateComponentParamAll();

  if (component_name.trim() === "") {
    notify("veuillez assigner un nom au composant", "warning");
    return "error";
  }

  // Warn about ressource params without default value
  const missingDefaults = Object.entries(paramsComponent)
    .filter(([, p]) => p[1] === "ressource" && !p[2])
    .map(([name]) => name);
  if (missingDefaults.length > 0) {
    notify(`Attention : le(s) paramètre(s) "${missingDefaults.join(', ')}" est/sont de type "ressource" mais n'ont pas de valeur par défaut.`, "warning");
  }

  const data = (await loadData("component")) || {};
  const component_desc = document.querySelector("#component-desc")?.value || "";

  const text = {
    [component_name]: {
      desc: component_desc,
      "html-code": cdeComponent.trim(),
      "css-code": cdeCSSComponent.trim(),
      "js-code": cdeJSComponent.trim(),
      lib: libComponent,
      param: paramsComponent,
    },
  };

  const editComponent = sessionStorage.getItem("edit");
  if (Object.keys(data).includes(component_name) && editComponent === "null") {
    notify("Erreur: un composant avec le même nom existe déjà", "error");
    return;
  }
  data[component_name] = text[component_name];
  await addOrUpdateData("component", data);
  notify("Composant sauvegardé", "success");
}

// =======================
// Autosave
// =======================
let componentAutosaveTimer = null;

function setupComponentAutosave() {
  if (componentAutosaveTimer) { clearInterval(componentAutosaveTimer); componentAutosaveTimer = null; }
  try {
    const settings = JSON.parse(localStorage.getItem('qswb_settings') || '{}');
    const mode = settings.autosaveMode || 'off';
    if (mode === 'off') return;

    const doSave = debounce(() => {
      const name = document.querySelector('#component-name')?.value?.trim();
      if (name) saveComponent();
    }, 1000);

    if (mode === 'interval') {
      const interval = (parseInt(settings.autosaveInterval) || 30) * 1000;
      componentAutosaveTimer = setInterval(() => {
        const name = document.querySelector('#component-name')?.value?.trim();
        if (name) saveComponent();
      }, interval);
    } else if (mode === 'onchange') {
      document.querySelectorAll('#setCode textarea, #editCode input, #editCode textarea').forEach(el => {
        el.addEventListener('input', doSave);
      });
    }
  } catch (e) { console.warn('Component autosave error:', e); }
}

// =======================
// Initialisation
// =======================
async function init() {
  const editComponent = sessionStorage.getItem("edit");
  libData = await loadData("lib");

  if (editComponent !== "null") {
    const data = await loadData("component");
    const component_name = document.querySelector("#component-name");
    if (component_name) {
      component_name.value = editComponent;
      component_name.setAttribute("disabled", "1");
    }
    if (data?.[editComponent]) {
      document.querySelector("#component-desc").value =
        data[editComponent].desc || "";
      if (el.cdeComponentInput)
        el.cdeComponentInput.value = data[editComponent]["html-code"] || "";
      if (el.cdeCSSComponentInput)
        el.cdeCSSComponentInput.value = data[editComponent]["css-code"] || "";
      if (el.cdeJSComponentInput)
        el.cdeJSComponentInput.value = data[editComponent]["js-code"] || "";
      libComponent = data[editComponent].lib || [];
      paramsComponent = data[editComponent].param || {};
    }
  }

  loadMonacoComponent(function () {
    initMonacoEditors();
    syncMonacoEditors();
  });

  updateLib();
  if (el.editCdeCont) el.editCdeCont.style.display = "none";
  setupComponentAutosave();
}

// =======================
// Librairies
// =======================
function updateLib() {
  const libList = document.querySelector("#lib-select")?.querySelector("tbody");
  const libIncludeList = document.querySelector("#lib-include-list");
  if (!libList || !libIncludeList || !libData) return;

  libList.innerHTML = "";
  libIncludeList.innerHTML = "";

  new Set([...Object.keys(libData), ...libComponent]).forEach((libName) => {
    if (libName.includes(el.searchLib?.value || "")) {
      libList.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td scope="row">${libName} ${
          libComponent.includes(libName) &&
          !Object.keys(libData).includes(libName)
            ? `<span class="text-danger">(Librairie absente)</span>`
            : ""
        }</td>
          <td>
            <div class="form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                ${libComponent.includes(libName) ? "checked" : ""}
                oninput=libAction("${
                  libComponent.includes(libName) ? "delete" : "add"
                }","${libName}")
              />
            </div>
          </td>
        </tr>`
      );
    }
    if (libComponent.includes(libName)) {
      if (Object.keys(libData).includes(libName)) {
        libIncludeList.insertAdjacentHTML("beforeend", `<li>${libName}</li>`);
      } else {
        libIncludeList.insertAdjacentHTML(
          "beforeend",
          `<li class="text-secondary">${libName} (absente dans la base) </li>`
        );
      }
    }
  });

  if (libIncludeList.innerHTML === "") {
    libIncludeList.innerHTML = `Aucune librairie incluse`;
  }
}

if (el.searchLib) {
  el.searchLib.oninput = () => updateLib();
}

function libAction(action, lib) {
  if (action === "add") {
    if (!libComponent.includes(lib)) libComponent.push(lib);
    updateLib();
    return;
  }
  libComponent = libComponent.filter((item) => item !== lib);
  updateLib();
}

// =======================
// Lancer l'init au chargement
// =======================
document.addEventListener("DOMContentLoaded", init);

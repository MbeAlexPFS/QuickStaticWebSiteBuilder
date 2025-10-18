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
let choicesComponent = {}; // { paramName: [choices] }
let paramsComponent = {}; // { paramName: [name, type, value?, default?] }
let libComponent = []; // liste de libs incluses

let libData; // chargé à l'init

// =======================
// Utilitaires
// =======================

// Extraction des tokens { *name* } -> retourne un tableau unique de noms
const extractClassTokens = (input = "") => {
  if (!input) return [];
  // capture uniquement alphanum (identique à ton regex original)
  const re = /\{\*([A-Za-z0-9]+)\*\}/g;
  const set = [];
  let m;
  while ((m = re.exec(input)) !== null) set.push(m[1]);
  return [...set];
};

const getById = (id) => document.querySelector("#" + id);

// Beautify (gardé tel quel, appelle fonctions externes)
function beautify() {
  if (el.cdeComponentInput)
    el.cdeComponentInput.value = html_beautify(el.cdeComponentInput.value, {
      indent_size: 2,
    });
  if (el.cdeCSSComponentInput)
    el.cdeCSSComponentInput.value = autoBeautify(el.cdeCSSComponentInput.value);
  if (el.cdeJSComponentInput)
    el.cdeJSComponentInput.value = autoBeautify(el.cdeJSComponentInput.value);
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

  if (!html.trim()) return alert("Vous devez entrer un code pour continuer.");

  //verifier si il y'a des paramettres doubles
  let params = [
    ...extractClassTokens(html),
    ...extractClassTokens(css),
    ...extractClassTokens(js),
  ];

  if (params.length > new Set(params).size) {
    return alert("Les paramètres doivent être uniques.");
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

  // récupérer tous les tokens des 3 sources (unique)
  const tokens = [
    ...extractClassTokens(cdeComponent),
    ...extractClassTokens(cdeCSSComponent),
    ...extractClassTokens(cdeJSComponent),
  ].filter(Boolean);
  const uniqueTokens = [...new Set(tokens)];

  const compoData = editing ? await loadData("component") : null;
  const editKey = editing ? sessionStorage.getItem("edit") : null;

  uniqueTokens.forEach((name) => {
    // HTML fragment pour le param (identique à ton markup)
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

    // initialisation de l'état local
    if (!editing) {
      choicesComponent[name] = [];
      paramsComponent[name] = [name, "empty"];
      // appliquer l'affichage par défaut
      toggleComponentParamTypeForm(name);
      updateComponentChoiceList(name);
    } else {
      // éditer : restaurer l'état si présent
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
        // si pas de param dans le composant édité, fallback
        choicesComponent[name] = [];
        paramsComponent[name] = [name, "empty"];
      }
      toggleComponentParamTypeForm(name);
    }
  });
}

// toggler le formulaire par type
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
    // Construire <select> depuis choicesComponent[element]
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
    // hide form si empty
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

// met à jour la liste de choix affichée et l'état paramsComponent
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
  // regénérer la liste unique des tokens
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

// ajout / suppression choix
function addComponentChoice(element) {
  const input = getById("choice-name-" + element);
  const name = input ? input.value.trim() : "";
  if (!name) return alert("Veuillez renseigner un choix.");
  if ((choicesComponent[element] || []).includes(name))
    return alert("Ce choix existe déjà.");
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
    alert("veuillez assigner un nom au composant");
    return "error";
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
    alert("Erreur: un composant avec le même nom existe déjà");
    return;
  }
  data[component_name] = text[component_name];
  await addOrUpdateData("component", data);
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

  updateLib();
  if (el.editCdeCont) el.editCdeCont.style.display = "none";
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

  Object.keys(libData).forEach((libName) => {
    if (libName.includes(el.searchLib?.value || "")) {
      libList.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td scope="row">${libName}</td>
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
      libIncludeList.insertAdjacentHTML("beforeend", `<li>${libName}</li>`);
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
// Rendu / Prévisualisation
// =======================
// Remplace tous les tokens par les valeurs actuelles (une seule passe par type)
function renderComponent(data) {
  let renderHTML = data["html-code"] ?? "";
  let renderCSS = data["css-code"] ?? "";
  let renderJS = data["js-code"] ?? "";

  // construire liste unique de tokens présents dans les 3 parties
  const tokens = [
    ...extractClassTokens(renderHTML),
    ...extractClassTokens(renderCSS),
    ...extractClassTokens(renderJS),
  ];
  const unique = [...new Set(tokens)];

  unique.forEach((param) => {
    const p = data.param?.[param] ?? [param, "empty"];
    const type = p[1];
    const replacement = type === "list" ? p[3] ?? "" : p[2] ?? "";
    const token = `{*${param}*}`;
    // replaceAll est disponible ; si besoin on peut fallback
    renderHTML = renderHTML.split(token).join(replacement);
    renderCSS = renderCSS.split(token).join(replacement);
    renderJS = renderJS.split(token).join(replacement);
  });

  // parse HTML/CSS/JS
  const parser = new DOMParser();
  const doc = parser.parseFromString(renderHTML, "text/html");
  const body = doc.body;
  const firstElement = [...body.childNodes].find((n) => n.nodeType === 1);

  if (firstElement) {
    firstElement.setAttribute("id", "component-preview");
    firstElement.classList.add("component-element");
  }

  return [body.innerHTML, renderCSS, renderJS];
}

async function updateRealView(data /* objet composant */) {
  // Génère rendu une fois
  const [htmlBody, cssBody, jsBody] = renderComponent(data);

  const cssLinks =
    cssBody.trim() !== ""
      ? `<style> #component-preview {${cssBody}} </style>`
      : "";

  const jsScripts =
    jsBody.trim() !== ""
      ? `<script> document.querySelectorAll('.component-element').forEach((component) => { if (component.id === 'component-preview') {
        ${jsBody}
        }});</script>`
      : "";

  // inclusion libs
  let libInclusion = "";
  (libComponent || []).forEach((name) => {
    const libinfo = libData?.[name];
    if (!libinfo) return;
    libInclusion += libinfo.type ? libinfo.link : libinfo.file;
  });

  const srcdoc = `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      ${libInclusion}
      ${cssLinks}
    </head>
    <body>
      ${htmlBody}
      ${jsScripts}
    </body>
    </html>`;

  if (!el.realView) return;

  el.realView.srcdoc = srcdoc;
  // masquer pendant l'ajout d'évts pour éviter flicker
  el.realView.classList.add("d-none");

  // Bloquer navigation dans l'iframe (si contentDocument accessible)
  try {
    const doc = el.realView.contentDocument;
    if (doc) {
      doc.body.addEventListener("click", (e) => {
        if (e.target.tagName === "A" || e.target.closest("a")) {
          e.preventDefault();
        }
      });
    }
  } catch (err) {
    // cross-origin ou timing : on ignore silencieusement (comportement inchangé)
  }

  el.realView.classList.remove("d-none");
}

if (el.previewBtn) {
  el.previewBtn.onclick = () => {
    updateRealView({
      "html-code": cdeComponent.trim(),
      "css-code": cdeCSSComponent.trim(),
      "js-code": cdeJSComponent.trim(),
      param: paramsComponent,
    });
  };
}

// =======================
// Lancer l'init au chargement
// =======================
document.addEventListener("DOMContentLoaded", init);

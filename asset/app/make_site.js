// ========================== Site Configuration ============================= //
let globalJSFiles = [];
let globalCSSFiles = [];
let library = [];
let sitePages = [];
let componentData = loadData("component");

var libraryData = ['','']

// Editor data
let selectedPage = "";
let selectedElement = "";
let copiedElement = [];
let selectedComponent = "";
let editorInputID = '';
let record = 0;

// DOM elements
const element = {
    site: document.querySelector("#site-form"),
    page: document.querySelector("#site-page-editor")
};

const elPageEditor = {
    view: document.querySelector("#page-view"),
    form: document.querySelector("#element-form"),
    root: document.querySelector("#root-form"),
    selected: document.querySelector("#selected-element"),
    selectedComponent: document.querySelector("#selected-component"),
    emptyParam: document.querySelector("#element-empty-param"),
    emptyParamForm: document.querySelector("#form-empty-param"),
    paramForm: document.querySelector("#element-param-form"),
    anim: document.querySelector("#element-onview-anim"),
    component: document.querySelector("#component-selector"),
    copied: document.querySelector("#copied-element"),
    copiedForm: document.querySelector("#element-copied-form"),
    viewed: document.querySelector("#page"),
    realView: document.querySelector("#realview"),
};

// Extraction regex (retourne les valeurs sans {* *})
const extractClassTokens = input => {
    const matches = [...input.matchAll(/\{\*([A-Za-z0-9]+)\*\}/g)];
    let param1 = matches.map(m => m[1])
    let param2 = []
    for (const p1 of param1) {
        param2.includes(p1) ? "" : param2.push(p1)
    }
    return param2;
};

//Fonctions permettant l'enumération des fichiers dans un dossier spécifique
//verification tool
function isHTML(str) {
  const regex = /<\/?[a-z][\s\S]*>/i;
  return regex.test(str);
}

//function to list all files in a directory in client side -- must use timeOut to use data
function listFiles(folder) {
    let list = {}
    fetch(folder)
        .then(response => response.text())
        .then(data => {
            //text to html
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');
            //extract the file list and recursively if folder inside
            const fileList = doc.querySelector(".view-tiles").querySelectorAll('a');
            fileList.forEach(file => {
                let href = file.href
                fetch(href)
                .then(response => response.text())
                .then(data => {
                    if (file.title !== "..") {
                        if (!isHTML(data)) {
                            list[file.title] = data
                        }
                    }
                })
            })
        })
        .catch(error => console.error('Error fetching file list:', error));
    return list
}

// ========================== Asynchrone : Initialisation ============================= //

async function initSiteEditor() {
    // Chargement asynchrone des composants
    componentData = await loadData("component") || {};

    // Chargement asynchrone du site à éditer si présent
    if (sessionStorage.getItem("editsite") !== "null") {
        let site = sessionStorage.getItem("editsite");
        let data = await loadData("site") || {};
        document.querySelector("#site-name").value = data[site].name;
        document.querySelector("#site-desc").value = data[site].desc;
        document.querySelector("#site-lang").value = data[site].lang;
        document.querySelector("#site-meta").value = data[site].meta;
        library = data[site].lib
        globalCSSFiles = data[site].css;
        globalJSFiles = data[site].js;
        sitePages = data[site].content;
        record = data[site].record
        updatePageForm();
        renderGlobalCodeCSS();
        renderGlobalCodeJS();
        renderPageSelector();
        renderPages();
        alert("page chargé avec succès");
    }

    // Initialisation de l'interface
    show("site");
    updateRealView();
    updatePageForm();
    updateComponentSelector();
}

document.addEventListener("DOMContentLoaded", initSiteEditor);

// ============================ Navigation ============================
function show(page, pageSelection = null) {
    Object.keys(element).forEach(pg => {
        element[pg].classList.toggle("d-none", pg !== page);
    });

    if (pageSelection !== null) {
        selectedPage = pageSelection;
        renderPageSelector();
        renderPagesView();

        //initialise le iframe pour chaque page
        let page = sitePages.find(pg => pg.name === selectedPage);

        elPageEditor.view.contentDocument.head.innerHTML =
        `<meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/asset/aos.css">
        <script src="/asset/aos.js"></script>
        <style>
            .component-element {
                border: 2px solid dodgerblue;
                border-style: dashed;
                padding: 5px;
            }
        
            .component-element:hover {
                background-color: var(--bs-light);
                cursor: pointer;
            }
            .component-element-selected {
                border: 2px solid purple;
                box-shadow: 0 0 10px rgb(30, 0, 255);
                padding: 4px;
                border-radius: 4px;
            }
        
            .component-element-debug-name {
                color: dodgerblue;
            }
        </style>` +
        Object.keys(page.include.lib).flatMap(lib_name => 
            library.filter(lib => lib.name === lib_name)
                   .map(lib => lib.type === "script" ? `<script>${lib.content}</script>` : `<style>${lib.content}</style>`)
        ).join('') +
        Object.keys(page.include.css).flatMap(css_name => 
            globalCSSFiles.filter(css => css.name === css_name)
                          .map(css => `<style>${css.content}</style>`)
        ).join('') +
        (page.css ? `<style>${page.css}</style>` : '');

        elPageEditor.view.contentDocument.body.addEventListener("click", e => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                e.preventDefault(); // Bloque la navigation
            }
            // On remonte jusqu'au composant le plus proche contenant un ID
            const target = e.target.closest(".component-element");
            if (target && target.dataset.id) {
                e.stopPropagation(); // empêche les clics parents de se déclencher en double
                selectElement(target.dataset.id);
            }
        });
    }
}

// ======================== Editeur de code ===========================
function openEditor(label,inputID) {
    const editorModal = new bootstrap.Modal(document.getElementById('codeEditor'));
    editorModal.show();
    document.getElementById('codeEditorLabel').textContent = label;
    editorInputID = inputID;
    document.querySelector('#codeEditor').querySelector('textarea').value = document.querySelector(editorInputID).value;
}

function beautify() {
    document.querySelector('#codeEditor').querySelector('textarea').value = autoBeautify(document.querySelector('#codeEditor').querySelector('textarea').value)
    document.querySelector(editorInputID).value = document.querySelector('#codeEditor').querySelector('textarea').value
}

document.querySelector('#codeEditor').querySelector('textarea').oninput = () => {
    document.querySelector(editorInputID).value = document.querySelector('#codeEditor').querySelector('textarea').value
}

// ============================ Sauvegarde du site ============================
async function saveSite() {
    let site = {
        name: document.querySelector("#site-name").value,
        desc: document.querySelector("#site-desc").value,
        lang: document.querySelector("#site-lang").value,
        meta: document.querySelector("#site-meta").value,
        lib: library,
        js: globalJSFiles,
        css: globalCSSFiles,
        content: sitePages,
        record: record
    }
    if (site.name.trim() == "") {
        alert("veuillez assigner un nom au site")
        return "error"
    } else {
        let data = await loadData("site") || {};
        let res;
        if (Object.keys(data).includes(site.name)) {
            res = prompt("Un site avec le meme nom existe déjà. Voulez vous le remplacer ? y pour oui");
        } else {
            data[site.name] = site;
        }
        if (res === "y") {
            data[site.name] = site;
        }
        await addOrUpdateData("site", data);
    }
}

// ============================ Page Selector ============================
function renderPageSelector() {
    const elPageSelector = document.querySelector("#page-selector");
    const previewName = document.querySelector("#page-name-editing");

    elPageSelector.innerHTML = "";

    sitePages.forEach(pg => {
        const buttonClass = pg.name === selectedPage ? "warning" : "danger";
        elPageSelector.innerHTML += `
            <button type="button" class="btn btn-${buttonClass}" onclick="show('page','${pg.name}')">
                ${pg.name}
            </button>`;
    });

    previewName.textContent = selectedPage;
}

// ============================ Library ============================
document.getElementById('library-file').addEventListener('change', function(event) { //basé sur un code javascript importé pour charger une base
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            libraryData[0] = file.name
            libraryData[1] = e.target.result
        };
        reader.readAsText(file);
    } else {
        console.error('No file selected');
    }
});

function addLibraryFile() {
    const type = document.getElementById('library-type').value;
    if (libraryData[0] === '') {
        return alert("Veuillez selectionner une librairie d'abord.");
    }else if (library.find(lib => lib.name === libraryData[0])) {
        return alert("Cette librairie existe déjà");
    }

    library.push({
        id: Date.now(),
        type: type,
        name: libraryData[0],
        content: libraryData[1]
    });

    renderLibrary();
    document.getElementById('library-file').value = '';
    document.getElementById('library-type').value = 'script';
    libraryData = ['',''];
    renderPages();
}

function deleteLibrary(id) {
    const index = library.findIndex(f => f.id === id);
    if (index !== -1) {
        const fileName = library[index].name;
        for (const page of sitePages) {
            delete page.include["lib"][fileName];
        }
        library.splice(index, 1);
        renderLibrary();
        renderPages();
    }
}

function renderLibrary() {
    const tbody = document.getElementById('libraryList');
    tbody.innerHTML = '';
    library.forEach(file => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${file.name}</td>
            <td>${file.type}</td>
            <td>
            <button class="btn btn-danger btn-sm" onclick="deleteLibrary(${file.id})">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================ JS ============================
function addGlobalCodeJS() {
    const name = document.getElementById('global-js-name').value.trim();
    const content = document.getElementById('global-js-content').value.trim();

    if (!name || !content) {
        return alert("Remplir tous les champs JS");
    }else if (globalJSFiles.find(gljs => gljs.name === name)) {
        return alert("Cet script existe déjà");
    }

    globalJSFiles.push({
        id: Date.now(),
        name,
        content
    });
    renderGlobalCodeJS();
    document.getElementById('global-js-name').value = '';
    document.getElementById('global-js-content').value = '';
    renderPages();
}

function deleteGlobalCodeJS(id) {
    const index = globalJSFiles.findIndex(f => f.id === id);
    if (index !== -1) {
        const fileName = globalJSFiles[index].name;
        for (const page of sitePages) {
            delete page.include["js"][fileName];
        }
        globalJSFiles.splice(index, 1);
        renderGlobalCodeJS();
        renderPages();
    }
}

function renderGlobalCodeJS() {
    const tbody = document.getElementById('globalCodeJSList');
    tbody.innerHTML = '';
    globalJSFiles.forEach(file => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${file.name}</td>
            <td>
            <div class="input-block w-100">
                <textarea style="white-space: pre-wrap;" id="code-js-content-${file.id}">${file.content}</textarea>
                <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier javascript : ${file.name}','#code-js-content-${file.id}')">+</button>
            </div>
            </td>
            <td>
            <button class="btn btn-danger btn-sm" onclick="updateGlobalCodeJS(${file.id})">Mettre à jour</button>
            <button class="btn btn-danger btn-sm" onclick="deleteGlobalCodeJS(${file.id})">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateGlobalCodeJS(id) {
    let data = document.querySelector(`#code-js-content-${id}`).value
    const index = globalJSFiles.findIndex(f => f.id === id);
    if (index !== -1) {
        globalJSFiles[index].content = data;
        renderGlobalCodeJS();
        renderPages();
        alert("fichier js global mis à jour avec succès")
    }
}

// ============================ CSS ============================
function addGlobalCodeCSS() {
    const name = document.getElementById('global-css-name').value.trim();
    const content = document.getElementById('global-css-content').value.trim();

    if (!name || !content) {
        return alert("Remplir tous les champs CSS");
    }else if (globalCSSFiles.find(glcss => glcss.name === name)) {
        return alert("Cet style existe déjà");
    }

    globalCSSFiles.push({
        id: Date.now(),
        name,
        content
    });
    renderGlobalCodeCSS();
    document.getElementById('global-css-name').value = '';
    document.getElementById('global-css-content').value = '';
    renderPages();
}

function deleteGlobalCodeCSS(id) {
    const index = globalCSSFiles.findIndex(f => f.id === id);
    if (index !== -1) {
        const fileName = globalCSSFiles[index].name;
        for (const page of sitePages) {
            delete page.include["css"][fileName];
        }
        globalCSSFiles.splice(index, 1);
        renderGlobalCodeCSS();
        renderPages();
    }
}

function renderGlobalCodeCSS() {
    const tbody = document.getElementById('globalCodeCSSList');
    tbody.innerHTML = '';
    globalCSSFiles.forEach(file => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${file.name}</td>
            <td>
            <div class="input-block w-100">
                <textarea style="white-space: pre-wrap;" id="code-css-content-${file.id}">${file.content}</textarea>
                <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier css : ${file.name}','#code-css-content-${file.id}')">+</button>
            </div>
            </td>
            <td>
            <button class="btn btn-danger btn-sm" onclick="updateGlobalCodeCSS(${file.id})">Mettre à jour</button>
            <button class="btn btn-danger btn-sm" onclick="deleteGlobalCodeCSS(${file.id})">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateGlobalCodeCSS(id) {
    let data = document.querySelector(`#code-css-content-${id}`).value
    const index = globalCSSFiles.findIndex(f => f.id === id);
    if (index !== -1) {
        globalCSSFiles[index].content = data;
        renderGlobalCodeCSS();
        renderPages();
        alert("fichier css global mis à jour avec succès")
    }
}

// ============================ Pages ============================
function addPage() {
    const name = document.getElementById('page-name').value.trim();
    const title = document.getElementById('page-title').value.trim();
    const js = document.getElementById('page-js').value.trim();
    const css = document.getElementById('page-css').value.trim();

    if (!name || !title) {
        return alert("Nom du fichier et titre de la page obligatoires");
    } else if (sitePages.find(pg => pg.name === name)) {
        return alert("Cette page existe déjà");
    }

    const page = {
        id: Date.now(),
        name,
        title,
        js,
        css,
        include: {
            lib: {},
            js: {},
            css: {}
        },
        data: []
    };

    sitePages.push(page);
    renderPages();
    renderPageSelector();
    document.getElementById('page-name').value = '';
    document.getElementById('page-title').value = '';
    document.getElementById('page-js').value = '';
    document.getElementById('page-css').value = '';
}

function deletePage(id) {
    const index = sitePages.findIndex(p => p.id === id);
    if (index !== -1) {
        sitePages.splice(index, 1);
        renderPages();
        renderPageSelector();
    }
}

function renderPages() {
    const tbody = document.getElementById('page-list');
    tbody.innerHTML = '';
    sitePages.forEach(page => {
        const libCheckboxes = library.map(lib => `
            <div class="form-check">
                <input
                    class="form-check-input"
                    id="page-${page.name}-lib-${lib.name}"
                    type="checkbox"
                    ${Object.keys(page.include["lib"]).includes(lib.name) ? 'checked' : ""}
                    onchange="addInclude('${page.name}', '${lib.name}', 'lib')"
                />
                <label class="form-check-label">${lib.name}</label>
            </div>
        `).join('');

        const jsCheckboxes = globalJSFiles.map(gljs => `
            <div class="form-check">
                <input
                    class="form-check-input"
                    id="page-${page.name}-js-${gljs.name}"
                    type="checkbox"
                    ${Object.keys(page.include["js"]).includes(gljs.name) ? 'checked' : ""}
                    onchange="addInclude('${page.name}', '${gljs.name}', 'js')"
                />
                <label class="form-check-label">${gljs.name}</label>
            </div>
        `).join('');

        const cssCheckboxes = globalCSSFiles.map(glcss => `
            <div class="form-check">
                <input
                    class="form-check-input"
                    type="checkbox"
                    id="page-${page.name}-css-${glcss.name}"
                    ${Object.keys(page.include["css"]).includes(glcss.name) ? 'checked' : ""}
                    onchange="addInclude('${page.name}', '${glcss.name}', 'css')"
                />
                <label class="form-check-label">${glcss.name}</label>
            </div>
        `).join('');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${page.name}</td>
            <td>${page.title}</td>
            <td>
            <div class="input-block w-100">
                <textarea style="white-space: pre-wrap;" id="code-js-page-${page.id}">${page.js}</textarea>
                <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier javascript de la page : ${page.name}','#code-js-page-${page.id}')">+</button>
            </div>
            </td>
            <td>
            <div class="input-block w-100">
                <textarea style="white-space: pre-wrap;" id="code-css-page-${page.id}">${page.css}</textarea>
                <button class="btn btn-primary input-button" onclick="openEditor('Contenu du fichier css de la page : ${page.name}','#code-css-page-${page.id}')">+</button>
            </div>
            </td>
            <td>${libCheckboxes}</td>
            <td>${jsCheckboxes}</td>
            <td>${cssCheckboxes}</td>
            <td>
            <button class="btn btn-danger btn-sm" onclick="updatePage(${page.id})">Mettre à jour</button>
            <button class="btn btn-danger btn-sm" onclick="deletePage(${page.id})">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updatePage(id) {
    let dataCSS = document.querySelector(`#code-css-page-${id}`).value
    let dataJS = document.querySelector(`#code-js-page-${id}`).value
    const index = sitePages.findIndex(f => f.id === id);
    if (index !== -1) {
        sitePages[index].js = dataJS;
        sitePages[index].css = dataCSS;
        renderPages();
        alert("les codes locaux js, css et la librairie mises à jour avec succès")
    }
}

function addInclude(pageName, inclusion, type) {
    const page = sitePages.find(p => p.name === pageName);
    if (!page) return;

    const checkbox = document.getElementById(`page-${pageName}-${type}-${inclusion}`);
    if (checkbox.checked) {
        page.include[type][inclusion] = true;
    } else {
        delete page.include[type][inclusion];
    }

    renderPages();
}

// ========================== Page Edition ============================= //
document.querySelector("#searchComponent").oninput = () => {
    updateComponentSelector(document.querySelector("#searchComponent").value)
}

function selectComponent(component) {
    selectedComponent = component;
    updatePageForm();
    updateComponentSelector();
}

function updateComponentSelector(search = "") {
    elPageEditor.component.innerHTML = ``;

    Object.keys(componentData).forEach(cpn => {
        // Préparer le HTML du composant
        let componentHtml = componentData[cpn]["html-code"];

        // Remplacer les paramètres par leurs valeurs par défaut
        extractClassTokens(componentHtml).forEach(param => {
            const paramInfo = componentData[cpn].param[param];
            const type = paramInfo[1];

            if (type !== "empty") {
                const defaultValue = type === "list" ? paramInfo[3] : paramInfo[2];
                componentHtml = componentHtml.replaceAll(`{*${param}*}`, defaultValue);
            }
        });

        // Créer la carte du composant
        const isSelected = cpn === selectedComponent;
        if (cpn.toLowerCase().includes(search.toLowerCase())) {
            elPageEditor.component.innerHTML += `
                <div class="component-card p-2 bg-primary rounded ${isSelected ? "text-primary border border-2 border-primary shadow bg-light" : "text-light"}" onclick="selectComponent('${cpn}')"  title="${ componentData[cpn].desc}">
                    ${cpn}
                </div>`;
        }
    });
}

function findElementById(dataArray, id) {
    for (const el of dataArray) {
        if (el.id === id) return el;

        for (const key of Object.keys(el.param)) {
            const [label, type, value] = el.param[key];
            if (type === "empty" && Array.isArray(value)) {
                const found = findElementById(value, id);
                if (found) return found;
            }
        }
    }
    return null;
}

function updatePageForm() {
    elPageEditor.selectedComponent.textContent = selectedComponent;
    elPageEditor.selected.textContent = selectedElement;

    elPageEditor.root.classList.toggle("d-none", !selectedComponent);
    elPageEditor.form.classList.toggle("d-none", !selectedElement);

    elPageEditor.emptyParamForm.classList.add("d-none");
    elPageEditor.paramForm.classList.add("d-none");
    elPageEditor.copiedForm.classList.add("d-none");
    elPageEditor.emptyParam.innerHTML = ``;
    elPageEditor.paramForm.innerHTML = `<div class="d-grid"><button class="btn btn-primary" onclick=submitParam() > Mettre à jour </button></div>`;

    if (copiedElement[0]) {
        elPageEditor.copiedForm.classList.remove("d-none");
        elPageEditor.copied.textContent = copiedElement[0]
    }

    if (selectedElement) {
        const page = sitePages.find(pg => pg.name === selectedPage);
        const selectedEl = findElementById(page.data, selectedElement);
        if (!selectedEl) return;

        for (const param of Object.keys(selectedEl.param)) {
            elPageEditor.paramForm.classList.remove("d-none");
            if (selectedEl.param[param][1] === "empty") {
                elPageEditor.emptyParamForm.classList.remove("d-none");
                elPageEditor.emptyParam.innerHTML += `<option value="${param}" >${param}</option>`;
            } else if (selectedEl.param[param][1] === "list") {
                elPageEditor.paramForm.innerHTML =
                    `<div class="mb-3">
                    <label for="" class="form-label">${ param }</label>
                    <select
                        type="${selectedEl.param[param][1]}"
                        class="form-control"
                        id="param-data-${param}"
                    >
                        ${(() => {
                            let render = ``
                            for (const element of selectedEl.param[param][2]) {
                                render += `<option value="${element}" ${selectedEl.param[param][3] === element ? "selected" : ""} >${element}</option>`    
                            }
                            return render
                        })()}
                    </select>
                </div>` + elPageEditor.paramForm.innerHTML;
            } else if(selectedEl.param[param][1] === "textarea") {
                elPageEditor.paramForm.innerHTML =
                    `<div class="mb-3">
                    <label for="" class="form-label">${ param }</label>
                    <textarea
                        type="${selectedEl.param[param][1]}"
                        class="form-control"
                        id="param-data-${param}"
                    >${selectedEl.param[param][2]}</textarea>
                </div>` + elPageEditor.paramForm.innerHTML;
            } else {
                elPageEditor.paramForm.innerHTML =
                    `<div class="mb-3">
                    <label for="" class="form-label">${ param }</label>
                    <input
                        type="${selectedEl.param[param][1]}"
                        class="form-control"
                        id="param-data-${param}"
                        value="${selectedEl.param[param][2]}"
                    />
                </div>` + elPageEditor.paramForm.innerHTML;
            }
        }
        elPageEditor.anim.value = selectedEl.anim
    }
}

function findElementAndParent(dataArray, id, parent = null, paramKey = null) {
    for (let i = 0; i < dataArray.length; i++) {
        const el = dataArray[i];
        if (el.id === id) {
            return {
                parentArray: dataArray,
                index: i,
                parent,
                paramKey
            };
        }

        for (const key of Object.keys(el.param)) {
            const [label, type, value] = el.param[key];
            if (type === "empty" && Array.isArray(value)) {
                const result = findElementAndParent(value, id, el, key);
                if (result) return result;
            }
        }
    }
    return null;
}

elPageEditor.anim.oninput = () => {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const selectedEl = findElementById(page.data, selectedElement);
    if (!selectedEl) return;
    selectedEl.anim = elPageEditor.anim.value
    updatePageForm()
}

function copieElement() {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const selectedEl = findElementById(page.data, selectedElement);
    if (!selectedEl) return;

    const deepCopy = JSON.parse(JSON.stringify(selectedEl));
    copiedElement = [selectedElement, deepCopy];
    updatePageForm();
    record += 1;
}

function cancelCopie() {
    copiedElement = []
    updatePageForm()
}

function addRootStart(paste = false) {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const cpn = JSON.parse(JSON.stringify(componentData[selectedComponent])); // Copie profonde
    cpn.id = `component-${selectedComponent}-${record}`
    cpn.anim = "none";
    if (page) {
    if (!paste) {
        page.data.unshift(cpn);
    } else {
        const pasted = JSON.parse(JSON.stringify(copiedElement[1]));
        pasted.id = `component-${selectedComponent}-${record}`;
        page.data.unshift(pasted);
    }
    renderPagesView();
    }
    record += 1;
}

function addRootEnd(paste = false) {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const cpn = JSON.parse(JSON.stringify(componentData[selectedComponent])); // Copie profonde
    cpn.id = `component-${selectedComponent}-${record}`;
    cpn.anim = "none";
    if (page) {
    if (!paste) {
        page.data.push(cpn);
    } else {
        const pasted = JSON.parse(JSON.stringify(copiedElement[1]));
        pasted.id = `component-${selectedComponent}-${record}`;
        page.data.push(pasted);
    }
    renderPagesView();
    }
    
    record += 1;
}

function addBefore(paste = false) {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const found = findElementAndParent(page.data, selectedElement);
    if (!found) return;

    const cpn = JSON.parse(JSON.stringify(componentData[selectedComponent]));
    cpn.id = `component-${selectedComponent}-${record}`;
    cpn.anim = "none";

    if (page) {
    if (!paste) {
        found.parentArray.splice(found.index, 0, cpn)
    } else {
        const pasted = JSON.parse(JSON.stringify(copiedElement[1]));
        pasted.id = `component-${selectedComponent}-${record}`;
        found.parentArray.splice(found.index, 0, pasted);
    }
    }
    record += 1;

    updatePageForm();
    renderPagesView();
}

function addAfter(paste = false) {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const found = findElementAndParent(page.data, selectedElement);
    if (!found) return;

    const cpn = JSON.parse(JSON.stringify(componentData[selectedComponent]));
    cpn.id = `component-${selectedComponent}-${record}`;
    cpn.anim = "none";
    
    if (page) {
    if (!paste) {
        found.parentArray.splice(found.index + 1, 0, cpn)
    } else {
        const pasted = JSON.parse(JSON.stringify(copiedElement[1]));
        pasted.id = `component-${selectedComponent}-${record}`;
        found.parentArray.splice(found.index + 1, 0, pasted);
    }
    }
    record += 1;

    updatePageForm();
    renderPagesView();
}

function addIn(paste = false) {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const selectedEl = findElementById(page.data, selectedElement); // récursif
    const emptyTarget = elPageEditor.emptyParam.value;

    if (!selectedEl || !emptyTarget || selectedEl.param[emptyTarget][1] !== "empty") return;

    const cpn = JSON.parse(JSON.stringify(componentData[selectedComponent]));
    cpn.id = `component-${selectedComponent}-${record}`;
    cpn.anim = "none";


    // Initialisation si nécessaire
    if (!Array.isArray(selectedEl.param[emptyTarget][2])) {
        selectedEl.param[emptyTarget][2] = [];
    }

    // Insertion à l’index 2 (ou fin si moins de 2 éléments)
    const targetArray = selectedEl.param[emptyTarget][2];
    const insertIndex = Math.min(2, targetArray.length);
    if (page) {
    if (!paste) {
        targetArray.splice(insertIndex, 0, cpn)
    } else {
        const pasted = JSON.parse(JSON.stringify(copiedElement[1]));
        pasted.id = `component-${selectedComponent}-${record}`;
        targetArray.splice(insertIndex, 0, pasted)
    }
    }

    record += 1;

    updatePageForm();
    renderPagesView();
}

function delElement() {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const found = findElementAndParent(page.data, selectedElement);
    if (!found) return;

    found.parentArray.splice(found.index, 1); // supprime

    if (selectedElement === copiedElement[0]) {
        copiedElement = []
    }

    selectedElement = null;
    updatePageForm();
    renderPagesView();
}

function submitParam() {
    const page = sitePages.find(pg => pg.name === selectedPage);
    const found = findElementById(page.data, selectedElement);
    if (!found) return;

    for (const param of Object.keys(found.param)) {
        found.param[param][1] !== "empty" ? (found.param[param][1] === "list" ? found.param[param][3] = document.querySelector("#param-data-" + param).value : found.param[param][2] = document.querySelector("#param-data-" + param).value) : ""
    }
    updatePageForm();
    renderPagesView();
}

function selectElement(id) {
    selectedElement = id;
    updatePageForm();
    renderPagesView();
}

function renderPagesView() {
    elPageEditor.view.contentDocument.body.innerHTML = '';
    const page = sitePages.find(pg => pg.name === selectedPage);
    if (!page) return;

    page.data.forEach(data => {
        elPageEditor.view.contentDocument.body.innerHTML += renderComponent(data);
    });

    updateRealView()

    elPageEditor.view.contentDocument.body.innerHTML += 
        Object.keys(page.include.js).flatMap(js_name => 
            globalJSFiles.filter(js => js.name === js_name).map(js => `<script>${js.content}</script>`)
        ).join('')
        + (page.js ? `<script>${page.js}</script>` : ``)
}

function renderComponent(data, isRealView = false) {
    let render = data["html-code"];

    extractClassTokens(render).forEach(param => {
        const [label, type, value] = data.param[param];
        if (type === "empty" && Array.isArray(value)) {
            const nested = value.map(child => renderComponent(child, isRealView)).join('');
            render = render.replaceAll(`{*${param}*}`, nested);
        } else if (type === "list") {
            render = render.replaceAll(`{*${param}*}`, data.param[param][3]);
        } else {
            render = render.replaceAll(`{*${param}*}`, value);
        }
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(render, 'text/html');
    const body = doc.body;
    const firstElement = [...body.childNodes].find(node => node.nodeType === 1);

    if (firstElement) {
        if (isRealView && data.anim && data.anim !== "none") {
            firstElement.setAttribute("data-aos", data.anim);
        }

        if (!isRealView) {
            const isSelected = data.id === selectedElement;
            const baseClass = 'component-element' + (isSelected ? '-selected' : '');
            firstElement.classList.add(...baseClass.split(' '));
            firstElement.setAttribute('data-id', data.id);
            firstElement.setAttribute('title', `ID: ${data.id}`);
        }
    }

    return body.innerHTML;
}

function updateRealView() {
    const page = sitePages.find(pg => pg.name === selectedPage);

    if (!selectedPage || !page) {
        elPageEditor.viewed.textContent = "Aucune page sélectionnée";
        elPageEditor.realView.contentDocument.head.innerHTML = '';
        elPageEditor.realView.contentDocument.body.innerHTML = '';
        return;
    }

    elPageEditor.viewed.textContent = selectedPage;

    // Génération du HTML des composants (avec animations si définies)
    const htmlBody = page.data.map(data => renderComponent(data, true)).join('\n');

    // CSS globaux inclus
    const cssLinks = Object.keys(page.include.css).map(name => {
        const file = globalCSSFiles.find(f => f.name === name);
        return file ? `<style>\n${file.content}\n</style>` : '';
    }).join('\n');

    // JS globaux inclus
    const jsScripts = Object.keys(page.include.js).map(name => {
        const file = globalJSFiles.find(f => f.name === name);
        return file ? `<script>\n${file.content}\n</script>` : '';
    }).join('\n');

    // CSS/JS spécifiques à la page
    const pageCSS = page.css ? `<style>\n${page.css}\n</style>` : '';
    const pageJS = page.js ? `<script>\n${page.js}\n</script>` : '';
    
    // Initialisation AOS si au moins un composant l'utilise
    const aosNeeded = page.data.some(comp => comp.anim && comp.anim !== 'none');
    const aosInit = aosNeeded ? `<script>AOS.init();</script>` : '';

    //inclusion de la librairie
    let libInclusion = ``;
    library.map(lib => libInclusion += lib.type === "script" ? `<script>${lib.content}</script>` : `<style>${lib.content}</style>`)

    elPageEditor.realView.srcdoc = `
    <!DOCTYPE html>
    <html lang="${document.querySelector("#site-lang").value}">
    <head>
    ${document.querySelector("#site-meta").value}
    <link href="/asset/aos.css" rel="stylesheet">
    <script src="/asset/aos.js"></script>
    ${libInclusion}
    ${cssLinks}
    ${pageCSS}
    </head>
    <body>
    ${htmlBody}
    ${jsScripts}
    ${pageJS}
    ${aosInit}
    </body>
    </html>`;

    elPageEditor.realView.classList.add("d-none")
    elPageEditor.viewed.textContent = "Chargement...";

    setTimeout(() => {
        //desactive les liens dans la vue réelle
        elPageEditor.realView.contentDocument.body.addEventListener("click", e => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                e.preventDefault(); // Bloque la navigation
            }
        });
        elPageEditor.realView.classList.remove("d-none")
        elPageEditor.viewed.textContent = ""
    },2000)
}

function buildPage(page,root = "../asset/") {

    // Génération du HTML des composants (avec animations si définies)
    const htmlBody = page.data.map(data => renderComponent(data, true)).join('\n');

    // CSS globaux inclus
    const cssLinks = Object.keys(page.include.css).map(name => {
        const file = globalCSSFiles.find(f => f.name === name);
        return file ? `<link href="${root}asset_site/${file.name}.css" rel="stylesheet">` : '';
    }).join('\n');

    // JS globaux inclus
    const jsScripts = Object.keys(page.include.js).map(name => {
        const file = globalJSFiles.find(f => f.name === name);
        return file ? `<script src="${root}asset_site/${file.name}.js" ></script>` : '';
    }).join('\n');

    // CSS/JS spécifiques à la page
    const pageCSS = page.css ? `<style>\n${page.css}\n</style>` : '';
    const pageJS = page.js ? `<script>\n${page.js}\n</script>` : '';

    // Initialisation AOS si au moins un composant l'utilise
    const aosNeeded = page.data.some(comp => comp.anim && comp.anim !== 'none');
    const aosInit = aosNeeded ? `<script>AOS.init();</script>` : '';

    //inclusion de la librairie
    let libInclusion = ``;
    library.map(lib => libInclusion += lib.type === "script" ? `<script src="${root}asset_sys/${lib.name}"></script>` : `<link href="${root}asset_sys/${lib.name}" rel="stylesheet">`)

    // Assemblage complet du document
    const fullHTML = `
<!DOCTYPE html>
<html lang="${document.querySelector("#site-lang").value}">
<head>
    ${document.querySelector("#site-meta").value}
    <title>${page.title}</title>
    <link href="${root}asset_sys/aos.css" rel="stylesheet">
    <script src="${root}asset_sys/aos.js"></script>
    ${libInclusion}
    ${cssLinks}
    ${pageCSS}
</head>
<body>
    ${htmlBody}
    ${jsScripts}
    ${pageJS}
    ${aosInit}
</body>
</html>
    `.trim();

    return fullHTML;
}

async function build() {
  let data = await loadData("site") || {};
  let site_name = document.querySelector("#site-name").value;
  let asset_file = ["aos.css", "aos.js"];

  if (!Object.keys(data).includes(site_name)) {
    alert("Sauvegarder d'abord le site");
    return;
  }

  const zip = new JSZip();
  const fpage = zip.folder("page");
  const asset = zip.folder("asset");
  const asset_sys = asset.folder("asset_sys");
  const ressource = zip.folder("ressource");

  // Charger et formater les fichiers système
  for (const file of asset_file) {
    try {
      const response = await fetch("../asset/" + file);
      let text = await response.text();
      asset_sys.file(file, text);
    } catch (e) {
      console.error('Erreur lors du chargement des données JSON :', e);
    }
  }

  // Ajouter la librairie (exclue du formatage car déjà propre)
  for (const file of library) {
    asset_sys.file(file.name, file.content);
  }

  // Ajouter et formater les styles globaux
  const asset_site = asset.folder("asset_site");
  for (const css of globalCSSFiles) {
    asset_site.file(css.name + ".css", autoBeautify(css.content));
  }

  // Ajouter et formater les scripts globaux
  for (const js of globalJSFiles) {
    asset_site.file(js.name + ".js", autoBeautify(js.content));
  }

  // Construire les pages et les analyser pour récupérer les ressources
  const pageContents = sitePages.map(page => {
    if (page.name === "index") {
      return { name: "index.html", content: buildPage(page, "asset/") };
    } else {
      return { name: page.name + ".html", content: buildPage(page) };
    }
  });

  // Ajouter les pages dans le zip
  for (const page of pageContents) {
    if (page.name === "index.html") {
      zip.file("index.html", html_beautify(page.content, { indent_size: 2,}));
    } else {
      fpage.file(page.name,  html_beautify(page.content, { indent_size: 2,}));
    }
  }

  //Ajouter les ressource
  let files = listFiles("/ressource")
  setTimeout(()=> { //Attendre que les ressources chargent
    for (const file of Object.entries(files)) {
        ressource.file(file[0],file[1])    
    }
    // Générer le zip et sauvegarder
    zip.generateAsync({ type: "blob" })
    .then(function (content) {
      saveAs(content, site_name + "-build.zip");
    });
     alert("site construit avec succès");
  },2000)

}



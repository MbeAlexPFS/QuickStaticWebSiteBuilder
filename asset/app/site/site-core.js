// site/site-core.js
// Init, navigation, save, Monaco editor for site (from make_site.js)

// ========================== Autosave ============================= //
let autosaveTimer = null;
let autosaveDoSave = null;

function triggerAutosave() {
  if (autosaveDoSave) autosaveDoSave();
}

function setupAutosave() {
  if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; }
  autosaveDoSave = null;
  try {
    const settings = JSON.parse(localStorage.getItem('qswb_settings') || '{}');
    const mode = settings.autosaveMode || 'off';
    if (mode === 'off') return;

    const doSave = debounce(() => {
      if ($('#site-name').value.trim()) saveSite();
    }, 1000);

    autosaveDoSave = doSave;

    if (mode === 'interval') {
      const interval = (parseInt(settings.autosaveInterval) || 30) * 1000;
      autosaveTimer = setInterval(() => {
        if ($('#site-name').value.trim()) saveSite();
      }, interval);
    } else if (mode === 'onchange') {
      document.querySelectorAll('#site-form textarea, #site-form input, #globalCodeJSList textarea, #globalCodeCSSList textarea, #page-list textarea, #element-param-form input, #element-param-form select, #element-param-form textarea, #element-tag-name, #element-onview-anim').forEach(el => {
        el.addEventListener('input', doSave);
        el.addEventListener('change', doSave);
      });
    }
  } catch (e) { console.warn('Autosave setup error:', e); }
}

// ========================== Data load/save helpers ============================= //
async function initSiteEditor() {
  componentData = (await loadData("component")) || {};
  libData = (await loadData("lib")) || {};

  monArbre = new TreeEditor("tree", (id) => {
    selectedElement = id;
    selectElement(id);
  });

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
      refreshMediaList();
      resourceRefreshList();
      notify("page chargé avec succès", "success");
    }
  }

  show("site");
  updateRealView();
  updatePageForm();
  updateComponentSelector();
  updateLib();
  refreshMediaList();
  resourceRefreshList();
  setupAutosave();
}

document.addEventListener("DOMContentLoaded", initSiteEditor);

// ============================ Navigation ============================ //

function updateTagName() {
  const tag_name = document.getElementById("element-tag-name").value;
  const page = sitePages.find((pg) => pg.name === selectedPage);
  if (!page) return;
  const selectedEl = findElementById(page.data, selectedElement);
  selectedEl.tagName = tag_name;
  monArbre.render(page.data, selectedElement);
}

function show(page, pageSelection = null) {
  Object.keys(element).forEach((pg) => {
    element[pg].classList.toggle("d-none", pg !== page);
  });

  if (pageSelection !== null) {
    selectedPage = pageSelection;

    if (selectedPage !== componentRootID[2]) {
      componentRootID = [];
    }

    renderPageSelector();
    const headerData = renderPagesView();

    const pageObj = sitePages.find((pg) => pg.name === selectedPage);
    if (!pageObj) return;

    const libsHtml = buildLibInclusionHTML(pageObj.include.lib, libData);
    const requiredLibsHtml = buildLibInclusionHTML(
      pageObj.include["lib-required"],
      libData,
    );

    const cssInline = Object.keys(pageObj.include.css)
      .flatMap((css_name) =>
        globalCSSFiles
          .filter((css) => css.name === css_name)
          .map((css) => `<style>${css.content}</style>`),
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
         phpif, phpelseif, phpelse, phpendif, phpendelseif, phpendelse, phpfor, phpendfor, phpwhile, phpendwhile, phpforeach, phpendforeach {
           background-color: mediumpurple;
           color: white;
           padding: 10px;
         }
       </style>`;

    elPageEditor.view.contentDocument.body.onclick = (e) => {
      if (e.target.tagName === "A" || e.target.closest("a")) e.preventDefault();
      const target = e.target.closest(".component-element");
      if (target && target.dataset.id) {
        e.stopPropagation();
        selectElement(target.dataset.id);
        monArbre.highlight(selectedElement);
      }
    };

    monArbre.render(pageObj.data, selectedElement);
  }
}

// ======================== Editeur de code (Monaco) =========================== //

function detectLanguage(label) {
  const lower = label.toLowerCase();
  if (lower.includes('css')) return 'css';
  if (lower.includes('html')) return 'html';
  if (lower.includes('javascript') || lower.includes('js')) return 'javascript';
  return 'javascript';
}

function openEditor(label, inputID) {
  loadMonaco(function () {
    doOpenEditor(label, inputID);
  });
}

function doOpenEditor(label, inputID) {
  const modalEl = document.getElementById("codeEditor");
  const editorModal = new bootstrap.Modal(modalEl);
  editorModal.show();
  $("#codeEditorLabel").textContent = label;
  editorInputID = inputID;
  const sourceValue = document.querySelector(editorInputID).value;
  const language = detectLanguage(label);

  if (monacoEditorInstance) {
    monacoEditorInstance.setValue(sourceValue);
    monaco.editor.setModelLanguage(monacoEditorInstance.getModel(), language);
    setTimeout(() => monacoEditorInstance.layout(), 100);
  } else {
    const container = document.getElementById('monaco-editor-container');
    monacoEditorInstance = monaco.editor.create(container, {
      value: sourceValue,
      language: language,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true, maxColumn: 80 },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
    });
  }

  monacoEditorInstance.onDidChangeModelContent(() => {
    if (editorInputID) {
      const el = document.querySelector(editorInputID);
      if (el) el.value = monacoEditorInstance.getValue();
    }
  });
}

function beautify() {
  loadMonaco(function () {
    if (monacoEditorInstance) {
      const value = monacoEditorInstance.getValue();
      const formatted = autoBeautify(value);
      monacoEditorInstance.setValue(formatted);
      if (editorInputID) {
        const el = document.querySelector(editorInputID);
        if (el) el.value = formatted;
      }
    }
  });
}

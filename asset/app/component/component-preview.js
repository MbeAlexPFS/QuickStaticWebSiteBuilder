// component/component-preview.js
// Preview rendering (from make_component.js)

// =======================
// Rendu / Prévisualisation
// =======================
function renderComponent(data) {
  let renderHTML = data["html-code"] ?? "";
  let renderCSS = data["css-code"] ?? "";
  let renderJS = data["js-code"] ?? "";

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
    renderHTML = renderHTML.split(token).join(replacement);
    renderCSS = renderCSS.split(token).join(replacement);
    renderJS = renderJS.split(token).join(replacement);
  });

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

async function updateRealView(data) {
  const [htmlBody, cssBody, jsBody] = renderComponent(data);

  const cssLinks =
    cssBody.trim() !== ""
      ? `<style> ${scopeComponentCSS(
          ".component-element",
          cssBody,
          data["html-code"]
        )} </style>`
      : "";

  const jsScripts =
    jsBody.trim() !== ""
      ? `<script> document.querySelectorAll('.component-element').forEach((component) => { 
        ${jsBody}
        });</script>`
      : "";

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
  el.realView.classList.add("d-none");

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
// Édition du code (Monaco)
// =======================
function openComponentEditor(type) {
  loadMonacoComponent(function () {
    doOpenComponentEditor(type);
  });
}

function doOpenComponentEditor(type) {
  const langMap = { html: 'html', css: 'css', js: 'javascript' };
  const editor = monacoEditors[type];
  if (!editor) return;

  const modalEl = document.getElementById("codeEditor");
  const editorModal = new bootstrap.Modal(modalEl);
  editorModal.show();
  document.getElementById("codeEditorLabel").textContent = 'Edition du code ' + type.toUpperCase();
  monacoComponentType = type;

  if (monacoComponentContainer) {
    monacoComponentContainer.setValue(editor.getValue());
    monaco.editor.setModelLanguage(monacoComponentContainer.getModel(), langMap[type]);
    setTimeout(() => monacoComponentContainer.layout(), 100);
  } else {
    const container = document.getElementById('monaco-editor-component-container');
    monacoComponentContainer = monaco.editor.create(container, {
      value: editor.getValue(),
      language: langMap[type],
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true, maxColumn: 80 },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
    });
  }

  monacoComponentContainer.onDidChangeModelContent(() => {
    if (monacoComponentType && monacoEditors[monacoComponentType]) {
      monacoEditors[monacoComponentType].setValue(monacoComponentContainer.getValue());
    }
  });
}

function beautifyComponentEditor() {
  loadMonacoComponent(function () {
    doBeautifyComponentEditor();
  });
}

function doBeautifyComponentEditor() {
  if (monacoComponentContainer) {
    const value = monacoComponentContainer.getValue();
    const formatted = autoBeautify(value);
    monacoComponentContainer.setValue(formatted);
    if (monacoComponentType && monacoEditors[monacoComponentType]) {
      monacoEditors[monacoComponentType].setValue(formatted);
    }
  }
}

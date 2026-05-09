// site/site-render.js
// Rendering pipeline (from make_site.js)

// ========================== Render / Build ============================= //
function renderComponent(data, isRealView = false) {
  let render = data["html-code"] || "";
  data.id = `component-${data.component}-${record}`;

  extractClassTokens(render).forEach((param) => {
    const p = data.param[param];
    if (!p) return;
    const [label, type, value] = p;
    if (type === "empty" && Array.isArray(value)) {
      const nested = value
        .map((child) => renderComponent(child, isRealView))
        .join("");

      if (isRealView) {
        render = render.split(`{*${param}*}`).join(nested);
      } else {
        if (componentRootID.length === 0) {
          render = render.split(`{*${param}*}`).join(nested);
        } else {
          const page = sitePages.find((pg) => pg.name === selectedPage);
          const root = findElementById(page.data, componentRootID[0])["param"][
            componentRootID[1]
          ][2];
          if (findElementById(root, data.id)) {
            render = render.split(`{*${param}*}`).join(nested);
          }
        }
      }
    } else if (type === "list") {
      render = render.split(`{*${param}*}`).join(data.param[param][3]);
    } else if (type === "ressource") {
      let url = value;
      if (url && !url.startsWith('/')) url = '/' + url;
      render = render.split(`{*${param}*}`).join(url);
    } else {
      render = render.split(`{*${param}*}`).join(value);
    }
  });

  if (data["css-code"].trim() !== "") {
    if (!renderCSSPerComponentCache[data.component]) {
      renderCSSPerComponentCache[data.component] = [];
    }
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
        scopeComponentCSS(`.${data.id}`, renderCSS, data["html-code"]),
      );
    }
  }

  if (data["js-code"].trim() !== "") {
    if (!renderJSPerComponentCache[data.component]) {
      renderJSPerComponentCache[data.component] = [];
    }
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
        ` if (component.classList.contains("${data.id}")) { ${renderJS} }`,
      );
    }
  }

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

  record += 1;

  return body.innerHTML;
}

function postRenderComponents(pageData, isRealView = false) {
  let allComponentsHTML = "";
  renderCSSPerComponentCache = {};
  renderJSPerComponentCache = {};
  record = 0;

  for (const data of pageData) {
    allComponentsHTML += renderComponent(data, isRealView);
  }

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
        componentData[key]["html-code"],
      ) + renderCSSPerComponentCache[key].join("");
  }

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

  const content =
    componentRootID.length === 0
      ? postRenderComponents(page.data)
      : postRenderComponents(
          findElementById(page.data, componentRootID[0])["param"][
            componentRootID[1]
          ][2],
        );

  elPageEditor.view.contentDocument.body.innerHTML = content.html;
  if (content.js)
    elPageEditor.view.contentDocument.body.innerHTML += `<script>${content.js}</script>`;

  updateRealView();

  elPageEditor.view.contentDocument.body.innerHTML +=
    Object.keys(page.include.js || {})
      .flatMap((js_name) =>
        globalJSFiles
          .filter((js) => js.name === js_name)
          .map((js) => `<script>${js.content}</script>`),
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

  const content = postRenderComponents(page.data, true);
  elPageEditor.viewed.textContent = selectedPage;

  const cssLinks = Object.keys(page.include.css || {})
    .map((name) => {
      const file = globalCSSFiles.find((f) => f.name === name);
      return file ? `<style>\n${file.content}\n</style>` : "";
    })
    .join("\n");

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
    elPageEditor.viewed.textContent = selectedPage;
  }, 2000);
}

function setPreviewSize(width, height) {
  const frame = document.getElementById('preview-frame');
  const iframe = document.getElementById('realview');
  if (frame && iframe) {
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    iframe.style.width = width + 'px';
    iframe.style.height = height + 'px';
    document.getElementById('preview-width').value = width;
    document.getElementById('preview-height').value = height;
  }
}

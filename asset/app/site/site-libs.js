// site/site-libs.js
// Library management (from make_site.js)

// ============================ Library ============================ //
function checklibDependance() {
  requiredLibrary.clear();
  for (const pg of sitePages) {
    const pageLibs = [];
    for (const data of pg.data) pageLibs.push(...checkComponentLib(data));
    pg.include["lib-required"] = Array.from(new Set(pageLibs));
    Object.keys(pg.include["lib"] || {}).forEach((pglib) => {
      if (!requiredLibrary.has(pglib) && !library.includes(pglib)) {
        delete pg.include["lib"][pglib];
      }
    });
    pg.include["lib-required"].forEach((l) => requiredLibrary.add(l));
  }
  updateLib();
}

function checkComponentLib(data) {
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
                  libName,
                )}')" />
              </div>
            </td>
        </tr>`,
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

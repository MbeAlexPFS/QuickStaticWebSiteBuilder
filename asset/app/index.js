// asset/app/index.js
let searchInput = {
  component: document.querySelector("#searchComponent"),
  site: document.querySelector("#searchSite"),
};

let dt;
let stdt;
let libdt;

searchInput.component.oninput = () => {
  renderComponentList(searchInput.component.value);
};

searchInput.site.oninput = () => {
  renderSiteList(searchInput.site.value);
};

//------ Composants ------//
// Chargement asynchrone des données composants
async function renderComponentList(search = "") {
  dt = (await loadData("component")) || {};
  let componentlist = document.querySelector("#component-list");
  componentlist.innerHTML = "";
  if (Object.keys(dt).length > 0) {
    for (const key of Object.keys(dt)) {
      if (key.includes(search)) {
        componentlist.innerHTML += `
        <div class="row my-2 align-items-center">
          <div class="col-8"><i class="bi bi-puzzle text-warning me-2"></i><strong>${key}</strong></div>
          <div class="col-4">
            <div class="d-flex gap-1">
              <button type="button" onclick="editComponent('${key}')" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></button>
              <button type="button" onclick="deleteComponent('${key}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>`;
      }
    }
  } else {
        componentlist.innerHTML = `<div class="text-center my-3 p-3 bg-light rounded"><i class="bi bi-inbox text-muted me-2"></i><span class="text-secondary">Aucun composant disponible</span></div>`;
  }
}

// Fonctions pour les boutons
function createComponent() {
  sessionStorage.setItem("edit", null);
  location.replace("page/component-editor.html");
}

function editComponent(component) {
  sessionStorage.setItem("edit", component);
  location.replace("page/component-editor.html");
}

async function deleteComponent(component) {
  delete dt[component];
  await addOrUpdateData("component", dt);
  await renderComponentList(); // Rafraîchir la liste après suppression
}

//------ Sites ------//
// Chargement asynchrone des données sites
async function renderSiteList(search = "") {
  stdt = (await loadData("site")) || {};
  let sitelist = document.querySelector("#site-list");
  sitelist.innerHTML = "";
  if (Object.keys(stdt).length > 0) {
    for (const key of Object.keys(stdt)) {
      if (key.includes(search)) {
        sitelist.innerHTML += `
        <div class="row my-2 align-items-center">
          <div class="col-8">
            <h6 class="mb-0"><i class="bi bi-globe text-primary me-2"></i><strong>${key}</strong></h6>
            <small class="text-muted">${stdt[key].desc || ''}</small>
          </div>
          <div class="col-4">
            <div class="d-flex gap-1">
              <button type="button" onclick="editSite('${key}')" class="btn btn-sm btn-outline-primary" title="Editer"><i class="bi bi-pencil"></i></button>
              <button type="button" onclick="duplicate('${key}')" class="btn btn-sm btn-outline-success" title="Dupliquer"><i class="bi bi-copy"></i></button>
              <button type="button" onclick="deleteSite('${key}')" class="btn btn-sm btn-outline-danger" title="Supprimer"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>`;
      }
    }
  } else {
    sitelist.innerHTML = `<div class="text-center my-3 p-3 bg-light rounded"><i class="bi bi-inbox text-muted me-2"></i><span class="text-secondary">Aucun site trouvé</span></div>`;
  }
}

function editSite(site) {
  sessionStorage.setItem("editsite", site);
  location.replace("page/site-editor.html");
}

async function duplicate(site) {
  let verified = false;
  let qes;
  let newSite;
  while (!verified) {
    qes = await showPrompt(
      "Entrer un nom valide pour la copie: non vide, pas le meme nom que l'original"
    );
    if (qes === "" || qes == null) {
      notify("Veuillez entrer un nom", "warning");
    } else if (qes === site || stdt[qes]) {
      notify("Entrer un nom autre que l'original et qui n'existe pas déjà", "warning");
    } else {
      verified = true;
      newSite = qes;
      stdt[newSite] = stdt[site];
      await addOrUpdateData("site", stdt);
    }
  }

  sessionStorage.setItem("editsite", newSite);
  location.replace("page/site-editor.html");
}

async function deleteSite(site) {
  delete stdt[site];
  await addOrUpdateData("site", stdt);
  await renderSiteList(); // Rafraîchir la liste après suppression
}

//------ Librairies ------//
// Chargement asynchrone des données librairies
async function renderLibList(search = "") {
  libdt = (await loadData("lib")) || {};
  let liblist = document.querySelector("#lib-list");
  liblist.innerHTML = "";
  if (Object.keys(libdt).length > 0) {
    for (const key of Object.keys(libdt)) {
      if (key.includes(search)) {
        liblist.innerHTML += `
        <div class="row my-2 align-items-center">
          <div class="col-8"><i class="bi bi-boxes text-info me-2"></i><strong>${key}</strong></div>
          <div class="col-4">
            <div class="d-flex gap-1">
              <button type="button" onclick="editLib('${key}')" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></button>
              <button type="button" onclick="deleteLib('${key}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>`;
      }
    }
  } else {
    liblist.innerHTML = `<div class="text-center my-3 p-3 bg-light rounded"><i class="bi bi-inbox text-muted me-2"></i><span class="text-secondary">Aucune librairie disponible</span></div>`;
  }
}

// Fonctions pour les boutons
function addLib() {
  sessionStorage.setItem("edit", null);
  location.replace("page/lib-add.html");
}

function editLib(lib) {
  sessionStorage.setItem("edit", lib);
  location.replace("page/lib-add.html");
}

async function deleteLib(lib) {
  delete libdt[lib];
  await addOrUpdateData("lib", libdt);
  await renderLibList(); // Rafraîchir la liste après suppression
}

//charger et sauvegarder des données
document.getElementById("loadcpn").addEventListener("change", function (event) {
  //basé sur un code javascript importé pour charger une base
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const jsonContent = JSON.parse(e.target.result);
        const inputdt = jsonContent;
        const newdt = { ...dt };

        for (const [key, value] of Object.entries(inputdt)) {
          if (key in dt) {
            const replace = await showConfirm(
              `Le composant "${key}" existe déjà. Voulez-vous le remplacer par le nouveau ?`
            );
            if (replace) {
              newdt[key] = value;
            }
          } else {
            newdt[key] = value;
          }
        }

        dt = newdt;
        await addOrUpdateData("component", dt);

        notify("Composants chargés avec succès !", "success");
        renderComponentList();
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);
  }
});

document.getElementById("loadlib").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const jsonContent = JSON.parse(e.target.result);
        const inputdt = jsonContent;
        const newdt = { ...libdt };

        for (const [key, value] of Object.entries(inputdt)) {
          if (key in libdt) {
            const replace = await showConfirm(
              `La librairie "${key}" existe déjà. Voulez-vous la remplacer par la nouvelle ?`
            );
            if (replace) {
              newdt[key] = value;
            }
          } else {
            newdt[key] = value;
          }
        }

        libdt = newdt;
        await addOrUpdateData("lib", libdt);

        notify("Librairies chargées avec succès !", "success");
        renderLibList();
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);
  }
});

document.getElementById("loadsite").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const jsonContent = JSON.parse(e.target.result);
        const inputdt = jsonContent;
        const newdt = { ...stdt };

        for (const [key, value] of Object.entries(inputdt)) {
          if (key in stdt) {
            const replace = await showConfirm(
              `Le site "${key}" existe déjà. Voulez-vous le remplacer par le nouveau ?`
            );
            if (replace) {
              newdt[key] = value;
            }
          } else {
            newdt[key] = value;
          }
        }

        stdt = newdt;
        await addOrUpdateData("site", stdt);

        notify("Sites chargés avec succès !", "success");
        renderSiteList();
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);
  }
});

function downloadObjectAsJson(exportObj, exportName) {
  //basé sur un code javascript importé pour telecharger une base json
  var dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(
      js_beautify(JSON.stringify(exportObj), { indent_size: 2 })
    );
  var downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

async function saveComponentPack() {
  downloadObjectAsJson(dt, "componentPack");
}

async function saveSitePack() {
  downloadObjectAsJson(stdt, "sitePack");
}

async function saveLibPack() {
  downloadObjectAsJson(libdt, "libPack");
}

// Initialisation des listes au chargement de la page
document.addEventListener("DOMContentLoaded", async () => {
  await renderComponentList();
  await renderSiteList();
  await renderLibList();
});

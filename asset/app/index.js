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
        <div class="row my-3">
          <div class="col-8">${key}</div>
          <div class="col-4">
            <div class="d-grid gap-2">
              <button
                type="button"
                onclick="editComponent('${key}')"
                class="btn btn-primary"
              >
                Editer
              </button>
              <button
                type="button"
                onclick="deleteComponent('${key}')"
                class="btn btn-primary"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
        <hr>`;
      }
    }
  } else {
    componentlist.innerHTML = `<div class="text-center my-3 p-2 bg-primary text-light"> Aucun composant disponible</div>`;
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
        <div class="row my-3">
          <div class="col-8"><h3>${key}</h3></br><h5 class="text-secondary">${stdt[key].desc}</h5></div>
          <div class="col-4">
            <div class="d-grid gap-2">
              <button
                type="button"
                onclick="editSite('${key}')"
                class="btn btn-primary"
              >
                Editer
              </button>
              <button
                type="button"
                onclick="duplicate('${key}')"
                class="btn btn-success"
              >
                Dupliquer
              </button>
              <button
                type="button"
                onclick="deleteSite('${key}')"
                class="btn btn-primary"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
        <hr>`;
      }
    }
  } else {
    sitelist.innerHTML = `<div class="text-center my-3 p-2 bg-primary text-light"> Aucun site trouvé </div>`;
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
    qes = prompt(
      "Entrer un nom valide pour la copie: non vide, pas le meme nom que l'original"
    );
    if (qes === "" || qes == null) {
      alert("Veuillez entrer un nom");
    } else if (qes === site || stdt[qes]) {
      alert("Entrer un nom autre que l'original et qui n'existe pas déjà");
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
        <div class="row my-3">
          <div class="col-8">${key}</div>
          <div class="col-4">
            <div class="d-grid gap-2">
              <button
                type="button"
                onclick="editLib('${key}')"
                class="btn btn-primary"
              >
                Editer
              </button>
              <button
                type="button"
                onclick="deleteLib('${key}')"
                class="btn btn-primary"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
        <hr>`;
      }
    }
  } else {
    liblist.innerHTML = `<div class="text-center my-3 p-2 bg-primary text-light"> Aucune librairie disponible</div>`;
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
    reader.onload = function (e) {
      try {
        const jsonContent = JSON.parse(e.target.result);
        const inputdt = jsonContent;

        // Copie sécurisée de la data actuelle
        const newdt = { ...dt };

        // Parcours des nouveaux composants à fusionner
        for (const [key, value] of Object.entries(inputdt)) {
          if (key in dt) {
            // Composant déjà existant → demander confirmation
            const replace = confirm(
              `Le composant "${key}" existe déjà.\nVoulez-vous le remplacer par le nouveau ?`
            );
            if (replace) {
              newdt[key] = value;
              console.log(
                `✅ Composant "${key}" remplacé par la nouvelle version.`
              );
            } else {
              console.log(`⏩ Composant "${key}" conservé (ancien gardé).`);
            }
          } else {
            // Nouveau composant → ajout direct
            newdt[key] = value;
            console.log(`🆕 Nouveau composant "${key}" ajouté.`);
          }
        }

        // Mise à jour finale
        dt = newdt;
        addOrUpdateData("component", dt);

        alert("Composants chargés avec succès !");
        renderComponentList();
        // You can now work with the JSON content
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);
  } else {
    console.error("No file selected");
  }
});

document.getElementById("loadlib").addEventListener("change", function (event) {
  //basé sur un code javascript importé pour charger une base
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const jsonContent = JSON.parse(e.target.result);
        const inputdt = jsonContent;

        // Copie sécurisée de la data actuelle
        const newdt = { ...libdt };

        // Parcours des nouveaux composants à fusionner
        for (const [key, value] of Object.entries(inputdt)) {
          if (key in libdt) {
            // Composant déjà existant → demander confirmation
            const replace = confirm(
              `La librairie "${key}" existe déjà.\nVoulez-vous le remplacer par le nouveau ?`
            );
            if (replace) {
              newdt[key] = value;
              console.log(
                `✅ Librairie "${key}" remplacé par la nouvelle version.`
              );
            } else {
              console.log(`⏩ Librairie "${key}" conservé (ancien gardé).`);
            }
          } else {
            // Nouveau composant → ajout direct
            newdt[key] = value;
            console.log(`🆕 Nouveau librairie "${key}" ajouté.`);
          }
        }

        // Mise à jour finale
        libdt = newdt;
        addOrUpdateData("component", libdt);

        alert("Composants chargés avec succès !");
        renderLibList();
        // You can now work with the JSON content
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);
  } else {
    console.error("No file selected");
  }
});

document
  .getElementById("loadsite")
  .addEventListener("change", function (event) {
    //basé sur un code javascript importé pour charger une base
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const jsonContent = JSON.parse(e.target.result);
          const inputdt = jsonContent;

          // Copie sécurisée de la data actuelle
          const newdt = { ...stdt };

          // Parcours des nouveaux composants à fusionner
          for (const [key, value] of Object.entries(inputdt)) {
            if (key in stdt) {
              // Composant déjà existant → demander confirmation
              const replace = confirm(
                `Le site "${key}" existe déjà.\nVoulez-vous le remplacer par le nouveau ?`
              );
              if (replace) {
                newdt[key] = value;
                console.log(
                  `✅ Site "${key}" remplacé par la nouvelle version.`
                );
              } else {
                console.log(`⏩ Site "${key}" conservé (ancien gardé).`);
              }
            } else {
              // Nouveau composant → ajout direct
              newdt[key] = value;
              console.log(`🆕 Nouveau site "${key}" ajouté.`);
            }
          }

          // Mise à jour finale
          stdt = newdt;
          addOrUpdateData("site", stdt);

          alert("Site chargés avec succès !");
          renderSiteList();
          // You can now work with the JSON content
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      reader.readAsText(file);
    } else {
      console.error("No file selected");
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

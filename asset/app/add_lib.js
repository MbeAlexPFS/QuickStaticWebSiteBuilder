// Sélection des éléments du DOM
let el = {
  libName: document.getElementById("lib_name"),
  typeCheckBox: document.getElementById("lib_type"),
  libFile: document.getElementById("lib_file"),
  libLink: document.getElementById("lib_link"),
};

let libFiledt = "";

// Montrer ou cacher les champs en fonction du type de librairie
function updatetypeFormState() {
  if (el.typeCheckBox.checked) {
    el.libFile.parentElement.classList.add("d-none"); // Cacher le champ de fichier
    el.libLink.parentElement.classList.remove("d-none"); // Afficher le champ de lien
  } else {
    el.libFile.parentElement.classList.remove("d-none"); // Afficher le champ de fichier
    el.libLink.parentElement.classList.add("d-none"); // Cacher le champ de lien
  }
}

el.typeCheckBox.addEventListener("change", function () {
  updatetypeFormState();
});

// Charger le fichier de la librairie
el.libFile.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    // Get the file extension
    const fileName = file.name;
    const extension = fileName.split(".").pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = function (e) {
      if (extension === "css") {
        libFiledt = "<style>" + e.target.result + "</style>";
      } else if (extension === "js") {
        libFiledt = "<script>" + e.target.result + "</script>";
      } else {
        notify("Veuillez importer une librairie valide (css ou js)", "warning");
        return;
      }
    };
    reader.readAsText(file);
  }
});

// Ajouter ou mettre à jour une librairie
async function addOrUpdateLib() {
  let libName = el.libName.value.trim();
  let data = (await loadData("lib")) || {};
  //nom pas vide et unique
  if (!libName) {
    notify("Le nom de la librairie ne peut pas être vide.", "warning");
    return;
  }

  if (data[libName] && sessionStorage.getItem("edit") !== libName) {
    notify("Une librairie avec ce nom existe déjà.", "warning");
    return;
  }

  let libData = {
    type: el.typeCheckBox.checked,
    file: el.typeCheckBox.checked ? "" : libFiledt, // Si c'est une librairie de fichier, on utilise le contenu du fichier
    link: el.typeCheckBox.checked ? el.libLink.value.trim() : "",
  };

  data[libName] = libData;

  await addOrUpdateData("lib", data);
  notify("Librairie ajoutée ou mise à jour avec succès !", "success");
}

// Initialisation
async function init() {
  let editLib = sessionStorage.getItem("edit");

  if (editLib !== "null") {
    let data = await loadData("lib");
    el.libName.value = editLib;
    el.libName.setAttribute("disabled", 1);
    el.typeCheckBox.checked = data[editLib].type;
    el.libFile.value = "";
    el.libLink.value = data[editLib].link || "";

    // indiquer si la libraire a une données si c'est un fichier
    if (data[editLib].file !== "") {
      notify("La librairie a un fichier associé.", "info");
      if (await showConfirm("Voulez-vous voir un apercu du contenu ?")) {
        const modalEl = document.createElement('div');
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.innerHTML = `
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Contenu du fichier</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <pre class="border rounded p-3 bg-light" style="max-height:60vh;overflow:auto;white-space:pre-wrap;word-break:break-all;">${data[editLib].file.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modalEl);
        const modal = new bootstrap.Modal(modalEl);
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove(), { once: true });
        modal.show();
      }
    }
  }

  updatetypeFormState();
}

// Appel de l'initialisation
document.addEventListener("DOMContentLoaded", () => { init(); });

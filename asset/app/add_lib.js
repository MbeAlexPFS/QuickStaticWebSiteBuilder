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
        alert("Veuillez importer une librairie valide (css ou js)");
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
    alert("Le nom de la librairie ne peut pas être vide.");
    return;
  }

  if (data[libName] && sessionStorage.getItem("edit") !== libName) {
    alert("Une librairie avec ce nom existe déjà.");
    return;
  }

  let libData = {
    type: el.typeCheckBox.checked,
    file: el.typeCheckBox.checked ? "" : libFiledt, // Si c'est une librairie de fichier, on utilise le contenu du fichier
    link: el.typeCheckBox.checked ? el.libLink.value.trim() : "",
  };

  data[libName] = libData;

  await addOrUpdateData("lib", data);
  alert("Librairie ajoutée ou mise à jour avec succès !");
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
      alert("La librairie a un fichier associé.");
      //demander à voir le contenu du fichier
      if (confirm("Voulez-vous voir un apercu du contenu")) {
        alert("Contenu du fichier : " + data[editLib].file);
      }
    }
  }

  updatetypeFormState();
}

// Appel de l'initialisation
document.addEventListener("DOMContentLoaded", init);

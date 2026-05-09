//array
function getPropFromObjectArray(array, prop) {
  let data = [];
  for (const item of array) {
    data.push(item[prop]);
  }
  return data;
}

//tree editor
class TreeEditor {
  constructor(containerId, onSelectCallback = null) {
    this.container = document.getElementById(containerId);
    this.hideItems = [];
    this.tempHideItems = [];
    this.onSelect = onSelectCallback;
    this.selectedId = "";
  }

  /**
   * @param {Object} pageData - Les données de la page (page.data)
   * @param {string} currentSelectedId - L'ID actuellement sélectionné (selectedElement)
   */
  render(pageData, currentSelectedId = "") {
    this.selectedId = currentSelectedId;
    this.container.innerHTML = "";

    if (!pageData) return;

    const rootList = document.createElement("div");
    rootList.className = "list-group list-group-flush shadow-sm";
    for (const instance of pageData) {
      rootList.appendChild(this._createNodeHTML(instance));
    }
    this.container.appendChild(rootList);
    this.hideItems = this.tempHideItems;
    this.tempHideItems = [];
  }

  _createNodeHTML(instance) {
    let haveChildren = false;
    Object.keys(instance.param).forEach((param) => {
      const config = instance.param[param];
      if (config[1] === "empty" && config[2]) {
        if (config[2].length > 0) {
          haveChildren = true;
        }
      }
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tree-node-wrapper";

    // Logique de nommage (tag_name ou tagName ou id ou type)
    const name = instance.tagName || instance.id || instance.component;

    const item = document.createElement("a");
    item.href = "#";
    // Utilisation de classes Bootstrap pour le style
    item.className = `list-group-item list-group-item-action border-0 d-flex align-items-center py-1 ps-2 ${this.selectedId === instance.id ? "active" : ""}`;
    item.setAttribute("data-tree-id", instance.id);

    if (this.hideItems.includes(instance.id)) {
      item.classList.add("hide");
      this.tempHideItems.push(instance.id);
    }

    item.innerHTML = `
            <i class="bi ${haveChildren ? "bi-folder2-open" : "bi-component"} me-2 small"></i>
            <span class="text-truncate" style="font-size: 0.9rem;">${name} <button class="${haveChildren ? "" : "d-none"} btn btn-outline-dark btn-sm">${item.classList.contains("hide") ? '<i class="bi bi-plus-circle"></i>' : '<i class="bi bi-dash-circle"></i>'}</button> </span>
        `;

    item.querySelector(".btn").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectedId = instance.id;
      this.hide(this.selectedId, item.classList.contains("hide"));
    };

    item.onclick = (e) => {
      e.preventDefault();
      this.selectedId = instance.id;
      if (this.onSelect) this.onSelect(instance.id);

      // Mise à jour visuelle immédiate
      this.container
        .querySelectorAll(".list-group-item")
        .forEach((el) => el.classList.remove("active"));
      this.highlight(this.selectedId);
    };

    wrapper.appendChild(item);

    // Gestion de TOUS les slots "empty"
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "ms-3 border-start ps-1";

    if (haveChildren) {
      Object.keys(instance.param).forEach((param) => {
        const config = instance.param[param];
        // Si le type du paramètre est 'empty'
        if (config[1] === "empty") {
          const childrenInSlot = config[2];
          childrenInSlot.forEach((child) => {
            childrenContainer.appendChild(this._createNodeHTML(child));
          });
        }
      });
    }

    if (childrenContainer.hasChildNodes()) {
      wrapper.appendChild(childrenContainer);
    }

    return wrapper;
  }

  // Permet de forcer la sélection visuelle depuis l'extérieur (ex: clic dans l'iframe)
  highlight(id) {
    this.selectedId = id;
    this.container.querySelectorAll(".list-group-item").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-tree-id") === id);
    });
  }

  hide(id, ishide) {
    this.selectedId = id;
    this.container.querySelectorAll(".list-group-item").forEach((el) => {
      if (el.getAttribute("data-tree-id") === id) {
        if (ishide) {
          el.classList.remove("hide");
          el.querySelector(".btn").innerHTML = '<i class="bi bi-dash-circle"></i>';
          delete this.hideItems[this.hideItems.indexOf(id)];
        } else {
          el.classList.add("hide");
          el.querySelector(".btn").innerHTML = '<i class="bi bi-plus-circle"></i>';
          this.hideItems.push(id);
        }
      }
    });
  }
}

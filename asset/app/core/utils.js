// core/utils.js
// Shared utilities extracted from make_site.js, my-beautify.js, css-tools.js, make_component.js

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const id = (i) => document.getElementById(i);
function notify(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('notify-container') || (() => {
    const div = document.createElement('div');
    div.id = 'notify-container';
    div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:420px';
    document.body.appendChild(div);
    return div;
  })();
  const colors = { info: 'primary', success: 'success', warning: 'warning', error: 'danger' };
  const bg = colors[type] || 'primary';
  const el = document.createElement('div');
  el.className = `alert alert-${bg} alert-dismissible fade show m-0 shadow-sm`;
  el.innerHTML = `<span>${msg}</span><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

function showConfirm(msg) {
  return new Promise(resolve => {
    const modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.setAttribute('tabindex', '-1');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-body p-4 text-center">${msg}</div>
          <div class="modal-footer justify-content-center border-0 pt-0">
            <button class="btn btn-secondary" data-action="no">Annuler</button>
            <button class="btn btn-primary" data-action="yes">Confirmer</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    modalEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        resolve(btn.dataset.action === 'yes');
        modal.hide();
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove(), { once: true });
      });
    });
    modal.show();
  });
}

function showPrompt(msg, defaultValue = '') {
  return new Promise(resolve => {
    const modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.setAttribute('tabindex', '-1');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-body p-4">
            <p class="text-center mb-3">${msg}</p>
            <input type="text" class="form-control" value="${defaultValue}">
          </div>
          <div class="modal-footer justify-content-center border-0 pt-0">
            <button class="btn btn-secondary" data-action="cancel">Annuler</button>
            <button class="btn btn-primary" data-action="ok">OK</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    const input = modalEl.querySelector('input');
    const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    modalEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.action === 'ok' ? input.value : null;
        resolve(val);
        modal.hide();
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove(), { once: true });
      });
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = input.value;
        resolve(val);
        modal.hide();
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove(), { once: true });
      }
    });
    modal.show();
    input.focus();
    input.select();
  });
}

const showAlert = (msg) => notify(msg, 'info');

const extractClassTokens = (input = "") => {
  if (!input) return [];
  const re = /\{\*([A-Za-z0-9]+)\*\}/g;
  const set = new Set();
  let m;
  while ((m = re.exec(input)) !== null) set.add(m[1]);
  return Array.from(set);
};

const isHTML = (str = "") => /<\/?[a-z][\s\S]*>/i.test(str);

const escapeQuotes = (s) => String(s).replace(/'/g, "\\'").replace(/"/g, '\\"');

const getById = (id) => document.querySelector("#" + id);

function detectCodeType(code) {
  const trimmedCode = code.trim();
  if (!trimmedCode) return "js";
  const cssPatterns = [
    /^\s*([.#a-z][^{]*\{)/i,
    /^\s*@(?:media|keyframes|import|font-face|page)\b/i,
    /:\s*[^;{}]+\s*;/,
    /^\s*\/\*[\s\S]*?\*\/\s*$/,
  ];
  return cssPatterns.some(regex => regex.test(trimmedCode)) ? "css" : "js";
}

function autoBeautify(code) {
  if (detectCodeType(code) === "css") {
    return css_beautify(code, { indent_size: 2 });
  } else {
    return js_beautify(code, { indent_size: 2 });
  }
}

function scopeComponentCSS(id, cssRules, htmlTemplate) {
  const scope = `${id}`;
  const uniqueSuffix = id.replace(/[^a-zA-Z0-9]/g, "_");

  const temp = document.createElement("div");
  temp.innerHTML = htmlTemplate.trim();
  const root = temp.firstElementChild;
  if (!root) return "";

  const rootClasses = Array.from(root.classList);
  const rootId = root.id || null;

  const atRules = [];
  let css = cssRules;
  css = css.replace(/(@[^{]+{[^}]*})/gs, (match) => {
    const placeholder = `/*__AT_RULE_${atRules.length}__*/`;
    atRules.push(match);
    return placeholder;
  });

  function matchesRootSelector(sel) {
    const m = sel.match(/^([.#]?[\w-]*)(.*)$/);
    if (!m) return false;
    const [_, base, pseudo] = m;
    if (base === "" && rootClasses.length) return true;
    if (rootId && base === `#${rootId}`) return true;
    if (rootClasses.includes(base.replace(/^\./, ""))) return true;
    return false;
  }

  let no_selector = false;
  css = css.replace(
    /([^{]+)\{([^}]*)\}/gs,
    (match, selectorList, declarations) => {
      const selectors = selectorList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const mapped = selectors.map((s) => {
        if (matchesRootSelector(s)) {
          return s.replace(/^([.#]?[\w-]*)(.*)$/, (_, base, pseudo) => {
            return scope + pseudo;
          });
        }
        return `${scope} ${s}`;
      });

      const updatedDecl = declarations.replace(
        /animation(-name)?\s*:\s*([\w-]+)/g,
        (m, p1, anim) => {
          return m.replace(anim, anim + "_" + uniqueSuffix);
        }
      );

      return `${mapped.join(", ")} {${updatedDecl}}`;
    }
  );

  if (css === cssRules) {
    return prettifyCss(`${id} { ${cssRules} }`);
  }

  atRules.forEach((r, idx) => {
    const ph = `/*__AT_RULE_${idx}__*/`;
    css = css.replace(
      ph,
      r.replace(/@keyframes\s+([^{\s]+)/, `@keyframes $1_${uniqueSuffix}`)
    );
  });

  return prettifyCss(css);
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function prettifyCss(css) {
  return css
    .replace(/\s*{\s*/g, " {\n  ")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\s*;\s*/g, ";\n  ")
    .replace(/\n\s*;\n/g, ";\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

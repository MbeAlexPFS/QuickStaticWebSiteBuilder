function scopeComponentCSS(id, cssRules, htmlTemplate) {
  const scope = `${id}`;
  const uniqueSuffix = id.replace(/[^a-zA-Z0-9]/g, "_");

  // Créer un élément temporaire pour parser le HTML
  const temp = document.createElement("div");
  temp.innerHTML = htmlTemplate.trim();
  const root = temp.firstElementChild;
  if (!root) return "";

  // Classes et id du root
  const rootClasses = Array.from(root.classList);
  const rootId = root.id || null;

  // Extraire at-rules pour ne pas les casser
  const atRules = [];
  let css = cssRules;
  css = css.replace(/(@[^{]+{[^}]*})/gs, (match) => {
    const placeholder = `/*__AT_RULE_${atRules.length}__*/`;
    atRules.push(match);
    return placeholder;
  });

  // Fonction pour tester si un sélecteur cible le root
  function matchesRootSelector(sel) {
    // séparer base et pseudo
    const m = sel.match(/^([.#]?[\w-]*)(.*)$/);
    if (!m) return false;
    const [_, base, pseudo] = m;
    if (base === "" && rootClasses.length) return true; // simple '.'
    if (rootId && base === `#${rootId}`) return true;
    if (rootClasses.includes(base.replace(/^\./, ""))) return true;
    return false;
  }

  // Préfixer ou remplacer
  css = css.replace(
    /([^{]+)\{([^}]*)\}/gs,
    (match, selectorList, declarations) => {
      const selectors = selectorList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const mapped = selectors.map((s) => {
        if (matchesRootSelector(s)) {
          // remplacer la partie root par l'ID
          return s.replace(/^([.#]?[\w-]*)(.*)$/, (_, base, pseudo) => {
            return scope + pseudo;
          });
        }
        // sinon préfixe normal
        return `${scope} ${s}`;
      });

      // Renommer animation-name
      const updatedDecl = declarations.replace(
        /animation(-name)?\s*:\s*([\w-]+)/g,
        (m, p1, anim) => {
          return m.replace(anim, anim + "_" + uniqueSuffix);
        }
      );

      return `${mapped.join(", ")} {${updatedDecl}}`;
    }
  );

  // Réinsérer at-rules
  atRules.forEach((r, idx) => {
    const ph = `/*__AT_RULE_${idx}__*/`;
    css = css.replace(
      ph,
      r.replace(/@keyframes\s+([^{\s]+)/, `@keyframes $1_${uniqueSuffix}`)
    );
  });

  return prettifyCss(css);
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

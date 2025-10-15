//Construction du site
/** 
 * Détecte si le code est CSS, sinon considère que c'est du JS.
 * @param {string} code - Le code à analyser
 * @returns {"css" | "js"} - "css" si détecté, sinon "js" par défaut
 */
function detectCodeType(code) {
  const trimmedCode = code.trim();

  if (!trimmedCode) return "js"; // Par défaut

  const cssPatterns = [
    /^\s*([.#a-z][^{]*\{)/i,               // Sélecteur CSS
    /^\s*@(?:media|keyframes|import|font-face|page)\b/i, // règle @ CSS
    /:\s*[^;{}]+\s*;/,                    // propriété CSS
    /^\s*\/\*[\s\S]*?\*\/\s*$/,           // commentaire CSS
  ];

  return cssPatterns.some(regex => regex.test(trimmedCode)) ? "css" : "js";
}

/**
 * Formate le code en priorisant CSS, sinon JS par défaut.
 * @param {string} code - Le code à formatter
 * @returns {string} - Code formaté
 */
function autoBeautify(code) {
  if (detectCodeType(code) === "css") {
    return css_beautify(code, { indent_size: 2 });
  } else {
    return js_beautify(code, { indent_size: 2 });
  }
}
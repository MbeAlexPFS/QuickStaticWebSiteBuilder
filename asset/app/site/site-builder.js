// site/site-builder.js
// Build (from make_site.js)

function buildPage(page, root = "../asset/") {
  const content = postRenderComponents(page.data, true);
  const htmlBody = content.html;

  const cssLinks = Object.keys(page.include.css || {})
    .map((name) => {
      const file = globalCSSFiles.find((f) => f.name === name);
      return file
        ? `<link href="${root}asset_site/${file.name}.css" rel="stylesheet">`
        : "";
    })
    .join("\n");

  const jsScripts = Object.keys(page.include.js || {})
    .map((name) => {
      const file = globalJSFiles.find((f) => f.name === name);
      return file
        ? `<script src="${root}asset_site/${file.name}.js"></script>`
        : "";
    })
    .join("\n");

  const pageCSS = page.css ? `<style>\n${page.css}\n</style>` : "";
  const pageJS = page.js ? `<script>\n${page.js}\n</script>` : "";

  const aosNeeded = page.data.some((comp) => comp.anim && comp.anim !== "none");
  const aosInit = aosNeeded ? `<script>AOS.init();</script>` : "";

  let libInclusion = "";
  libInclusion +=
    Object.keys(page.include.lib || {})
      .flatMap((lib_name) =>
        Object.keys(libData).map((key) =>
          key === lib_name
            ? libData[key].type
              ? libData[key].link
              : libData[key].file.includes("<script>")
                ? `<script src="${root}asset_sys/${key}.js"></script>`
                : `<link href="${root}asset_sys/${key}.css" rel="stylesheet">`
            : "",
        ),
      )
      .join("") +
    page.include["lib-required"]
      .flatMap((lib_name) =>
        Object.keys(libData).map((key) =>
          key === lib_name
            ? libData[key].type
              ? libData[key].link
              : libData[key].file.includes("<script>")
                ? `<script src="${root}asset_sys/${key}.js"></script>`
                : `<link href="${root}asset_sys/${key}.css" rel="stylesheet">`
            : "",
        ),
      )
      .join("");

  const fullHTML = `<!DOCTYPE html>
<html lang="${$("#site-lang").value}">
<head>
  ${$("#site-meta").value}
  <title>${page.title}</title>
  <link href="${root}asset_sys/aos.css" rel="stylesheet">
  <script src="${root}asset_sys/aos.js"></script>
  ${libInclusion}
  ${cssLinks}
  ${pageCSS}
  ${content.css ? `<style>${content.css}</style>` : ""}
</head>
<body>
  ${htmlBody}
  ${jsScripts}
  ${pageJS}
  ${content.js ? `<script>${content.js}</script>` : ""}
  ${aosInit}
</body>
</html>`.trim();

  return fullHTML;
}

async function build() {
  const site_name = $("#site-name").value.trim();
  const asset_file = ["aos.css", "aos.js"];

  if (!site_name) return notify("Nom du site manquant", "warning");

  const sendToServer = async (payload) => {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_name, ...payload }),
    });
    if (!response.ok)
      throw new Error("Erreur serveur lors de l'enregistrement");
    return response.text();
  };

  try {
    await sendToServer({ action: "clear", path: "build" });

    await Promise.all(
      asset_file.map(async (file) => {
        const response = await fetch("../asset/" + file);
        const text = await response.text();
        await sendToServer({
          action: "save_file",
          file_path: "build/asset/asset_sys/" + file,
          content: text,
        });
      }),
    );

    for (const file of library) {
      if (!libData[file]) continue;
      if (!libData[file].type) {
        let content = libData[file].file;
        let ext = content.includes("<script>") ? ".js" : ".css";
        content = content.replace(/<script>|<\/script>|<style>|<\/style>/g, "");

        await sendToServer({
          action: "save_file",
          file_path: `build/asset/asset_sys/${file}${ext}`,
          content: content,
        });
      }
    }

    for (const css of globalCSSFiles) {
      await sendToServer({
        action: "save_file",
        file_path: `build/asset/asset_site/${css.name}.css`,
        content: autoBeautify(css.content),
      });
    }
    for (const js of globalJSFiles) {
      await sendToServer({
        action: "save_file",
        file_path: `build/asset/asset_site/${js.name}.js`,
        content: autoBeautify(js.content),
      });
    }

    for (const page of sitePages) {
      let filePath =
        page.name === "index" ? "build/index.php" : `build/page/${page.name}.php`;
      let buildRef = page.name === "index" ? "asset/" : "../asset/";

      let htmlContent = buildPage(page, buildRef);
      let formattedHtml = html_beautify(htmlContent, { indent_size: 2 });

      await sendToServer({
        action: "save_file",
        file_path: filePath,
        content: formattedHtml,
      });
    }

    notify(`Site construit avec succès dans le dossier : /project/${site_name}/build`, "success");
  } catch (err) {
    console.error("Erreur de construction :", err);
    notify("Erreur lors de l'écriture sur le disque (Vérifiez votre serveur Node)", "error");
  }
}

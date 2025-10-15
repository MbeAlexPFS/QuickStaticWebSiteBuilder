// Initialisation avec le schéma directement
const db = new Dexie("QuickWebSiteBuilderDB");

// Définir la structure de la base dès le début
db.version(1).stores({
  componentData: "id",
  siteData: "id",
  libData: "id",
});

async function checkDatabase() {
  try {
    // Tente d'ouvrir la base de données (créée si inexistante)
    await db.open();
    console.log("La base de données est prête !");
  } catch (error) {
    console.error("Erreur lors de l'ouverture de la base de données :", error);
  }
}

// Appel de la fonction
checkDatabase();

// Ajouter ou mettre à jour des données
async function addOrUpdateData(key, data) {
  let record = JSON.stringify(data);
  if (key === "component") {
    await db.componentData.put({ id: 1, record });
  } else if (key === "site") {
    await db.siteData.put({ id: 1, record });
  } else if (key === "lib") {
    await db.libData.put({ id: 1, record });
  }

  console.log("Données ajoutées ou mises à jour !");
  alert("sauvegardé");
}

// Charger des données
async function loadData(key) {
  let record;
  if (key === "component") {
    record = await db.componentData.get(1);
  } else if (key === "site") {
    record = await db.siteData.get(1);
  } else if (key === "lib") {
    record = await db.libData.get(1);
  }

  // Si aucune donnée trouvée, retourne null
  if (!record || !record.record) return null;

  // Parse uniquement la chaîne JSON
  return JSON.parse(record.record);
}

# Quick Static WebSite Builder (QSWSB)

> Créez des sites web statiques simplement et rapidement, sans base de données.

**QSWSB** est un outil de création de sites web statiques (blogs, portfolios, catalogues, documentation) avec une interface visuelle par composants. Les données sont stockées côté serveur dans des fichiers JSON.

## Fonctionnalités

- **Gestion de composants** : Créez et gérez des composants HTML/CSS/JS personnalisables avec paramètres
- **Éditeur visuel** : Construisez chaque page du site par assemblage de composants, avec arbre hiérarchique et aperçu temps réel
- **Génération automatique** : Buildez le site statique complet en un clic
- **Sauvegarde automatique** : 3 modes au choix — par intervalle, à chaque modification, ou manuel
- **Export/Import .qswb** : Sauvegardez et restaurez l'intégralité de vos données
- **Éditeur de code intégré** : Édition avec coloration syntaxique (Monaco Editor) et détection automatique du langage
- **Stockage serveur** : Données persistées dans des fichiers JSON via une API REST
- **Thème clair/sombre** : Basculez l'apparence de l'interface
- **Médias par projet** : Chaque site possède son dossier `ressources/` avec upload depuis l'interface
- **Champ ressource** : Type de paramètre dédié dans les composants pour lier un fichier média du projet

## Prérequis

- Node.js 18+

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/MbeAlexPFS/QuickStaticWebSiteBuilder.git

# Se rendre dans le dossier
cd QuickStaticWebSiteBuilder

# Lancer le serveur
npm start
```

ou executer simplement le fichier 'start.bat'

```bash
start.bat
```

Puis ouvrez [http://127.0.0.1:3000](http://127.0.0.1:3000) dans votre navigateur.

## Utilisation rapide

1. **Créez des composants** : Définissez du HTML avec des parties personnalisables entre `{* *}`
2. **Créez un site** : Ajoutez des pages, assemblez les composants depuis le panneau latéral
3. **Builder** : Générez le site statique dans le dossier `project/`

## Paramètres

Accessible depuis l'accueil via l'icône `⚙️ Paramètres` :

- **Thème** : clair / sombre
- **Sauvegarde automatique** : Par intervalle (timer réglable) / À chaque modification / Pas de sauvegarde auto
- **Import/Export .qswb** : format portable pour sauvegarder ou transférer toutes les données
- **Réinitialisation** : efface toutes les données et revient à zéro

## Architecture

```
QuickWebSiteBuilder/
├── index.html                 # Page d'accueil
├── server.js                  # Serveur HTTP + API REST (fichiers JSON)
├── package.json
├── data/                      # Données persistées (JSON)
├── asset/
│   └── app/
│       ├── core/              # Utilitaires partagés
│       ├── site/              # Modules éditeur de site (7 fichiers)
│       ├── component/         # Modules éditeur de composants
│       └── settings/          # Module paramètres
├── page/                      # Pages HTML
│   ├── site-editor.html       # Éditeur de site
│   ├── component-editor.html  # Éditeur de composants
│   ├── settings.html          # Paramètres
│   ├── doc.html               # Documentation
│   └── view.html              # Iframe d'aperçu
├── project/                   # Sites (data.json, ressources/, build/)
│   └── [nom-du-site]/
│       ├── data.json          # Données du site
│       ├── ressources/        # Médias du projet
│       └── build/             # Fichiers de build
```

## Stack technique

| Technologie | Usage |
|---|---|
| JavaScript (ES6) | Langage principal |
| Node.js (http) | Serveur de développement + API |
| Bootstrap 5.3+ | Interface utilisateur (thème sombre via `data-bs-theme`) |
| Monaco Editor | Édition de code |
| JSON (fichiers) | Stockage des données |
| JSZip + FileSaver | Export de projet |
| Beautify | Formatage de code |
| AOS | Animations (expérimental) |

## Licence

Projet open source.

# A faire ( -> X : fait)

## creation libraires -> X 30/07/2025

- ajouter un emplacement dans l'indexedDB pour les librairies -> X
- ajouter un bouton pour acceder à un menu de création de librairie -> X
- <u>champ1</u>: nom de la librairie (unique) -> X
- <u>champ2</u>: charger la lib complète ou via son cdn -> X
- lister les libraries et ajouter un bouton d'edition et de supression -> X

## creation composant -> X ??/10/2025

- permettre l'ajout du code js du composant avec ses parties personnalisables (precisez d'utilser la variable "element" pour interargir avec le composant) -> X
- permettre l'ajout du code css du composant avec ses parties personnalisables -> X
- permettre l'ajout de librairies dont le composant dépends et permettre aussi leur suppression -> X
- <u>Note</u>: le nom des paramettres doivent êtres uniques dans un composant -> X

## Creation site -> X 18/10/2025

- Enlever le formulaire de creation de librairie et le remplacer par une selection de librairie -> X
- Ajouter les libraires dans le head d'une page en fonction des composants qui y sont installé (mais si la libraire n'est pas un cdn alors on importe les fichiers de toutes les librairies utilisé dans le site dans le build final (asset_app) ) -> X
- Ajouter du code css dans une page en fonction des composants qui y sont utilisés (depend de la classe du composant (.component-component_name)) -> X
- Ajouter du code js dans une page en fonction des composants qui y sont utilisés (depend de la classe du composant (component-component_name), on pourrait ajouter le script via un foreach de chaque de element qui a une classe du composant) -> X

## Stabilité de l'outil -> X 18/10/2025

- Optimiser les alertes qui apparaissent trop fréquenment -> X
- refactoriser tout le code pour une meilleur lisibilité -> X

## Avancé

- Faire une documentation pour l'app de base -> X
- Créer des templates de site (todo, gallery, ecommerce, blog)
- Créer un mini framework js QSWSB pour mieux gerer les composants
- Faire la documentation complète
- Ajouter une IA interne pour generer les composants et créer des pages via un prompt
- ajouter des tests unitaires

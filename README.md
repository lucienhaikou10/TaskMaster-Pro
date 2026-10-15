# 🚀 TaskMaster Pro

[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-F7DF1E?logo=javascript&logoColor=black)](#)
[![No Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#)

> **Application de gestion de tâches réactive, conçue avec une architecture State-Driven, immutabilité stricte et délégation d'événements.**  
> *Ce projet est l'un de mes projets réalisés lors de mon apprentissage de JavaScript en 2025, aujourd'hui consolidé et publié sur GitHub.*

---

## 📸 Aperçu & Démo

TaskMaster Pro illustre les fondations fondamentales du développement front-end moderne avant d'aborder des frameworks comme React, Vue ou Svelte :
* **Architecture guidée par l'état (*State-Driven UI*)**
* **Immutabilité stricte des données**
* **Délégation d'événements performante**
* **Persistance locale résiliente (`localStorage`)**
* **Protection XSS & Accessibilité a11y intégrée**

---

## 📑 Spécifications & Cahier des Charges

Le cahier des charges fonctionnel et technique révisé par l'équipe produit est disponible en version intégrale dans le fichier dédié :
👉 **[Lire le Cahier des Charges Complet (v1.1)](CAHIER_DES_CHARGES.md)**

---

## 🛠️ Fonctionnalités Clés

- ➕ **Création instantanée** : Ajout fluide au clavier (Entrée) ou au clic avec assainissement de saisie.
- ✏️ **Modification en ligne (*Inline Editing*)** : Correction instantanée du titre via le bouton « Modifier » avec raccourcis clavier (`Entrée` pour sauvegarder, `Échap` pour annuler).
- 🔄 **Résolution de parcours UX** : Si une tâche est ajoutée depuis le filtre « Terminées », la vue bascule automatiquement sur « Toutes » pour éviter la disparition perçue de la tâche.
- ✅ **Bascule d'état (*Toggle*)** : Coche synchrone par case à cocher ou clic sur l'intitulé.
- 🗑️ **Suppression sécurisée** : Retrait immédiat et recalcul réactif du compteur.
- 🔍 **Filtrage en temps réel** : Vues « Toutes », « En cours », « Terminées » appliquées à la volée sans altérer la source.
- 📊 **Compteur dynamique** : Décompte en temps réel avec gestion du singulier/pluriel.
- 💬 **États vides soignés (*Empty States*)** : Message contextuel adapté lorsqu'aucun résultat ne correspond au filtre actif.
- 💾 **Persistance défensive** : Sauvegarde automatique sous `localStorage` avec capture d'erreurs (`try/catch`).
- 🛡️ **Sécurité XSS** : Neutralisation complète des tentatives d'injections de balises et scripts malveillants.

---

## 🏛️ Architecture & Bonnes Pratiques

### Flux Unidirectionnel (State-Driven UI)
```
          ┌─────────────────────────────────────────┐
          │               tasks (State)             │
          │         currentFilter: "all"            │
          └────────────────────┬────────────────────┘
                               │
                        render() projection
                               ▼
          ┌─────────────────────────────────────────┐
          │             DOM (#task-list)            │
          └────────────────────┬────────────────────┘
                               │
               Action Utilisateur (Event Delegation)
                               ▼
          ┌─────────────────────────────────────────┐
          │      Fonctions Métier Immuables         │
          │  addTask() | toggleTask() | delete...   │
          └─────────────────────────────────────────┘
```

### Règle d'Immutabilité
Aucune méthode altérant directement les tableaux (`push`, `splice`, `shift`) n'est autorisée. Toute modification génère une nouvelle référence :
```javascript
// Ajout immuable
tasks = [...tasks, newTask];

// Modification immuable
tasks = tasks.map(t => t.id === targetId ? { ...t, completed: !t.completed } : t);

// Suppression immuable
tasks = tasks.filter(t => t.id !== targetId);
```

---

## 📂 Structure des Fichiers

```text
TaskMaster/
├── index.html              # Structure HTML5 sémantique
├── style.css               # Design moderne, accessible et responsive
├── app.js                  # Logique métier, état, événements et persistance
├── CAHIER_DES_CHARGES.md   # Spécifications détaillées (v1.1)
└── README.md               # Présentation du projet
```

---

## 🚀 Lancement & Installation

Aucune installation de paquet (npm/yarn) n'est requise.

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/votre-compte/TaskMaster.git
   cd TaskMaster
   ```
2. **Ouvrir dans le navigateur** :
   * Double-cliquez simplement sur `index.html` ou ouvrez-le avec l'extension **Live Server** sous VS Code / Antigravity.

---

## 🧪 Validation & Recette

- [x] **Persistance (F5)** : Rechargement sans perte de données.
- [x] **Zéro écouteur orphelin** : Un seul `addEventListener` sur `#task-list`.
- [x] **Test XSS** : Les saisies comme `<script>alert(1)</script>` s'affichent textuellement sans exécution.
- [x] **Accessibilité** : Navigable au clavier, `aria-pressed`, `aria-live` et `aria-label` configurés.

---

## 📄 Licence

Ce projet est sous licence MIT - libre pour usage pédagogique et personnel.

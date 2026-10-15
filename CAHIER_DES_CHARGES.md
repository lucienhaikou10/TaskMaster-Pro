# Cahier des Charges Fonctionnel & Technique (v1.1)
## Projet : TaskMaster Pro (Vanilla JS / ES6+)

> **Statut :** Prêt pour développement & versionné pour GitHub  
> **Auteur initial :** Équipe Pédagogique / Lead Dev  
> **Revue & Consolidation :** Senior Product Manager & Tech Lead  
> **Cible technique :** Vanilla JavaScript (ES6+), HTML5 sémantique, CSS3 moderne  

---

## 1. Vision & Objectifs du Produit

### 1.1 Contexte & Ambition
**TaskMaster Pro** est une application web monopage (*SPA ultra-légère*) de gestion de tâches quotidiennes.  
L'objectif central est de démontrer la maîtrise des concepts fondamentaux du web moderne sans aucun framework ou librairie tierce (React, Vue, lodash, etc.) :
* Architecture guidée par l'état (**State-Driven UI**).
* **Immutabilité stricte** des structures de données.
* **Délégation d'événements** pour des performances optimales et l'absence de fuites mémoire.
* **Résilience et sécurité** (XSS, persistance locale défensive, accessibilité a11y).

---

## 2. Arborescence du Projet

Le dépôt GitHub respecte une structure minimaliste et standardisée :

```text
TaskMaster/
├── index.html              # Structure sémantique, conteneurs et ancrages ARIA
├── style.css               # Design system épuré, responsive et classes d'état
├── app.js                  # Logique métier, état centralisé, persistance, délégation
├── CAHIER_DES_CHARGES.md   # Spécifications fonctionnelles et techniques révisées
└── README.md               # Documentation d'accueil du dépôt GitHub
```

---

## 3. Principes d'Architecture & Règles Techniques

```
+-------------------------------------------------------+
|                 État Centralisé (State)               |
|       tasks: Array<Task> | currentFilter: String      |
+-------------------------------------------------------+
           │                                ▲
           │ render()                       │ Dispatch Action
           ▼                                │ (Événement utilisateur)
+------------------------+      +-----------------------+
|  Interface Utilisateur | ---->|  Gestionnaire Events  |
|         (DOM)          |      |  (Event Delegation)   |
+------------------------+      +-----------------------+
```

1. **State-Driven UI (Flux de données unidirectionnel)** :
   * L'interface utilisateur est la projection stricte de l'état JavaScript en mémoire.
   * Aucune donnée métier n'est lue depuis les balises HTML.
   * Tout changement d'état déclenche automatiquement un appel à `saveTasks()` et `render()`.
2. **Immutabilité stricte** :
   * Bannissement total des méthodes mutables directes (`.push()`, `.splice()`, `.sort()` in-place).
   * Utilisation systématique du *spread operator* `...`, de `.map()` et de `.filter()`.
3. **Délégation d'événements (Event Delegation)** :
   * Aucun écouteur n'est attaché individuellement aux items générés (`<li>`).
   * Un seul écouteur est posé sur le parent `#task-list` pour intercepter les actions via `e.target.closest()`.
   * Un écouteur sur le conteneur des filtres `#filter-container`.
4. **Sécurité XSS & Injection** :
   * Échappement systématique des entrées utilisateur ou utilisation de `textContent` / création d'éléments DOM sécurisés.
5. **Résilience de stockage (LocalStorage)** :
   * Opérations `getItem` et `setItem` encapsulées dans des blocs `try / catch` défensifs pour parer aux corruptions JSON et dépassements de quota.

---

## 4. Modèle de Données (State Model)

### 4.1 Modèle d'une Tâche (`Task`)
```typescript
interface Task {
  id: string;        // UUID v4 sécurisé (crypto.randomUUID)
  title: string;     // Libellé nettoyé (1 à 200 caractères)
  completed: boolean;// Statut de réalisation
  createdAt: number; // Timestamp Unix en millisecondes
}
```

*Exemple d'objet :*
```json
{
  "id": "e3b0c442-98fc-1c14-9af7-4c023ddb8a92",
  "title": "Maîtriser les Design Patterns JS",
  "completed": false,
  "createdAt": 1729000000000
}
```

### 4.2 Variables d'État Globales
* `tasks` : `Array<Task>` (par défaut : `[]`).
* `currentFilter` : `"all"` | `"active"` | `"completed"` (par défaut : `"all"`).
* `STORAGE_KEY` : `"taskmaster_tasks"`.

---

## 5. Spécifications Fonctionnelles Détaillées

### F1 : Création d'une tâche
* **Déclencheur** : Soumission du formulaire `#task-form` (clic bouton ou touche `Entrée`).
* **Règles métier** :
  1. Interception de l'événement avec `e.preventDefault()`.
  2. Nettoyage de la saisie via `.trim()`. Rejet silencieux si la chaîne est vide.
  3. Longueur maximale autorisée : 200 caractères.
  4. Création d'un nouvel objet tâche avec `crypto.randomUUID()`.
  5. Ajout immuable : `tasks = [...tasks, newTask]`.
  6. **Résolution UX (Arbitrage v1.1)** : Si l'utilisateur est positionné sur le filtre `"completed"`, le filtre bascule automatiquement sur `"all"` afin que la tâche nouvellement créée apparaisse immédiatement à l'écran.
  7. Vidage du champ de saisie et remise du focus.
  8. Déclenchement de la persistance et du réaffichage.

### F2 : Changement de statut (Terminée / En cours)
* **Déclencheur** : Clic sur la checkbox ou son libellé associé.
* **Règles métier** :
  1. Inversion de `completed` via une mise à jour immuable avec `.map()`.
  2. Application de la classe CSS `.completed` sur le conteneur `.task-item`.
  3. Mise à jour de l'accessibilité (`aria-checked`).
  4. Persistance et réaffichage.

### F3 : Suppression d'une tâche
* **Déclencheur** : Clic sur le bouton `.delete-btn`.
* **Règles métier** :
  1. Retrait immuable via `.filter(task => task.id !== targetId)`.
  2. Persistance et réaffichage instantané.
  3. Bouton doté d'un `aria-label="Supprimer la tâche : {titre}"` pour l'accessibilité.

### F4 : Filtrage des tâches
* **Options** :
  * `"all"` : Affiche l'ensemble des tâches.
  * `"active"` : Tâches ayant `completed === false`.
  * `"completed"` : Tâches ayant `completed === true`.
* **Règles métier** :
  1. Le clic sur un bouton de filtre met à jour `currentFilter`.
  2. La classe `.active` est commutée sur le bouton actif, et `aria-pressed="true"` est synchronisé.
  3. Le filtrage est appliqué à la volée durant le rendu via `.filter()`, sans altérer le tableau source `tasks`.

### F5 : Compteur dynamique & Ergonomie rédactionnelle
* **Règles métier** :
  * Calcul en temps réel du nombre de tâches en cours : `tasks.filter(t => !t.completed).length`.
  * Gestion soignée du singulier / pluriel :
    * `0` tâche en cours
    * `1` tâche en cours
    * `n` tâches en cours
  * Attribut `aria-live="polite"` pour avertir les lecteurs d'écran sans perturber la navigation.

### F6 : Gestion des États Vides (*Empty States*)
* Si aucune tâche n'existe ou si le filtre courant ne renvoie aucun résultat, un composant d'information agréable s'affiche à la place d'une liste vide :
  * Filtre "all" vide : *"Aucune tâche pour le moment. Commencez par en ajouter une !"*
  * Filtre "active" vide : *"Aucune tâche en cours. Bravo !"*
  * Filtre "completed" vide : *"Aucune tâche terminée pour l'instant."*

### F7 : Persistance locale défensive (`localStorage`)
* **Lecture (`loadTasks`)** : Lecture du JSON avec `try / catch`. En cas d'erreur ou d'absence, repli sur `[]`.
* **Écriture (`saveTasks`)** : Enregistrement avec `try / catch` pour capturer un éventuel dépassement de quota.

### F8 : Modification du titre d'une tâche (Édition inline)
* **Déclencheur** : Clic sur le bouton `.edit-btn` ("Modifier").
* **Règles métier** :
  1. Passage de la tâche ciblée en mode édition (`editingTaskId`).
  2. Remplacement du libellé par un champ `<input class="edit-input">` pré-rempli, immédiatement sélectionné et focalisé.
  3. Deux boutons d'action s'affichent : « Valider » et « Annuler ».
  4. La validation (soumission du formulaire ou touche `Entrée`) applique une mise à jour immuable avec `.map()` après nettoyage `.trim()`.
  5. L'annulation (clic sur « Annuler » ou touche `Échap`) rétablit l'affichage initial sans altération.
  6. Persistance automatique dans `localStorage` en cas de validation.

---

## 6. Structure HTML de Référence d'un Élément (`<li>`)

Pour assurer une cohérence stricte entre HTML, CSS et JavaScript, chaque item est généré selon ce patron :

```html
<li class="task-item" data-id="${task.id}">
  <div class="task-left">
    <input 
      type="checkbox" 
      class="task-checkbox" 
      id="check-${task.id}" 
      ${task.completed ? 'checked' : ''}
    >
    <label for="check-${task.id}" class="task-title">
      ${escapeHTML(task.title)}
    </label>
  </div>
  <button 
    type="button" 
    class="delete-btn" 
    data-action="delete"
    aria-label="Supprimer la tâche : ${escapeHTML(task.title)}"
  >
    Supprimer
  </button>
</li>
```

---

## 7. Critères d'Acceptation & Matrice de Recette

| ID | Critère d'Acceptation | Statut Attendu |
| :--- | :--- | :--- |
| **CA-01** | **Persistance** : Actualiser la page (F5) conserve toutes les tâches et leur état. | Validé |
| **CA-02** | **Délégation d'événements** : Aucun `addEventListener` n'est attaché aux éléments `<li>` ou boutons de suppression dynamiques. | Validé |
| **CA-03** | **Sécurité XSS** : L'injection de balises HTML/scripts `<script>alert(1)</script>` est rendue inoffensive (simple texte). | Validé |
| **CA-04** | **Immutabilité** : Aucune méthode de mutation directe (`.push()`, `.splice()`) n'est employée sur l'état. | Validé |
| **CA-05** | **Empty State** : Les listes vides affichent un message clair et adapté au filtre sélectionné. | Validé |
| **CA-06** | **Résolution UX Filtre** : L'ajout d'une tâche depuis la vue "Terminées" rebascule automatiquement sur "Toutes". | Validé |
| **CA-07** | **A11y** : La navigation complète (création, toggle, suppression, filtres) est opérable au clavier et intelligible au lecteur d'écran. | Validé |

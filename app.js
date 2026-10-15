/**
 * ==============================================================================
 * TaskMaster Pro - Gestionnaire d'état réactif en JavaScript Moderne (Vanilla JS)
 * ==============================================================================
 * 
 * Ce fichier implémente une architecture "State-Driven UI" (l'interface est une
 * projection directe de l'état en mémoire) basée sur les principes fondamentaux :
 *   1. Source unique de vérité (Single Source of Truth)
 *   2. Immutabilité stricte des structures de données
 *   3. Délégation d'événements (Event Delegation)
 *   4. Persistance locale défensive (LocalStorage avec try/catch)
 *   5. Protection contre les failles d'injection (XSS)
 * 
 * @author Senior Product Manager & Tech Lead
 * @version 1.1.0
 */

// ==============================================================================
// 1. ÉTAT GLOBAL DE L'APPLICATION (APPLICATION STATE)
// ==============================================================================

/**
 * Définition du type d'une tâche pour l'autocomplétion et la documentation
 * @typedef {Object} Task
 * @property {string} id - Identifiant unique universel (UUID v4)
 * @property {string} title - Libellé assaini de la tâche (1 à 200 caractères)
 * @property {boolean} completed - Statut de complétion (true si terminée, false sinon)
 * @property {number} createdAt - Horodatage Unix de création en millisecondes
 */

/**
 * Clé unique utilisée pour stocker les tâches dans le LocalStorage du navigateur
 * @constant {string}
 */
const STORAGE_KEY = "taskmaster_tasks";

/**
 * Tableau contenant la liste des tâches (Source de vérité)
 * DOIT TOUJOURS être manipulé de manière immuable (via spread operator, map, filter).
 * @type {Task[]}
 */
let tasks = [];

/**
 * Filtre de vue actuellement actif
 * Valeurs acceptées : "all" (Toutes) | "active" (En cours) | "completed" (Terminées)
 * @type {"all" | "active" | "completed"}
 */
let currentFilter = "all";


// ==============================================================================
// 2. SÉLECTEURS DU DOM (DOM CACHING)
// ==============================================================================
// Mise en cache des références d'éléments statiques pour éviter des requêtes DOM répétées

/** @type {HTMLFormElement} Formulaire de saisie d'une nouvelle tâche */
const taskForm = document.getElementById("task-form");

/** @type {HTMLInputElement} Champ de saisie texte */
const taskInput = document.getElementById("task-input");

/** @type {HTMLDivElement} Conteneur parent des boutons de filtre */
const filterContainer = document.getElementById("filter-container");

/** @type {NodeListOf<HTMLButtonElement>} Liste des 3 boutons de filtre */
const filterButtons = document.querySelectorAll(".filter-btn");

/** @type {HTMLUListElement} Liste <ul> accueillant les items de tâches générés */
const taskList = document.getElementById("task-list");

/** @type {HTMLSpanElement} Élément affichant le nombre de tâches en cours */
const taskCount = document.getElementById("task-count");


// ==============================================================================
// 3. FONCTIONS UTILITAIRES (SÉCURITÉ & IDENTIFIANTS)
// ==============================================================================

/**
 * Génère un identifiant unique robuste.
 * Utilise en priorité l'API standard `crypto.randomUUID()` (norme cryptographique moderne).
 * Fournit un mécanisme de secours (fallback) pour les environnements plus anciens.
 * 
 * @returns {string} Identifiant unique au format chaîne
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback combinant horodatage milliseconde et chaîne pseudo-aléatoire
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Échappe les caractères HTML réservés afin d'empêcher les failles XSS (Cross-Site Scripting).
 * Tout texte saisi par l'utilisateur injecté dans un gabarit HTML passe impérativement ici.
 * 
 * @param {string} str - Chaîne brute potentiellement dangereuse
 * @returns {string} Chaîne sécurisée avec entités HTML échappées
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ==============================================================================
// 4. LOGIQUE MÉTIER & PERSISTANCE (BUSINESS LOGIC & STORAGE)
// ==============================================================================

/**
 * Charge les tâches depuis le LocalStorage du navigateur.
 * Implémentation défensive : encapsulée dans un try/catch pour prévenir les plantages
 * causés par un JSON corrompu ou un accès restreint (navigation privée).
 */
function loadTasks() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const parsedData = rawData ? JSON.parse(rawData) : [];
    // Vérification de sécurité : on garantit qu'on manipule bien un tableau
    tasks = Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error("[TaskMaster] Erreur critique lors de la lecture du LocalStorage :", error);
    tasks = []; // Repli propre sur un état vide
  }
}

/**
 * Sauvegarde l'état actuel des tâches dans le LocalStorage.
 * Capture d'éventuelles exceptions `QuotaExceededError`.
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("[TaskMaster] Erreur critique lors de la sauvegarde dans le LocalStorage :", error);
  }
}

/**
 * Ajoute une nouvelle tâche à l'état de façon strictement immuable.
 * 
 * @param {string} rawTitle - Titre brut saisi par l'utilisateur
 */
function addTask(rawTitle) {
  const title = rawTitle.trim();

  // Rejet si le libellé ne contient que des espaces
  if (title === "") {
    return;
  }

  // Création du nouvel objet tâche
  const newTask = {
    id: generateId(),
    title: title.slice(0, 200), // Sécurité supplémentaire : limite à 200 caractères
    completed: false,
    createdAt: Date.now()
  };

  // IMMUTABILITÉ : On produit un nouveau tableau via le spread operator [...]
  // Bannissement absolu de tasks.push() qui muterait le tableau existant
  tasks = [...tasks, newTask];

  // RÉSOLUTION UX : Si l'utilisateur consulte actuellement les tâches "Terminées",
  // la tâche qu'il vient de créer ne s'afficherait pas (completed = false).
  // On rebascule donc automatiquement sur le filtre "Toutes" pour un retour visuel direct.
  if (currentFilter === "completed") {
    currentFilter = "all";
  }

  // Synchronisation de la persistance puis mise à jour visuelle
  saveTasks();
  render();
}

/**
 * Inverse le statut d'achèvement d'une tâche ciblée.
 * 
 * @param {string} id - Identifiant de la tâche à basculer
 */
function toggleTask(id) {
  // IMMUTABILITÉ : .map() renvoie un nouveau tableau sans altérer l'original
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );

  saveTasks();
  render();
}

/**
 * Supprime une tâche de l'état par filtrage immuable.
 * 
 * @param {string} id - Identifiant de la tâche à supprimer
 */
function deleteTask(id) {
  // IMMUTABILITÉ : .filter() produit une nouvelle référence de tableau
  // Bannissement de tasks.splice()
  tasks = tasks.filter((task) => task.id !== id);

  saveTasks();
  render();
}

/**
 * Modifie le filtre d'affichage en cours et actualise l'interface.
 * 
 * @param {string} filter - "all" | "active" | "completed"
 */
function setFilter(filter) {
  if (["all", "active", "completed"].includes(filter)) {
    currentFilter = filter;
    render();
  }
}


// ==============================================================================
// 5. MOTEUR DE RENDU (RENDER ENGINE)
// ==============================================================================

/**
 * Fournit un message d'état vide convivial adapté au filtre courant.
 * Évite l'effet "page blanche" ou liste vide incompréhensible pour l'utilisateur.
 * 
 * @returns {string} Message textuel pour l'état vide
 */
function getEmptyStateMessage() {
  switch (currentFilter) {
    case "active":
      return "Aucune tâche en cours. Bravo !";
    case "completed":
      return "Aucune tâche terminée pour l'instant.";
    case "all":
    default:
      return "Aucune tâche pour le moment. Commencez par en ajouter une !";
  }
}

/**
 * Met à jour l'apparence des boutons de filtre et leurs attributs ARIA (accessibilité).
 */
function renderFilters() {
  filterButtons.forEach((btn) => {
    const isCurrent = btn.dataset.filter === currentFilter;
    // Bascule de la classe visuelle .active
    btn.classList.toggle("active", isCurrent);
    // Notification sémantique pour les technologies d'assistance
    btn.setAttribute("aria-pressed", isCurrent ? "true" : "false");
  });
}

/**
 * Met à jour le compteur dynamique avec gestion du singulier/pluriel.
 */
function renderCounter() {
  const activeCount = tasks.filter((t) => !t.completed).length;
  const label = activeCount > 1 ? "tâches en cours" : "tâche en cours";
  taskCount.textContent = `${activeCount} ${label}`;
}

/**
 * Moteur principal de rendu : projette l'état mémoire JavaScript dans le DOM.
 * Cette fonction est appelée systématiquement après chaque mutation de l'état.
 */
function render() {
  // 1. Filtrage à la volée des données SANS altérer le tableau source `tasks`
  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true; // Si "all", on conserve tout
  });

  // 2. Génération du HTML de la liste
  if (filteredTasks.length === 0) {
    // Cas de la liste vide : affichage du composant Empty State
    taskList.innerHTML = `<li class="empty-state">${getEmptyStateMessage()}</li>`;
  } else {
    // Cas avec éléments : génération sécurisée de chaque élément <li>
    taskList.innerHTML = filteredTasks
      .map((task) => {
        const safeTitle = escapeHTML(task.title);
        const isChecked = task.completed ? "checked" : "";
        const completedClass = task.completed ? "completed" : "";

        return `
          <li class="task-item ${completedClass}" data-id="${task.id}">
            <div class="task-left">
              <input 
                type="checkbox" 
                class="task-checkbox" 
                id="check-${task.id}" 
                ${isChecked}
                aria-label="Marquer '${safeTitle}' comme terminée"
              >
              <label for="check-${task.id}" class="task-title">${safeTitle}</label>
            </div>
            <button 
              type="button" 
              class="delete-btn" 
              data-action="delete"
              aria-label="Supprimer la tâche : ${safeTitle}"
            >
              Supprimer
            </button>
          </li>
        `;
      })
      .join("");
  }

  // 3. Mise à jour synchrone des contrôles de filtres et du compteur de statistiques
  renderFilters();
  renderCounter();
}


// ==============================================================================
// 6. GESTION DES ÉVÉNEMENTS (EVENT DELEGATION)
// ==============================================================================

/**
 * Initialise les écouteurs d'événements de l'application.
 * Principe clé : ZÉRO écouteur individuel sur les <li> ou boutons dynamiques.
 * Tout passe par la délégation d'événements sur les conteneurs parents statiques.
 */
function initEventListeners() {
  // --- A. Soumission du formulaire d'ajout ---
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Empêche le rechargement natif de la page
    addTask(taskInput.value);
    taskInput.value = ""; // Réinitialisation du champ
    taskInput.focus();    // Restitution du focus clavier
  });

  // --- B. Délégation de clic sur les boutons de filtre ---
  filterContainer.addEventListener("click", (e) => {
    const filterBtn = e.target.closest(".filter-btn");
    if (!filterBtn) return; // Clic en dehors d'un bouton de filtre ignoré
    setFilter(filterBtn.dataset.filter);
  });

  // --- C. Délégation de clic sur la liste des tâches (#task-list) ---
  taskList.addEventListener("click", (e) => {
    // Interception de l'action de suppression
    const deleteBtn = e.target.closest("[data-action='delete']");
    if (deleteBtn) {
      const taskItem = deleteBtn.closest("[data-id]");
      if (taskItem) {
        deleteTask(taskItem.dataset.id);
      }
    }
  });

  // --- D. Délégation d'état de changement (Checkbox & Label) ---
  // L'écouteur sur 'change' capte à la fois le clic sur la case à cocher,
  // le clic sur le <label for="..."> associé, et la touche Espace du clavier.
  // Cela résout élégamment tout risque de double-bascule accidentelle.
  taskList.addEventListener("change", (e) => {
    const checkbox = e.target.closest(".task-checkbox");
    if (checkbox) {
      const taskItem = checkbox.closest("[data-id]");
      if (taskItem) {
        toggleTask(taskItem.dataset.id);
      }
    }
  });
}


// ==============================================================================
// 7. INITIALISATION DE L'APPLICATION (BOOTSTRAP)
// ==============================================================================

/**
 * Point d'entrée principal au démarrage de l'application
 */
function init() {
  loadTasks();           // 1. Récupération des données persistées
  initEventListeners();  // 2. Branchement des écouteurs globaux
  render();              // 3. Premier affichage de l'interface
}

// Attente que le DOM soit intégralement parsé avant d'exécuter init()
document.addEventListener("DOMContentLoaded", init);

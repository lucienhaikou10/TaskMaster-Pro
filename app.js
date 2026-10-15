/**
 * TaskMaster Pro - Application en JavaScript Moderne (Vanilla JS)
 * Architecture : State-Driven UI & Immutabilité
 */

// ==========================================
// 1. ÉTAT DE L'APPLICATION (STATE)
// ==========================================
const STORAGE_KEY = "taskmaster_tasks";
let tasks = [];
let currentFilter = "all";

// ==========================================
// 2. SÉLECTEURS DU DOM
// ==========================================
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const filterContainer = document.getElementById("filter-container");
const filterButtons = document.querySelectorAll(".filter-btn");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");

// ==========================================
// UTILITAIRES (SÉCURITÉ & ID)
// ==========================================

/**
 * Génère un identifiant unique robuste (UUID v4 natif avec repli timestamp)
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Échappe les caractères dangereux pour neutraliser tout risque d'injection XSS
 * @param {string} str 
 * @returns {string}
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// 3. FONCTIONS MÉTIER & PERSISTANCE
// ==========================================

/**
 * Charge les tâches depuis le localStorage avec gestion défensive des erreurs
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    tasks = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Échec de la lecture du localStorage :", error);
    tasks = [];
  }
}

/**
 * Persiste l'état des tâches dans le localStorage
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Échec de l'écriture dans le localStorage :", error);
  }
}

/**
 * Ajout immuable d'une nouvelle tâche
 * @param {string} rawTitle 
 */
function addTask(rawTitle) {
  const title = rawTitle.trim();
  if (title === "") return;

  const newTask = {
    id: generateId(),
    title: title.slice(0, 200),
    completed: false,
    createdAt: Date.now()
  };

  // Immutabilité : création d'une nouvelle référence de tableau
  tasks = [...tasks, newTask];

  // UX Fix : Si l'utilisateur est sur le filtre "completed", on revient sur "all"
  // pour que la tâche créée apparaisse immédiatement sans confusion
  if (currentFilter === "completed") {
    currentFilter = "all";
  }

  saveTasks();
  render();
}

/**
 * Inverse le statut d'achèvement d'une tâche de façon immuable
 * @param {string} id 
 */
function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );

  saveTasks();
  render();
}

/**
 * Supprime une tâche de façon immuable via un filtrage
 * @param {string} id 
 */
function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);

  saveTasks();
  render();
}

/**
 * Modifie le filtre courant
 * @param {string} filter ("all" | "active" | "completed")
 */
function setFilter(filter) {
  if (["all", "active", "completed"].includes(filter)) {
    currentFilter = filter;
    render();
  }
}

// ==========================================
// 4. MOTEUR DE RENDU (RENDER)
// ==========================================

/**
 * Renvoie le texte d'état vide adapté au filtre en cours
 * @returns {string}
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
 * Met à jour les boutons de filtre (classes et attributs d'accessibilité ARIA)
 */
function renderFilters() {
  filterButtons.forEach((btn) => {
    const isCurrent = btn.dataset.filter === currentFilter;
    btn.classList.toggle("active", isCurrent);
    btn.setAttribute("aria-pressed", isCurrent ? "true" : "false");
  });
}

/**
 * Met à jour le compteur dynamique avec gestion du singulier/pluriel
 */
function renderCounter() {
  const activeCount = tasks.filter((t) => !t.completed).length;
  const label = activeCount > 1 ? "tâches en cours" : "tâche en cours";
  taskCount.textContent = `${activeCount} ${label}`;
}

/**
 * Projette l'état mémoire dans le DOM
 */
function render() {
  // 1. Filtrage à la volée des données sans muter la source
  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  // 2. Génération du HTML de la liste
  if (filteredTasks.length === 0) {
    taskList.innerHTML = `<li class="empty-state">${getEmptyStateMessage()}</li>`;
  } else {
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

  // 3. Mise à jour des filtres et du compteur
  renderFilters();
  renderCounter();
}

// ==========================================
// 5. GESTION DES ÉVÉNEMENTS (EVENT LISTENERS)
// ==========================================

/**
 * Initialisation des écouteurs d'événements
 */
function initEventListeners() {
  // Soumission du formulaire d'ajout
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTask(taskInput.value);
    taskInput.value = "";
    taskInput.focus();
  });

  // Clic sur les boutons de filtre (délégation sur le conteneur)
  filterContainer.addEventListener("click", (e) => {
    const filterBtn = e.target.closest(".filter-btn");
    if (!filterBtn) return;
    setFilter(filterBtn.dataset.filter);
  });

  // Délégation d'événements sur la liste (#task-list)
  // Clic pour suppression
  taskList.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest("[data-action='delete']");
    if (deleteBtn) {
      const taskItem = deleteBtn.closest("[data-id]");
      if (taskItem) {
        deleteTask(taskItem.dataset.id);
      }
    }
  });

  // Changement d'état de la checkbox (gère aussi le clic sur le <label for="...">)
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

/**
 * Point d'entrée de l'application
 */
function init() {
  loadTasks();
  initEventListeners();
  render();
}

// Démarrage de l'application une fois le DOM chargé
document.addEventListener("DOMContentLoaded", init);

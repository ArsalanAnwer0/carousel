// ===== GLOBAL VARIABLES =====
const API_BASE_URL = "http://localhost:5001"; // Adjust based on your backend
let currentUser = null;
let galleryData = [];
let isLoading = false;

// ===== DOM UTILITIES =====
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Create element with attributes and children
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key === "innerHTML") {
      element.innerHTML = value;
    } else if (key.startsWith("data-")) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  });

  children.forEach((child) => {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      element.appendChild(child);
    }
  });

  return element;
}

// ===== EVENT UTILITIES =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ===== TOAST NOTIFICATIONS =====
class ToastManager {
  constructor() {
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  createContainer() {
    return createElement("div", {
      className: "notification-container",
      style:
        "position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 3000; display: flex; flex-direction: column; gap: 8px;",
    });
  }

  show(message, type = "info", duration = 3000) {
    const notification = createElement("div", {
      className: "notification",
      innerHTML: `<span>${message}</span>`,
      style: `
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        color: #374151;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.1);
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        white-space: nowrap;
      `,
    });

    this.container.appendChild(notification);

    // Show animation
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateY(0)";
    }, 10);

    // Hide and remove
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateY(-10px)";
      setTimeout(() => {
        if (notification.parentNode) {
          this.container.removeChild(notification);
        }
      }, 300);
    }, duration);

    return notification;
  }

  success(message, duration) {
    return this.show(message, "success", duration);
  }

  error(message, duration) {
    return this.show(message, "error", duration);
  }

  warning(message, duration) {
    return this.show(message, "warning", duration);
  }
}

// ===== MODAL MANAGER =====
class ModalManager {
  constructor() {
    this.activeModal = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activeModal) {
        this.close();
      }
    });
  }

  create(content, options = {}) {
    const { title = "", size = "medium", closable = true } = options;

    const overlay = createElement("div", {
      className: "modal-overlay",
    });

    const modal = createElement("div", {
      className: `modal modal-${size}`,
    });

    if (title || closable) {
      const header = createElement("div", {
        className: "modal-header",
      });

      if (title) {
        header.appendChild(
          createElement("h3", {
            className: "modal-title",
            textContent: title,
          })
        );
      }

      if (closable) {
        const closeBtn = createElement("button", {
          className: "modal-close",
          innerHTML: "&times;",
        });
        closeBtn.addEventListener("click", () => this.close());
        header.appendChild(closeBtn);
      }

      modal.appendChild(header);
    }

    const modalContent = createElement("div", {
      className: "modal-content",
    });

    if (typeof content === "string") {
      modalContent.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      modalContent.appendChild(content);
    }

    modal.appendChild(modalContent);
    overlay.appendChild(modal);

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && closable) {
        this.close();
      }
    });

    return overlay;
  }

  open(content, options = {}) {
    if (this.activeModal) {
      this.close();
    }

    this.activeModal = this.create(content, options);
    document.body.appendChild(this.activeModal);

    // Trigger animation
    setTimeout(() => {
      this.activeModal.classList.add("active");
    }, 10);

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    return this.activeModal;
  }

  close() {
    if (!this.activeModal) return;

    this.activeModal.classList.remove("active");

    setTimeout(() => {
      if (this.activeModal && this.activeModal.parentNode) {
        document.body.removeChild(this.activeModal);
      }
      this.activeModal = null;
      document.body.style.overflow = "";
    }, 300);
  }
}

// ===== THEME MANAGER =====
class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || "dark";
    this.applyTheme(this.currentTheme);
  }

  getStoredTheme() {
    return localStorage.getItem("carousel-theme");
  }

  setStoredTheme(theme) {
    localStorage.setItem("carousel-theme", theme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.currentTheme = theme;
    this.setStoredTheme(theme);
  }

  toggle() {
    const newTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(newTheme);
    return newTheme;
  }
}

// ===== LOADING MANAGER =====
class LoadingManager {
  constructor() {
    this.loadingCount = 0;
    this.loadingIndicator = null;
  }

  show(message = "Loading...") {
    this.loadingCount++;

    if (!this.loadingIndicator) {
      this.loadingIndicator = createElement("div", {
        className: "loading-overlay",
        innerHTML: `
          <div class="loading-content">
            <div class="loading"></div>
            <p class="loading-text">${message}</p>
          </div>
        `,
        style: `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2500;
        `,
      });

      document.body.appendChild(this.loadingIndicator);
    }
  }

  hide() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);

    if (this.loadingCount === 0 && this.loadingIndicator) {
      document.body.removeChild(this.loadingIndicator);
      this.loadingIndicator = null;
    }
  }

  setMessage(message) {
    if (this.loadingIndicator) {
      const textElement = this.loadingIndicator.querySelector(".loading-text");
      if (textElement) {
        textElement.textContent = message;
      }
    }
  }
}

// ===== UTILITY FUNCTIONS =====
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function isValidImageFile(file) {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return validTypes.includes(file.type);
}

function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== ERROR HANDLING =====
function handleError(error, userMessage = "An error occurred") {
  console.error("Error:", error);

  // Log to external service in production
  if (window.location.hostname !== "localhost") {
    // logErrorToService(error);
  }

  toast.error(userMessage);
}

// ===== GLOBAL INSTANCES =====
const toast = new ToastManager();
const modal = new ModalManager();
const theme = new ThemeManager();
const loading = new LoadingManager();

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🎠 Carousel initialized");

  // Initialize global state
  isLoading = false;

  // Setup global error handling
  window.addEventListener("error", (e) => {
    handleError(e.error, "Something went wrong");
  });

  window.addEventListener("unhandledrejection", (e) => {
    handleError(e.reason, "Something went wrong");
  });

  // Setup keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + K for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      if (search.searchInput) {
        search.searchInput.focus();
      }
    }

    // Escape to clear search
    if (e.key === "Escape" && search.searchInput) {
      search.searchInput.value = "";
      search.clearSearch();
      search.searchInput.blur();
    }
  });

  // Setup profile avatar click
  const profileAvatar = $(".profile-avatar");
  if (profileAvatar) {
    profileAvatar.addEventListener("click", () => {
      modal.open(
        `
        <div style="text-align: center; padding: 20px;">
          <h3>Profile</h3>
          <p>Profile functionality coming soon!</p>
          <button class="btn btn-primary" onclick="modal.close()">Close</button>
        </div>
      `,
        { title: "User Profile" }
      );
    });
  }

  console.log("✅ Main.js loaded successfully");
});

// ===== EXPORT FOR OTHER MODULES =====
window.carousel = {
  toast,
  modal,
  theme,
  loading,
  utils: {
    debounce,
    throttle,
    createElement,
    formatFileSize,
    formatDate,
    generateId,
    isValidImageFile,
    createImagePreview,
    handleError,
  },
};

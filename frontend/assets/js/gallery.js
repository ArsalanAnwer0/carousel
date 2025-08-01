// ===== GALLERY MANAGER =====
class GalleryManager {
  constructor() {
    this.galleryGrid = $("#galleryGrid");
    this.images = [];
    this.filteredImages = [];
    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.isLoading = false;
    this.selectedImages = new Set();
    this.viewMode = "grid"; // 'grid' or 'masonry'
    this.sortBy = "date"; // 'date', 'name', 'size'
    this.sortOrder = "desc"; // 'asc' or 'desc'

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadImages();
  }

  setupEventListeners() {
    // Image upload listener
    document.addEventListener("imageUploaded", (e) => {
      this.addImage(e.detail);
    });

    // Infinite scroll
    window.addEventListener(
      "scroll",
      throttle(() => {
        this.handleScroll();
      }, 100)
    );

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Window resize
    window.addEventListener(
      "resize",
      debounce(() => {
        this.handleResize();
      }, 250)
    );
  }

  async loadImages() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoadingState();

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/images?page=${this.currentPage}&limit=${this.itemsPerPage}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (this.currentPage === 1) {
        this.images = data.images || [];
      } else {
        this.images = [...this.images, ...(data.images || [])];
      }

      this.filteredImages = [...this.images];
      this.sortImages();
      this.displayImages();
    } catch (error) {
      console.error("Failed to load images:", error);

      // Fallback to demo data if API fails
      if (this.currentPage === 1) {
        this.loadDemoData();
      }

      handleError(error, "Failed to load images");
    } finally {
      this.isLoading = false;
      this.hideLoadingState();
    }
  }

  loadDemoData() {
    // Demo data for development/testing
    this.images = [
      {
        id: "1",
        url: "https://picsum.photos/400/400?random=1",
        title: "Beautiful Landscape",
        description: "A stunning mountain view",
        tags: ["nature", "mountains", "landscape"],
        uploadDate: new Date().toISOString(),
        size: 156789,
        filename: "landscape.jpg",
      },
      {
        id: "2",
        url: "https://picsum.photos/400/500?random=2",
        title: "City Architecture",
        description: "Modern building design",
        tags: ["architecture", "city", "modern"],
        uploadDate: new Date(Date.now() - 86400000).toISOString(),
        size: 234567,
        filename: "architecture.jpg",
      },
      {
        id: "3",
        url: "https://picsum.photos/400/300?random=3",
        title: "Abstract Art",
        description: "Colorful abstract composition",
        tags: ["art", "abstract", "colorful"],
        uploadDate: new Date(Date.now() - 172800000).toISOString(),
        size: 198456,
        filename: "abstract.jpg",
      },
    ];

    this.filteredImages = [...this.images];
    this.displayImages();
  }

  displayImages() {
    if (!this.galleryGrid) return;

    // Clear existing placeholder cards but keep real images
    const placeholders = this.galleryGrid.querySelectorAll(".placeholder-card");
    placeholders.forEach((placeholder) => placeholder.remove());

    if (this.filteredImages.length === 0) {
      this.showEmptyState();
      return;
    }

    this.filteredImages.forEach((image, index) => {
      if (!this.galleryGrid.querySelector(`[data-image-id="${image.id}"]`)) {
        const imageCard = this.createImageCard(image, index);
        this.galleryGrid.appendChild(imageCard);
      }
    });

    // Add animation delay for new cards
    this.animateNewCards();
  }

  createImageCard(image, index) {
    const card = createElement("div", {
      className: "gallery-card fade-in",
      "data-image-id": image.id,
      style: `animation-delay: ${index * 50}ms`,
    });

    const cardContent = createElement("div", {
      className: "card-content",
    });

    // Image element
    const img = createElement("img", {
      src:
        image.url ||
        image.thumbnail ||
        "https://via.placeholder.com/400x400?text=Image",
      alt: image.title || "Gallery image",
      loading: "lazy",
    });

    // Error handling for images
    img.addEventListener("error", () => {
      img.src = "https://via.placeholder.com/400x400?text=Failed+to+Load";
    });

    // Image load handler
    img.addEventListener("load", () => {
      card.classList.add("loaded");
    });

    cardContent.appendChild(img);

    // Card actions overlay
    const actions = createElement("div", {
      className: "card-actions",
    });

    // Like button
    const likeBtn = createElement("button", {
      className: "card-action-btn like-btn",
      title: "Like",
      innerHTML: `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        `,
    });

    likeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleLike(image.id);
    });

    // Delete button
    const deleteBtn = createElement("button", {
      className: "card-action-btn delete-btn",
      title: "Delete",
      innerHTML: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3,6 5,6 21,6"></polyline>
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
    </svg>
  `,
    });

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteImage(image);
    });

    // Share button
    const shareBtn = createElement("button", {
      className: "card-action-btn share-btn",
      title: "Share",
      innerHTML: `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        `,
    });

    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.shareImage(image);
    });

    actions.appendChild(likeBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(shareBtn);
    cardContent.appendChild(actions);

    // Card info overlay
    if (image.title || image.description) {
      const cardInfo = createElement("div", {
        className: "card-info",
      });

      if (image.title) {
        cardInfo.appendChild(
          createElement("div", {
            className: "card-title",
            textContent: image.title,
          })
        );
      }

      if (image.description || image.uploadDate) {
        const meta = createElement("div", {
          className: "card-meta",
        });

        if (image.uploadDate) {
          meta.appendChild(
            createElement("span", {
              textContent: formatDate(image.uploadDate),
            })
          );
        }

        if (image.size) {
          meta.appendChild(
            createElement("span", {
              textContent: formatFileSize(image.size),
            })
          );
        }

        cardInfo.appendChild(meta);
      }

      cardContent.appendChild(cardInfo);
    }

    card.appendChild(cardContent);

    // Click handler for modal view
    card.addEventListener("click", () => {
      this.openImageModal(image);
    });

    return card;
  }

  openImageModal(image) {
    const modalContent = createElement("div", {
      className: "image-modal-content",
      style: "text-align: center; max-width: 90vw; max-height: 90vh;",
    });

    const img = createElement("img", {
      src: image.url,
      alt: image.title || "Image",
      style:
        "max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px;",
    });

    modalContent.appendChild(img);

    if (image.title || image.description) {
      const info = createElement("div", {
        style: "margin-top: 20px; text-align: left;",
      });

      if (image.title) {
        info.appendChild(
          createElement("h3", {
            textContent: image.title,
            style: "margin-bottom: 10px;",
          })
        );
      }

      if (image.description) {
        info.appendChild(
          createElement("p", {
            textContent: image.description,
            style: "color: var(--text-secondary); margin-bottom: 15px;",
          })
        );
      }

      if (image.tags && image.tags.length > 0) {
        const tags = createElement("div", {
          style: "display: flex; gap: 8px; flex-wrap: wrap;",
        });

        image.tags.forEach((tag) => {
          tags.appendChild(
            createElement("span", {
              textContent: `#${tag}`,
              style:
                "background: var(--accent-light); color: var(--accent-primary); padding: 4px 8px; border-radius: 4px; font-size: 12px;",
            })
          );
        });

        info.appendChild(tags);
      }

      modalContent.appendChild(info);
    }

    modal.open(modalContent, {
      title: image.title || "Image Details",
      size: "large",
    });
  }

  toggleLike(imageId) {
    // Implement like functionality
    toast.success("Liked!");
  }

  async deleteImage(image) {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/pins/${image.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from arrays
        this.images = this.images.filter((img) => img.id !== image.id);
        this.filteredImages = this.filteredImages.filter(
          (img) => img.id !== image.id
        );

        // Remove from DOM
        const card = document.querySelector(`[data-image-id="${image.id}"]`);
        if (card) {
          card.remove();
        }

        toast.success("Image deleted successfully!");

        // Show empty state if no images left
        if (this.images.length === 0) {
          this.showEmptyState();
        }
      } else {
        throw new Error("Failed to delete image");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete image");
    }
  }

  shareImage(image) {
    if (navigator.share) {
      navigator.share({
        title: image.title || "Shared from Carousel",
        text: image.description || "Check out this image!",
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("Link copied to clipboard!"))
        .catch(() => toast.error("Failed to share"));
    }
  }

  addImage(imageData) {
    this.images.unshift(imageData);
    this.filteredImages = [...this.images];
    this.sortImages();

    // Add to DOM
    const imageCard = this.createImageCard(imageData, 0);
    this.galleryGrid.insertBefore(imageCard, this.galleryGrid.firstChild);
  }

  sortImages() {
    this.filteredImages.sort((a, b) => {
      let aVal, bVal;

      switch (this.sortBy) {
        case "name":
          aVal = (a.title || a.filename || "").toLowerCase();
          bVal = (b.title || b.filename || "").toLowerCase();
          break;
        case "size":
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case "date":
        default:
          aVal = new Date(a.uploadDate || 0);
          bVal = new Date(b.uploadDate || 0);
          break;
      }

      if (aVal < bVal) return this.sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  filterImages(query) {
    if (!query) {
      this.filteredImages = [...this.images];
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredImages = this.images.filter(
        (image) =>
          (image.title && image.title.toLowerCase().includes(lowerQuery)) ||
          (image.description &&
            image.description.toLowerCase().includes(lowerQuery)) ||
          (image.tags &&
            image.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) ||
          (image.filename && image.filename.toLowerCase().includes(lowerQuery))
      );
    }

    this.clearGrid();
    this.displayImages();
  }

  clearGrid() {
    if (this.galleryGrid) {
      const cards = this.galleryGrid.querySelectorAll(
        ".gallery-card:not(.placeholder-card)"
      );
      cards.forEach((card) => card.remove());
    }
  }

  showEmptyState() {
    if (!this.galleryGrid) return;

    const emptyState = createElement("div", {
      className: "gallery-empty",
      innerHTML: `
          <svg class="gallery-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21,15 16,10 5,21"></polyline>
          </svg>
          <h3>No images found</h3>
          <p>Start building your gallery by uploading some images</p>
          <a href="upload.html" class="btn btn-primary">Upload Images</a>
        `,
    });

    this.galleryGrid.appendChild(emptyState);
  }

  showLoadingState() {
    if (!this.galleryGrid) return;

    const loadingState = createElement("div", {
      className: "gallery-loading",
      innerHTML: `
          <div class="loading"></div>
          <p class="loading-text">Loading images...</p>
        `,
    });

    this.galleryGrid.appendChild(loadingState);
  }

  hideLoadingState() {
    const loadingState = this.galleryGrid?.querySelector(".gallery-loading");
    if (loadingState) {
      loadingState.remove();
    }
  }

  animateNewCards() {
    const newCards = this.galleryGrid?.querySelectorAll(
      ".gallery-card.fade-in"
    );
    newCards?.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add("loaded");
      }, index * 50);
    });
  }

  handleScroll() {
    // Infinite scroll implementation
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.offsetHeight;

    if (scrollPosition >= documentHeight - 1000 && !this.isLoading) {
      this.currentPage++;
      this.loadImages();
    }
  }

  handleKeyboardShortcuts(e) {
    // Implement keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "a":
          e.preventDefault();
          this.selectAll();
          break;
      }
    }
  }

  handleResize() {
    // Handle responsive layout changes
    this.adjustGridLayout();
  }

  adjustGridLayout() {
    // Implement responsive grid adjustments if needed
  }

  selectAll() {
    // Implement select all functionality
    toast.info("Select all functionality coming soon!");
  }
}

// ===== INITIALIZE GALLERY =====
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on gallery page
  if (document.getElementById("galleryGrid")) {
    window.galleryManager = new GalleryManager();
    console.log("✅ Gallery initialized");
  }
});

// ===== EXPORT =====
window.carousel.gallery = {
  manager: window.galleryManager,
};

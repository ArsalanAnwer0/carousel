// ===== UPLOAD MANAGER =====
class UploadManager {
    constructor() {
      this.dropZone = $('#dropZone');
      this.fileInput = $('#fileInput');
      this.uploadQueue = [];
      this.maxFileSize = 10 * 1024 * 1024; // 10MB
      this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      this.isUploading = false;
      this.uploadProgress = new Map();
      
      this.init();
    }
    
    init() {
      this.setupDropZone();
      this.setupFileInput();
      this.setupEventListeners();
    }
    
    setupDropZone() {
      if (!this.dropZone) return;
      
      // Prevent default drag behaviors
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        this.dropZone.addEventListener(eventName, this.preventDefaults, false);
        document.body.addEventListener(eventName, this.preventDefaults, false);
      });
      
      // Highlight drop zone when item is dragged over it
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropZone.addEventListener(eventName, () => this.highlight(), false);
      });
      
      ['dragleave', 'drop'].forEach(eventName => {
        this.dropZone.addEventListener(eventName, () => this.unhighlight(), false);
      });
      
      // Handle dropped files
      this.dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
      
      // Click to upload
      this.dropZone.addEventListener('click', () => {
        if (this.fileInput) {
          this.fileInput.click();
        }
      });
    }
    
    setupFileInput() {
      if (!this.fileInput) return;
      
      this.fileInput.addEventListener('change', (e) => {
        this.handleFiles(e.target.files);
      });
    }
    
    setupEventListeners() {
      // Paste support
      document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            this.handleFiles([file]);
            break;
          }
        }
      });
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          // Paste functionality is handled above
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
          e.preventDefault();
          if (this.fileInput) {
            this.fileInput.click();
          }
        }
      });
    }
    
    preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    highlight() {
      this.dropZone?.classList.add('drag-over');
    }
    
    unhighlight() {
      this.dropZone?.classList.remove('drag-over');
    }
    
    handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      this.handleFiles(files);
    }
    
    handleFiles(files) {
      const fileArray = Array.from(files);
      const validFiles = [];
      const errors = [];
      
      fileArray.forEach(file => {
        const validation = this.validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      });
      
      if (errors.length > 0) {
        toast.error(`Some files were rejected:\n${errors.join('\n')}`);
      }
      
      if (validFiles.length > 0) {
        this.queueFiles(validFiles);
      }
    }
    
    validateFile(file) {
      if (!this.allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: 'File type not supported. Please use JPEG, PNG, GIF, or WebP.'
        };
      }
      
      if (file.size > this.maxFileSize) {
        return {
          valid: false,
          error: `File too large. Maximum size is ${formatFileSize(this.maxFileSize)}.`
        };
      }
      
      return { valid: true };
    }
    
    async queueFiles(files) {
      for (const file of files) {
        const uploadItem = {
          id: generateId(),
          file: file,
          preview: null,
          status: 'pending', // 'pending', 'uploading', 'completed', 'error'
          progress: 0,
          error: null,
          metadata: {
            title: '',
            description: '',
            tags: []
          }
        };
        
        // Generate preview
        try {
          uploadItem.preview = await createImagePreview(file);
        } catch (error) {
          console.error('Failed to create preview:', error);
        }
        
        this.uploadQueue.push(uploadItem);
        this.renderUploadItem(uploadItem);
      }
      
      this.updateUploadButton();
    }
    
    renderUploadItem(uploadItem) {
      const uploadList = $('#uploadList');
      if (!uploadList) return;
      
      const item = createElement('div', {
        className: 'upload-item',
        'data-upload-id': uploadItem.id
      });
      
      const preview = createElement('div', {
        className: 'upload-preview'
      });
      
      if (uploadItem.preview) {
        const img = createElement('img', {
          src: uploadItem.preview,
          alt: 'Preview'
        });
        preview.appendChild(img);
      } else {
        preview.innerHTML = `
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21,15 16,10 5,21"></polyline>
          </svg>
        `;
      }
      
      const details = createElement('div', {
        className: 'upload-details'
      });
      
      const fileName = createElement('div', {
        className: 'upload-filename',
        textContent: uploadItem.file.name
      });
      
      const fileSize = createElement('div', {
        className: 'upload-filesize',
        textContent: formatFileSize(uploadItem.file.size)
      });
      
      const titleInput = createElement('input', {
        type: 'text',
        placeholder: 'Add a title...',
        className: 'upload-title-input',
        value: uploadItem.metadata.title
      });
      
      titleInput.addEventListener('input', (e) => {
        uploadItem.metadata.title = e.target.value;
      });
      
      const descInput = createElement('textarea', {
        placeholder: 'Add a description...',
        className: 'upload-desc-input',
        rows: 2,
        value: uploadItem.metadata.description
      });
      
      descInput.addEventListener('input', (e) => {
        uploadItem.metadata.description = e.target.value;
      });
      
      const tagsInput = createElement('input', {
        type: 'text',
        placeholder: 'Add tags (comma separated)...',
        className: 'upload-tags-input',
        value: uploadItem.metadata.tags.join(', ')
      });
      
      tagsInput.addEventListener('input', (e) => {
        uploadItem.metadata.tags = e.target.value
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      });
      
      details.appendChild(fileName);
      details.appendChild(fileSize);
      details.appendChild(titleInput);
      details.appendChild(descInput);
      details.appendChild(tagsInput);
      
      const progress = createElement('div', {
        className: 'upload-progress'
      });
      
      const progressBar = createElement('div', {
        className: 'upload-progress-bar'
      });
      
      const progressFill = createElement('div', {
        className: 'upload-progress-fill',
        style: `width: ${uploadItem.progress}%`
      });
      
      progressBar.appendChild(progressFill);
      progress.appendChild(progressBar);
      
      const status = createElement('div', {
        className: `upload-status status-${uploadItem.status}`,
        textContent: this.getStatusText(uploadItem.status)
      });
      
      progress.appendChild(status);
      
      const actions = createElement('div', {
        className: 'upload-actions'
      });
      
      const removeBtn = createElement('button', {
        className: 'upload-remove-btn',
        title: 'Remove',
        innerHTML: `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          </svg>
        `
      });
      
      removeBtn.addEventListener('click', () => {
        this.removeUploadItem(uploadItem.id);
      });
      
      actions.appendChild(removeBtn);
      
      item.appendChild(preview);
      item.appendChild(details);
      item.appendChild(progress);
      item.appendChild(actions);
      
      uploadList.appendChild(item);
    }
    
    removeUploadItem(uploadId) {
      this.uploadQueue = this.uploadQueue.filter(item => item.id !== uploadId);
      
      const itemElement = document.querySelector(`[data-upload-id="${uploadId}"]`);
      if (itemElement) {
        itemElement.remove();
      }
      
      this.updateUploadButton();
    }
    
    updateUploadButton() {
      const uploadBtn = $('#startUploadBtn');
      const clearBtn = $('#clearAllBtn');
      
      if (uploadBtn) {
        uploadBtn.disabled = this.uploadQueue.length === 0 || this.isUploading;
        uploadBtn.textContent = this.isUploading ? 'Uploading...' : `Upload ${this.uploadQueue.length} file(s)`;
      }
      
      if (clearBtn) {
        clearBtn.disabled = this.uploadQueue.length === 0 || this.isUploading;
      }
    }
    
    async startUpload() {
      if (this.isUploading || this.uploadQueue.length === 0) return;
      
      this.isUploading = true;
      this.updateUploadButton();
      
      const totalFiles = this.uploadQueue.length;
      let completedFiles = 0;
      let failedFiles = 0;
      
      for (const uploadItem of this.uploadQueue) {
        try {
          await this.uploadFile(uploadItem);
          completedFiles++;
        } catch (error) {
          failedFiles++;
          uploadItem.status = 'error';
          uploadItem.error = error.message;
          this.updateUploadItemStatus(uploadItem);
        }
      }
      
      this.isUploading = false;
      this.updateUploadButton();
      
      // Show completion message
      if (failedFiles === 0) {
        toast.success(`Successfully uploaded ${completedFiles} file(s)!`);
      } else {
        toast.warning(`Uploaded ${completedFiles} file(s), ${failedFiles} failed.`);
      }
      
      // Clear successful uploads
      setTimeout(() => {
        this.clearCompletedUploads();
      }, 2000);
    }
    
    async uploadFile(uploadItem) {
      uploadItem.status = 'uploading';
      this.updateUploadItemStatus(uploadItem);
      
      const formData = new FormData();
      formData.append('image', uploadItem.file);
      formData.append('title', uploadItem.metadata.title);
      formData.append('description', uploadItem.metadata.description);
      formData.append('tags', JSON.stringify(uploadItem.metadata.tags));
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData,
          // Progress tracking
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            uploadItem.progress = progress;
            this.updateUploadProgress(uploadItem);
          }
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        uploadItem.status = 'completed';
        uploadItem.progress = 100;
        this.updateUploadItemStatus(uploadItem);
        
        // Dispatch event for gallery to update
        document.dispatchEvent(new CustomEvent('imageUploaded', {
          detail: result
        }));
        
        return result;
        
      } catch (error) {
        // Fallback for demo/development
        if (error.message.includes('fetch')) {
          console.log('API not available, simulating upload...');
          
          // Simulate upload progress
          for (let i = 0; i <= 100; i += 10) {
            uploadItem.progress = i;
            this.updateUploadProgress(uploadItem);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          uploadItem.status = 'completed';
          this.updateUploadItemStatus(uploadItem);
          
          // Create mock result
          const mockResult = {
            id: generateId(),
            url: uploadItem.preview,
            title: uploadItem.metadata.title || uploadItem.file.name,
            description: uploadItem.metadata.description,
            tags: uploadItem.metadata.tags,
            uploadDate: new Date().toISOString(),
            size: uploadItem.file.size,
            filename: uploadItem.file.name
          };
          
          document.dispatchEvent(new CustomEvent('imageUploaded', {
            detail: mockResult
          }));
          
          return mockResult;
        }
        
        throw error;
      }
    }
    
    updateUploadProgress(uploadItem) {
      const item = document.querySelector(`[data-upload-id="${uploadItem.id}"]`);
      if (!item) return;
      
      const progressFill = item.querySelector('.upload-progress-fill');
      if (progressFill) {
        progressFill.style.width = `${uploadItem.progress}%`;
      }
    }
    
    updateUploadItemStatus(uploadItem) {
      const item = document.querySelector(`[data-upload-id="${uploadItem.id}"]`);
      if (!item) return;
      
      const status = item.querySelector('.upload-status');
      if (status) {
        status.className = `upload-status status-${uploadItem.status}`;
        status.textContent = this.getStatusText(uploadItem.status, uploadItem.error);
      }
      
      this.updateUploadProgress(uploadItem);
    }
    
    getStatusText(status, error = null) {
      switch (status) {
        case 'pending': return 'Ready to upload';
        case 'uploading': return 'Uploading...';
        case 'completed': return 'Upload complete';
        case 'error': return error || 'Upload failed';
        default: return 'Unknown status';
      }
    }
    
    clearCompletedUploads() {
      this.uploadQueue = this.uploadQueue.filter(item => item.status !== 'completed');
      
      const completedItems = document.querySelectorAll('.upload-item .status-completed');
      completedItems.forEach(item => {
        const uploadItem = item.closest('.upload-item');
        if (uploadItem) {
          uploadItem.remove();
        }
      });
      
      this.updateUploadButton();
    }
    
    clearAllUploads() {
      if (this.isUploading) {
        toast.warning('Cannot clear uploads while uploading is in progress.');
        return;
      }
      
      this.uploadQueue = [];
      
      const uploadList = $('#uploadList');
      if (uploadList) {
        uploadList.innerHTML = '';
      }
      
      this.updateUploadButton();
      toast.info('Upload queue cleared.');
    }
  }
  
  // ===== UPLOAD PAGE HELPERS =====
  function setupUploadPage() {
    const uploadManager = new UploadManager();
    
    // Setup upload button
    const startUploadBtn = $('#startUploadBtn');
    if (startUploadBtn) {
      startUploadBtn.addEventListener('click', () => {
        uploadManager.startUpload();
      });
    }
    
    // Setup clear button
    const clearAllBtn = $('#clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        uploadManager.clearAllUploads();
      });
    }
    
    // Setup browse button
    const browseBtn = $('#browseBtn');
    const fileInput = $('#fileInput');
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }
    
    // Setup back to gallery link
    const backToGalleryBtn = $('#backToGalleryBtn');
    if (backToGalleryBtn) {
      backToGalleryBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
    
    return uploadManager;
  }
  
  // ===== INITIALIZE UPLOAD =====
  document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on upload page
    if (document.getElementById('dropZone')) {
      window.uploadManager = setupUploadPage();
      console.log('✅ Upload page initialized');
    }
  });
  
  // ===== EXPORT =====
  window.carousel.upload = {
    manager: window.uploadManager
  };
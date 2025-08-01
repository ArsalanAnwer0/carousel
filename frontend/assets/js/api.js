// ===== API CONFIGURATION =====
const API_CONFIG = {
    baseURL: 'http://localhost:5001',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    endpoints: {
      images: '/api/images',
      upload: '/api/upload',
      delete: '/api/images',
      search: '/api/search',
      user: '/api/user',
      auth: '/api/auth'
    }
  };
  
  // ===== HTTP CLIENT =====
  class HttpClient {
    constructor(config = {}) {
      this.baseURL = config.baseURL || API_CONFIG.baseURL;
      this.timeout = config.timeout || API_CONFIG.timeout;
      this.retryAttempts = config.retryAttempts || API_CONFIG.retryAttempts;
      this.retryDelay = config.retryDelay || API_CONFIG.retryDelay;
      this.defaultHeaders = {
        'Content-Type': 'application/json',
        ...config.headers
      };
      
      this.interceptors = {
        request: [],
        response: []
      };
    }
    
    addRequestInterceptor(interceptor) {
      this.interceptors.request.push(interceptor);
    }
    
    addResponseInterceptor(interceptor) {
      this.interceptors.response.push(interceptor);
    }
    
    async request(url, options = {}) {
      const config = {
        method: 'GET',
        headers: { ...this.defaultHeaders },
        ...options
      };
      
      // Apply request interceptors
      for (const interceptor of this.interceptors.request) {
        await interceptor(config);
      }
      
      // Build full URL
      const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      config.signal = controller.signal;
      
      let lastError;
      
      // Retry logic
      for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
        try {
          const response = await fetch(fullURL, config);
          clearTimeout(timeoutId);
          
          // Apply response interceptors
          for (const interceptor of this.interceptors.response) {
            await interceptor(response);
          }
          
          if (!response.ok) {
            throw new HttpError(response.status, response.statusText, response);
          }
          
          return response;
          
        } catch (error) {
          lastError = error;
          
          // Don't retry on client errors (4xx) or abort
          if (error.name === 'AbortError' || (error.status >= 400 && error.status < 500)) {
            break;
          }
          
          // Wait before retry
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
          }
        }
      }
      
      clearTimeout(timeoutId);
      throw lastError;
    }
    
    async get(url, params = {}) {
      const urlWithParams = this.buildURL(url, params);
      const response = await this.request(urlWithParams);
      return this.parseResponse(response);
    }
    
    async post(url, data = null, options = {}) {
      const config = {
        method: 'POST',
        ...options
      };
      
      if (data) {
        if (data instanceof FormData) {
          // Don't set Content-Type for FormData, let browser set it
          delete config.headers?.['Content-Type'];
          config.body = data;
        } else {
          config.body = JSON.stringify(data);
        }
      }
      
      const response = await this.request(url, config);
      return this.parseResponse(response);
    }
    
    async put(url, data = null) {
      const response = await this.request(url, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : null
      });
      return this.parseResponse(response);
    }
    
    async delete(url) {
      const response = await this.request(url, {
        method: 'DELETE'
      });
      return this.parseResponse(response);
    }
    
    buildURL(url, params) {
      if (Object.keys(params).length === 0) return url;
      
      const urlObj = new URL(url, this.baseURL);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          urlObj.searchParams.append(key, value);
        }
      });
      
      return urlObj.toString().replace(this.baseURL, '');
    }
    
    async parseResponse(response) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    }
    
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // ===== CUSTOM ERROR CLASS =====
  class HttpError extends Error {
    constructor(status, message, response) {
      super(message);
      this.name = 'HttpError';
      this.status = status;
      this.response = response;
    }
  }
  
  // ===== API SERVICE =====
  class ApiService {
    constructor() {
      this.client = new HttpClient();
      this.setupInterceptors();
    }
    
    setupInterceptors() {
      // Request interceptor for auth
      this.client.addRequestInterceptor(async (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      });
      
      // Response interceptor for error handling
      this.client.addResponseInterceptor(async (response) => {
        if (response.status === 401) {
          // Handle unauthorized - redirect to login
          this.handleUnauthorized();
        }
      });
    }
    
    getAuthToken() {
      return localStorage.getItem('carousel-auth-token');
    }
    
    setAuthToken(token) {
      localStorage.setItem('carousel-auth-token', token);
    }
    
    removeAuthToken() {
      localStorage.removeItem('carousel-auth-token');
    }
    
    handleUnauthorized() {
      this.removeAuthToken();
      // Could redirect to login page
      console.warn('Unauthorized access - token may be expired');
    }
    
    // ===== IMAGE ENDPOINTS =====
    async getImages(params = {}) {
      const defaultParams = {
        page: 1,
        limit: 20,
        sort: 'date',
        order: 'desc'
      };
      
      try {
        return await this.client.get(API_CONFIG.endpoints.images, {
          ...defaultParams,
          ...params
        });
      } catch (error) {
        console.error('Failed to fetch images:', error);
        
        // Return mock data for development
        return this.getMockImageData(params);
      }
    }
    
    async uploadImage(formData, onProgress = null) {
      try {
        // Create XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
              const progress = Math.round((e.loaded * 100) / e.total);
              onProgress(progress);
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                resolve(xhr.responseText);
              }
            } else {
              reject(new HttpError(xhr.status, xhr.statusText));
            }
          });
          
          xhr.addEventListener('error', () => {
            reject(new Error('Network error'));
          });
          
          xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
          });
          
          xhr.open('POST', `${this.client.baseURL}${API_CONFIG.endpoints.upload}`);
          
          // Add auth header if available
          const token = this.getAuthToken();
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          
          xhr.send(formData);
        });
        
      } catch (error) {
        console.error('Upload failed:', error);
        throw error;
      }
    }
    
    async deleteImage(imageId) {
      try {
        return await this.client.delete(`${API_CONFIG.endpoints.delete}/${imageId}`);
      } catch (error) {
        console.error('Failed to delete image:', error);
        throw error;
      }
    }
    
    async updateImage(imageId, data) {
      try {
        return await this.client.put(`${API_CONFIG.endpoints.images}/${imageId}`, data);
      } catch (error) {
        console.error('Failed to update image:', error);
        throw error;
      }
    }
    
    async searchImages(query, params = {}) {
      try {
        return await this.client.get(API_CONFIG.endpoints.search, {
          q: query,
          ...params
        });
      } catch (error) {
        console.error('Search failed:', error);
        
        // Return mock search results
        return this.getMockSearchResults(query);
      }
    }
    
    // ===== USER ENDPOINTS =====
    async getUserProfile() {
      try {
        return await this.client.get(API_CONFIG.endpoints.user);
      } catch (error) {
        console.error('Failed to get user profile:', error);
        return this.getMockUserProfile();
      }
    }
    
    async updateUserProfile(data) {
      try {
        return await this.client.put(API_CONFIG.endpoints.user, data);
      } catch (error) {
        console.error('Failed to update user profile:', error);
        throw error;
      }
    }
    
    // ===== AUTH ENDPOINTS =====
    async login(credentials) {
      try {
        const response = await this.client.post(`${API_CONFIG.endpoints.auth}/login`, credentials);
        
        if (response.token) {
          this.setAuthToken(response.token);
        }
        
        return response;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    }
    
    async logout() {
      try {
        await this.client.post(`${API_CONFIG.endpoints.auth}/logout`);
      } catch (error) {
        console.error('Logout failed:', error);
      } finally {
        this.removeAuthToken();
      }
    }
    
    async register(userData) {
      try {
        return await this.client.post(`${API_CONFIG.endpoints.auth}/register`, userData);
      } catch (error) {
        console.error('Registration failed:', error);
        throw error;
      }
    }
    
    // ===== MOCK DATA FOR DEVELOPMENT =====
    getMockImageData(params = {}) {
      const mockImages = [
        {
          id: '1',
          url: 'https://picsum.photos/400/400?random=1',
          thumbnail: 'https://picsum.photos/200/200?random=1',
          title: 'Beautiful Landscape',
          description: 'A stunning mountain view captured during golden hour',
          tags: ['nature', 'mountains', 'landscape', 'golden hour'],
          uploadDate: new Date(Date.now() - 86400000).toISOString(),
          size: 234567,
          filename: 'landscape.jpg',
          likes: 45,
          views: 234
        },
        {
          id: '2',
          url: 'https://picsum.photos/400/500?random=2',
          thumbnail: 'https://picsum.photos/200/250?random=2',
          title: 'Modern Architecture',
          description: 'Contemporary building design with clean lines',
          tags: ['architecture', 'modern', 'building', 'design'],
          uploadDate: new Date(Date.now() - 172800000).toISOString(),
          size: 345678,
          filename: 'architecture.jpg',
          likes: 32,
          views: 156
        },
        {
          id: '3',
          url: 'https://picsum.photos/400/300?random=3',
          thumbnail: 'https://picsum.photos/200/150?random=3',
          title: 'Abstract Composition',
          description: 'Vibrant colors and geometric shapes',
          tags: ['abstract', 'art', 'colorful', 'geometric'],
          uploadDate: new Date(Date.now() - 259200000).toISOString(),
          size: 198765,
          filename: 'abstract.jpg',
          likes: 67,
          views: 289
        },
        {
          id: '4',
          url: 'https://picsum.photos/400/450?random=4',
          thumbnail: 'https://picsum.photos/200/225?random=4',
          title: 'Street Photography',
          description: 'Urban life captured in black and white',
          tags: ['street', 'urban', 'black and white', 'photography'],
          uploadDate: new Date(Date.now() - 345600000).toISOString(),
          size: 276543,
          filename: 'street.jpg',
          likes: 23,
          views: 98
        },
        {
          id: '5',
          url: 'https://picsum.photos/400/350?random=5',
          thumbnail: 'https://picsum.photos/200/175?random=5',
          title: 'Nature Close-up',
          description: 'Macro photography of morning dew on leaves',
          tags: ['nature', 'macro', 'dew', 'leaves'],
          uploadDate: new Date(Date.now() - 432000000).toISOString(),
          size: 156789,
          filename: 'macro.jpg',
          likes: 89,
          views: 456
        }
      ];
      
      // Simulate pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      return {
        images: mockImages.slice(start, end),
        total: mockImages.length,
        page: page,
        totalPages: Math.ceil(mockImages.length / limit),
        hasMore: end < mockImages.length
      };
    }
    
    getMockSearchResults(query) {
      // Filter mock data based on query
      const allImages = this.getMockImageData().images;
      const results = allImages.filter(image => 
        image.title.toLowerCase().includes(query.toLowerCase()) ||
        image.description.toLowerCase().includes(query.toLowerCase()) ||
        image.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
      
      return {
        images: results,
        total: results.length,
        query: query
      };
    }
    
    getMockUserProfile() {
      return {
        id: 'user123',
        username: 'photographer',
        email: 'user@example.com',
        name: 'John Photographer',
        avatar: 'https://picsum.photos/100/100?random=999',
        uploadCount: 25,
        totalViews: 1234,
        totalLikes: 567,
        joinDate: '2024-01-15T00:00:00.000Z'
      };
    }
  }
  
  // ===== CACHE MANAGER =====
  class CacheManager {
    constructor() {
      this.cache = new Map();
      this.maxAge = 5 * 60 * 1000; // 5 minutes
      this.maxSize = 100; // Maximum cached items
    }
    
    set(key, value, maxAge = this.maxAge) {
      // Remove oldest items if cache is full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        maxAge
      });
    }
    
    get(key) {
      const item = this.cache.get(key);
      
      if (!item) return null;
      
      if (Date.now() - item.timestamp > item.maxAge) {
        this.cache.delete(key);
        return null;
      }
      
      return item.value;
    }
    
    has(key) {
      return this.get(key) !== null;
    }
    
    delete(key) {
      return this.cache.delete(key);
    }
    
    clear() {
      this.cache.clear();
    }
    
    generateKey(endpoint, params = {}) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      return `${endpoint}?${sortedParams}`;
    }
  }
  
  // ===== CONNECTION MONITOR =====
  class ConnectionMonitor {
    constructor() {
      this.isOnline = navigator.onLine;
      this.listeners = [];
      
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify('online');
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify('offline');
      });
    }
    
    addListener(callback) {
      this.listeners.push(callback);
    }
    
    removeListener(callback) {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    }
    
    notify(status) {
      this.listeners.forEach(callback => callback(status));
    }
  }
  
  // ===== GLOBAL INSTANCES =====
  const api = new ApiService();
  const cache = new CacheManager();
  const connectionMonitor = new ConnectionMonitor();
  
  // ===== CONNECTION MONITORING =====
  connectionMonitor.addListener((status) => {
    if (status === 'offline') {
      toast.warning('You are offline. Some features may not work.');
    } else {
      toast.success('Connection restored!');
    }
  });
  
  // ===== EXPORT =====
  window.carousel.api = {
    service: api,
    cache: cache,
    connectionMonitor: connectionMonitor,
    HttpClient: HttpClient,
    HttpError: HttpError
  };
  
  // ===== BACKWARD COMPATIBILITY =====
  window.API_BASE_URL = API_CONFIG.baseURL;
  
  console.log('✅ API service initialized');
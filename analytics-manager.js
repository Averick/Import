class AnalyticsManager {
  constructor() {
    this.initialized = false
    this.config = null
    this.utag_data = null
  }

  initialize(options = {}) {
    if (this.initialized) {
      console.log('Analytics Manager already initialized')
      return
    }

    try {
      // Initialize configuration
      this.config = this.initializeConfig(options)
      this.utag_data = window.utag_data || {}

      console.log('🚀 Analytics Manager initializing...', {
        pageType: this.utag_data.page_type,
        isExternalBrandedZone: this.config.isExternalBrandedZoneSite,
        hasProductInfo: !!this.config.productInfo,
      })

      // Initialize all handlers in the correct order
      this.initializeHandlers()

      // Set up page view tracking
      this.trackPageView()

      this.initialized = true
      console.log('✅ Analytics Manager initialized successfully')
    } catch (error) {
      console.error('❌ Analytics Manager initialization failed:', error)
    }
  }

  initializeConfig(options) {
    // Use global siteUser variable defined in template (matches old design)
    const siteUserData = window.siteUser || {}

    // Determine if this is an external branded zone site
    const isExternalBrandedZoneSite =
      window.utag_data?.site_type?.toLowerCase().includes('external') || false

    // Get product info if available
    let productInfo = {}
    if (
      window.productHandler &&
      typeof window.productHandler.getProductInfo === 'function'
    ) {
      productInfo = window.productHandler.getProductInfo() || {}
    }

    // Determine page make group
    let pageMakeGroup = null
    if (window.utag_data?.page_make_group) {
      pageMakeGroup = window.utag_data.page_make_group
    } else if (productInfo.product_make_group) {
      pageMakeGroup = productInfo.product_make_group
    }

    return {
      siteUser: siteUserData,
      isExternalBrandedZoneSite,
      productInfo,
      pageMakeGroup,
      ...options,
    }
  }

  initializeHandlers() {
    // Initialize analytics utilities first
    if (
      window.analyticsUtils &&
      typeof window.analyticsUtils.initialize === 'function'
    ) {
      window.analyticsUtils.initialize()
    }

    // Initialize product handler
    if (
      window.productHandler &&
      typeof window.productHandler.initialize === 'function'
    ) {
      window.productHandler.initialize(this.config)
    }

    // Initialize event handler with DID events
    if (
      window.eventHandler &&
      typeof window.eventHandler.initialize === 'function'
    ) {
      window.eventHandler.initialize(this.config)
    }

    // Initialize page handlers with eCommerce events
    if (
      window.pageHandlers &&
      typeof window.pageHandlers.initialize === 'function'
    ) {
      window.pageHandlers.initialize(this.config, this.utag_data)
    }

    // Initialize form handler (should be last to ensure other handlers are ready)
    if (
      window.formHandler &&
      typeof window.formHandler.initialize === 'function'
    ) {
      window.formHandler.initialize(this.config, this.utag_data)

      // Setup form tracking after initialization
      if (typeof window.formHandler.setupFormTracking === 'function') {
        window.formHandler.setupFormTracking()
      }
    }
  }

  trackPageView() {
    try {
      // Wait for window.load and delegate to page handlers for page-specific logic
      $(window).on('load', () => {
        if (
          window.pageHandlers &&
          typeof window.pageHandlers.handlePageViewTracking === 'function'
        ) {
          window.pageHandlers.handlePageViewTracking()
        }
      })
    } catch (error) {
      console.error('Could not track page view:', error)
    }
  }

  // Method to update configuration (useful for SPA navigation)
  updateConfig(newConfig) {
    this.config = Object.assign({}, this.config, newConfig)

    // Notify handlers of config update
    if (
      window.formHandler &&
      typeof window.formHandler.updateConfig === 'function'
    ) {
      window.formHandler.updateConfig(this.config)
    }
    if (
      window.eventHandler &&
      typeof window.eventHandler.updateConfig === 'function'
    ) {
      window.eventHandler.updateConfig(this.config)
    }
    if (
      window.pageHandlers &&
      typeof window.pageHandlers.updateConfig === 'function'
    ) {
      window.pageHandlers.updateConfig(this.config)
    }
  }

  // Method to get current configuration (for debugging)
  getConfig() {
    return { ...this.config }
  }

  // Method to get initialization status
  isInitialized() {
    return this.initialized
  }

  // Method to reinitialize (useful for SPA navigation)
  reinitialize(options = {}) {
    this.destroy()
    this.initialize(options)
  }

  // Cleanup method
  destroy() {
    try {
      // Cleanup all handlers
      if (
        window.formHandler &&
        typeof window.formHandler.destroy === 'function'
      ) {
        window.formHandler.destroy()
      }
      if (
        window.eventHandler &&
        typeof window.eventHandler.destroy === 'function'
      ) {
        window.eventHandler.destroy()
      }
      if (
        window.pageHandlers &&
        typeof window.pageHandlers.destroy === 'function'
      ) {
        window.pageHandlers.destroy()
      }
      if (
        window.productHandler &&
        typeof window.productHandler.destroy === 'function'
      ) {
        window.productHandler.destroy()
      }

      this.initialized = false
      this.config = null
      this.utag_data = null

      console.log('Analytics Manager destroyed')
    } catch (error) {
      console.error('Error during Analytics Manager cleanup:', error)
    }
  }
}

// Auto-initialize when DOM is ready
// Auto-initialize when DOM is ready, AND utag is loaded
;(function () {
  // 1. Instantiate the manager
  window.analyticsManager = new AnalyticsManager()

  // 2. Define the check and retry function
  function checkAndInitialize() {
    // Check for the critical dependency: utag object
    if (
      typeof window.utag !== 'undefined' &&
      typeof window.utag.view === 'function'
    ) {
      // Dependency ready, proceed with core initialization
      console.log('Tealium UTAG is ready. Starting Analytics Manager.')
      window.analyticsManager.initialize()
    } else {
      // Dependency not ready, retry in 50ms
      console.log('Tealium UTAG not ready, attempting retry...')
      setTimeout(checkAndInitialize, 50)
    }
  }

  // 3. Define the DOM readiness handler
  function initializeWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // When DOM is ready, start checking for utag
        checkAndInitialize()
      })
    } else {
      // DOM already loaded, start checking for utag immediately
      checkAndInitialize()
    }
  }

  // 4. Start the initialization process
  initializeWhenReady()
})()

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
      // Basic page view tracking
      const pageViewData = Object.assign({}, this.config.siteUser)

      // Add page-specific data
      if (this.utag_data.page_h1) {
        pageViewData.page_h1 = this.utag_data.page_h1
      }
      if (this.utag_data.page_type) {
        pageViewData.page_type = this.utag_data.page_type
      }
      if (this.config.pageMakeGroup) {
        pageViewData.page_make_group = this.config.pageMakeGroup
      }

      // Add product info for product pages
      if (
        this.config.productInfo &&
        Object.keys(this.config.productInfo).length > 0
      ) {
        Object.assign(pageViewData, this.config.productInfo)
      }

      // Trigger page view
      if (
        window.analyticsUtils &&
        typeof window.analyticsUtils.triggerUtagView === 'function'
      ) {
        window.analyticsUtils.triggerUtagView(pageViewData)
      }
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
;(function () {
  window.analyticsManager = new AnalyticsManager()

  function initializeWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.analyticsManager.initialize()
      })
    } else {
      // DOM already loaded
      window.analyticsManager.initialize()
    }
  }

  // Initialize immediately
  initializeWhenReady()

  // Expose for manual initialization if needed
  window.initializeAnalytics = function (options) {
    return window.analyticsManager.initialize(options)
  }
})()

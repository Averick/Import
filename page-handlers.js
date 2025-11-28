class PageHandlers {
  constructor() {
    this.initialized = false
    this.ecommerceTracked = new Set()
  }

  initialize(config, utag_data) {
    if (this.initialized) return

    this.config = config
    this.utag_data = utag_data

    // Setup page-specific logic
    this.handlePageSpecificLogic()

    // Setup eCommerce event handlers (moved from analytics-manager)
    this.setupECommerceEventHandlers()

    this.initialized = true
  }

  handlePageSpecificLogic() {
    const pageType = this.utag_data?.page_type

    if (pageType === 'search') {
      this.handleSearchPageLogic()
    } else if (pageType === 'blog') {
      this.handleBlogPageLogic()
    } else if (pageType === 'showroom') {
      this.handleShowroomPageLogic()
    } else if (pageType === 'product details') {
      this.handleProductDetailsPageLogic()
    } else if (pageType === 'home' || pageType === 'other') {
      this.handleHomePageLogic()
    }
  }

  handleSearchPageLogic() {
    console.log('Setting up search page specific logic')

    // Search page specific event tracking
    this.setupSearchResultTracking()
    this.setupFilterTracking()
  }

  handleBlogPageLogic() {
    console.log('Setting up blog page specific logic')

    // Blog page specific event tracking
    this.setupBlogInteractionTracking()
  }

  handleShowroomPageLogic() {
    console.log('Setting up showroom page specific logic')

    // Showroom page specific event tracking
    this.setupShowroomInteractionTracking()
  }

  handleProductDetailsPageLogic() {
    console.log('Setting up product details page specific logic')

    // Product details page specific event tracking
    this.setupProductDetailsTracking()
  }

  handleHomePageLogic() {
    console.log('Setting up home page specific logic')

    // Home page specific event tracking
    this.setupHomePageTracking()
  }
  handleHomePageLogic() {
    console.log('Setting up home page specific logic')

    // Home page specific event tracking
    this.setupHomePageTracking()
  } // eCommerce event handlers moved from analytics-manager
  setupECommerceEventHandlers() {
    // Add to cart event listener
    document.addEventListener('AddToCartDetails', (e) => {
      this.handleAddToCart(e)
    })

    // Remove from cart event listener
    document.addEventListener('RemoveFromCartDetails', (e) => {
      this.handleRemoveFromCart(e)
    })

    // Product view event listener
    document.addEventListener('ProductViewDetails', (e) => {
      this.handleProductView(e)
    })

    // Purchase event listener
    document.addEventListener('PurchaseDetails', (e) => {
      this.handlePurchase(e)
    })

    // Inventory interaction events
    document.addEventListener('InventoryInteraction', (e) => {
      this.handleInventoryInteraction(e)
    })
  }

  handleAddToCart(e) {
    try {
      const cartData = {
        tealium_event: 'add_to_cart',
        event_action: 'add_to_cart',
      }

      if (e.detail) {
        // Extract product information from event detail
        if (e.detail.productId) cartData.product_id = e.detail.productId
        if (e.detail.productName) cartData.product_name = e.detail.productName
        if (e.detail.productPrice)
          cartData.product_price = e.detail.productPrice
        if (e.detail.quantity) cartData.quantity = e.detail.quantity
        if (e.detail.category) cartData.product_category = e.detail.category
      }

      const final = Object.assign({}, this.config?.siteUser || {}, cartData)
      if (this.utag_data?.page_h1) {
        final.page_h1 = this.utag_data.page_h1
      }

      window.analyticsUtils?.triggerUtagLink(final, 'add_to_cart')
    } catch (error) {
      console.error('Could not process add to cart event', error)
    }
  }

  handleRemoveFromCart(e) {
    try {
      const cartData = {
        tealium_event: 'remove_from_cart',
        event_action: 'remove_from_cart',
      }

      if (e.detail) {
        if (e.detail.productId) cartData.product_id = e.detail.productId
        if (e.detail.productName) cartData.product_name = e.detail.productName
        if (e.detail.quantity) cartData.quantity = e.detail.quantity
      }

      const final = Object.assign({}, this.config?.siteUser || {}, cartData)
      if (this.utag_data?.page_h1) {
        final.page_h1 = this.utag_data.page_h1
      }

      window.analyticsUtils?.triggerUtagLink(final, 'remove_from_cart')
    } catch (error) {
      console.error('Could not process remove from cart event', error)
    }
  }

  handleProductView(e) {
    try {
      const viewData = {
        tealium_event: 'product_view',
        event_action: 'product_view',
      }

      if (e.detail) {
        if (e.detail.productId) viewData.product_id = e.detail.productId
        if (e.detail.productName) viewData.product_name = e.detail.productName
        if (e.detail.productPrice)
          viewData.product_price = e.detail.productPrice
        if (e.detail.category) viewData.product_category = e.detail.category
        if (e.detail.brand) viewData.product_brand = e.detail.brand
      }

      const final = Object.assign({}, this.config?.siteUser || {}, viewData)
      if (this.utag_data?.page_h1) {
        final.page_h1 = this.utag_data.page_h1
      }

      window.analyticsUtils?.triggerUtagLink(final, 'product_view')
    } catch (error) {
      console.error('Could not process product view event', error)
    }
  }

  handlePurchase(e) {
    try {
      const purchaseData = {
        tealium_event: 'purchase',
        event_action: 'purchase',
      }

      if (e.detail) {
        if (e.detail.orderId) purchaseData.order_id = e.detail.orderId
        if (e.detail.revenue) purchaseData.order_total = e.detail.revenue
        if (e.detail.tax) purchaseData.order_tax = e.detail.tax
        if (e.detail.shipping) purchaseData.order_shipping = e.detail.shipping
        if (e.detail.products) purchaseData.products = e.detail.products
      }

      const final = Object.assign({}, this.config?.siteUser || {}, purchaseData)
      if (this.utag_data?.page_h1) {
        final.page_h1 = this.utag_data.page_h1
      }

      window.analyticsUtils?.triggerUtagLink(final, 'purchase')
    } catch (error) {
      console.error('Could not process purchase event', error)
    }
  }

  handleInventoryInteraction(e) {
    try {
      const interactionData = {
        tealium_event: 'inventory_interaction',
      }

      if (e.detail) {
        if (e.detail.action) interactionData.interaction_type = e.detail.action
        if (e.detail.productId) interactionData.product_id = e.detail.productId
        if (e.detail.section) interactionData.page_section = e.detail.section
      }

      const final = Object.assign(
        {},
        this.config?.siteUser || {},
        interactionData
      )
      if (this.utag_data?.page_h1) {
        final.page_h1 = this.utag_data.page_h1
      }

      window.analyticsUtils?.triggerUtagLink(final, 'inventory_interaction')
    } catch (error) {
      console.error('Could not process inventory interaction event', error)
    }
  }

  // Search page specific methods
  setupSearchResultTracking() {
    // Track search result clicks
    document.addEventListener('click', (e) => {
      const searchResult = e.target.closest('.search-result-item')
      if (searchResult) {
        this.trackSearchResultClick(searchResult)
      }
    })
  }

  trackSearchResultClick(resultElement) {
    try {
      const clickData = {
        tealium_event: 'search_result_click',
      }

      // Extract result data
      const productId = resultElement.getAttribute('data-product-id')
      const productName = resultElement
        .querySelector('.product-name')
        ?.textContent?.trim()
      const position = resultElement.getAttribute('data-position')

      if (productId) clickData.product_id = productId
      if (productName) clickData.product_name = productName
      if (position) clickData.result_position = position

      const final = Object.assign({}, this.config?.siteUser || {}, clickData)
      window.analyticsUtils?.triggerUtagLink(final, 'search_result_click')
    } catch (error) {
      console.error('Could not track search result click', error)
    }
  }

  setupFilterTracking() {
    // Track filter usage
    document.addEventListener('change', (e) => {
      const filter = e.target.closest('.search-filter')
      if (filter) {
        this.trackFilterUsage(filter, e.target)
      }
    })
  }

  trackFilterUsage(filterContainer, filterElement) {
    try {
      const filterData = {
        tealium_event: 'search_filter_used',
      }

      const filterType = filterContainer.getAttribute('data-filter-type')
      const filterValue = filterElement.value

      if (filterType) filterData.filter_type = filterType
      if (filterValue) filterData.filter_value = filterValue

      const final = Object.assign({}, this.config?.siteUser || {}, filterData)
      window.analyticsUtils?.triggerUtagLink(final, 'search_filter_used')
    } catch (error) {
      console.error('Could not track filter usage', error)
    }
  }

  // Blog page specific methods
  setupBlogInteractionTracking() {
    // Track blog article interactions
    document.addEventListener('click', (e) => {
      const blogLink = e.target.closest('.blog-article-link')
      if (blogLink) {
        this.trackBlogInteraction(blogLink)
      }
    })
  }

  trackBlogInteraction(blogElement) {
    try {
      const blogData = {
        tealium_event: 'blog_interaction',
      }

      const articleTitle =
        blogElement.getAttribute('data-article-title') ||
        blogElement.querySelector('.article-title')?.textContent?.trim()
      const category = blogElement.getAttribute('data-category')

      if (articleTitle) blogData.article_title = articleTitle
      if (category) blogData.blog_category = category

      const final = Object.assign({}, this.config?.siteUser || {}, blogData)
      window.analyticsUtils?.triggerUtagLink(final, 'blog_interaction')
    } catch (error) {
      console.error('Could not track blog interaction', error)
    }
  }

  // Showroom page specific methods
  setupShowroomInteractionTracking() {
    // Track showroom interactions
    document.addEventListener('click', (e) => {
      const showroomItem = e.target.closest('.showroom-item')
      if (showroomItem) {
        this.trackShowroomInteraction(showroomItem)
      }
    })
  }

  trackShowroomInteraction(showroomElement) {
    try {
      const showroomData = {
        tealium_event: 'showroom_interaction',
      }

      const itemType = showroomElement.getAttribute('data-item-type')
      const itemName =
        showroomElement.getAttribute('data-item-name') ||
        showroomElement.querySelector('.item-name')?.textContent?.trim()

      if (itemType) showroomData.showroom_item_type = itemType
      if (itemName) showroomData.showroom_item_name = itemName

      const final = Object.assign({}, this.config?.siteUser || {}, showroomData)
      window.analyticsUtils?.triggerUtagLink(final, 'showroom_interaction')
    } catch (error) {
      console.error('Could not track showroom interaction', error)
    }
  }

  // Product details page specific methods
  setupProductDetailsTracking() {
    // Track product details interactions
    document.addEventListener('click', (e) => {
      const productAction = e.target.closest('[data-product-action]')
      if (productAction) {
        this.trackProductDetailsAction(productAction)
      }
    })
  }

  trackProductDetailsAction(actionElement) {
    try {
      const actionData = {
        tealium_event: 'product_details_action',
      }

      const action = actionElement.getAttribute('data-product-action')
      const productId = this.config?.productInfo?.product_id

      if (action) actionData.action_type = action
      if (productId) actionData.product_id = productId

      const final = Object.assign({}, this.config?.siteUser || {}, actionData)
      window.analyticsUtils?.triggerUtagLink(final, 'product_details_action')
    } catch (error) {
      console.error('Could not track product details action', error)
    }
  }

  // Home page specific methods
  setupHomePageTracking() {
    // Track home page specific interactions
    // Carousel clicks are handled by event-handler.js
    // Focus on other home page elements

    // Track hero banner clicks
    document.addEventListener('click', (e) => {
      const heroBanner = e.target.closest('.hero-banner, .banner-section')
      if (heroBanner) {
        this.trackHomeBannerClick(heroBanner)
      }
    })

    // Track featured content clicks
    document.addEventListener('click', (e) => {
      const featuredContent = e.target.closest(
        '.featured-content, .highlight-section'
      )
      if (featuredContent) {
        this.trackHomeFeaturedClick(featuredContent)
      }
    })
  }

  trackHomeBannerClick(bannerElement) {
    try {
      const bannerData = {
        tealium_event: 'home_banner_click',
      }

      const bannerTitle =
        bannerElement.getAttribute('data-banner-title') ||
        bannerElement
          .querySelector('.banner-title, h1, h2')
          ?.textContent?.trim()
      const bannerType = bannerElement.getAttribute('data-banner-type')

      if (bannerTitle) bannerData.banner_title = bannerTitle
      if (bannerType) bannerData.banner_type = bannerType
      bannerData.site_sub_section = 'home'

      const final = Object.assign({}, this.config?.siteUser || {}, bannerData)
      window.analyticsUtils?.triggerUtagLink(final, 'home_banner_click')
    } catch (error) {
      console.error('Could not track home banner click', error)
    }
  }

  trackHomeFeaturedClick(featuredElement) {
    try {
      const featuredData = {
        tealium_event: 'home_featured_click',
      }

      const contentTitle =
        featuredElement.getAttribute('data-content-title') ||
        featuredElement
          .querySelector('.content-title, .title')
          ?.textContent?.trim()
      const contentType = featuredElement.getAttribute('data-content-type')

      if (contentTitle) featuredData.content_title = contentTitle
      if (contentType) featuredData.content_type = contentType
      featuredData.site_sub_section = 'home'

      const final = Object.assign({}, this.config?.siteUser || {}, featuredData)
      window.analyticsUtils?.triggerUtagLink(final, 'home_featured_click')
    } catch (error) {
      console.error('Could not track home featured click', error)
    }
  }

  // Home page specific methods
  setupHomePageTracking() {
    // Track home page specific interactions
    // Carousel clicks are handled by event-handler.js
    // Focus on other home page elements

    // Track hero banner clicks
    document.addEventListener('click', (e) => {
      const heroBanner = e.target.closest('.hero-banner, .banner-section')
      if (heroBanner) {
        this.trackHomeBannerClick(heroBanner)
      }
    })

    // Track featured content clicks
    document.addEventListener('click', (e) => {
      const featuredContent = e.target.closest(
        '.featured-content, .highlight-section'
      )
      if (featuredContent) {
        this.trackHomeFeaturedClick(featuredContent)
      }
    })
  }

  trackHomeBannerClick(bannerElement) {
    try {
      const bannerData = {
        tealium_event: 'home_banner_click',
      }

      const bannerTitle =
        bannerElement.getAttribute('data-banner-title') ||
        bannerElement
          .querySelector('.banner-title, h1, h2')
          ?.textContent?.trim()
      const bannerType = bannerElement.getAttribute('data-banner-type')

      if (bannerTitle) bannerData.banner_title = bannerTitle
      if (bannerType) bannerData.banner_type = bannerType
      bannerData.site_sub_section = 'home'

      const final = Object.assign({}, this.config?.siteUser || {}, bannerData)
      window.analyticsUtils?.triggerUtagLink(final, 'home_banner_click')
    } catch (error) {
      console.error('Could not track home banner click', error)
    }
  }

  trackHomeFeaturedClick(featuredElement) {
    try {
      const featuredData = {
        tealium_event: 'home_featured_click',
      }

      const contentTitle =
        featuredElement.getAttribute('data-content-title') ||
        featuredElement
          .querySelector('.content-title, .title')
          ?.textContent?.trim()
      const contentType = featuredElement.getAttribute('data-content-type')

      if (contentTitle) featuredData.content_title = contentTitle
      if (contentType) featuredData.content_type = contentType
      featuredData.site_sub_section = 'home'

      const final = Object.assign({}, this.config?.siteUser || {}, featuredData)
      window.analyticsUtils?.triggerUtagLink(final, 'home_featured_click')
    } catch (error) {
      console.error('Could not track home featured click', error)
    }
  }

  destroy() {
    this.ecommerceTracked.clear()
    this.initialized = false
  }
}

// Initialize page handlers
;(function () {
  window.pageHandlers = new PageHandlers()
})()

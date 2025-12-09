class AnalyticsManager {
  constructor() {
    this.initialized = false
    this.utag_data = {}
    this.config = null
    this.domCache = {}
  }

  executeWithErrorHandling(operation, errorMessage) {
    try {
      return operation()
    } catch (err) {
      console.error(errorMessage, err.message)
    }
  }

  getCachedElement(selector, cacheKey) {
    return $(window.analyticsUtils.getCachedElement(selector, cacheKey))
  }

  triggerUtagView(customData = {}) {
    window.analyticsUtils.triggerUtagView(this.utag_data, customData)
  }

  triggerUtagLink(eventType, customData = {}) {
    window.analyticsUtils.triggerUtagLink(this.utag_data, eventType, customData)
  }

  initialize(config) {
    console.log('Initializing Tealium Analytics Manager')
    this.config = config

    // Process configuration and create utag_data
    this.processConfiguration()

    window.utag_data = this.utag_data

    this.initialized = true

    this.initializePageHandlers()

    return this
  }

  processConfiguration() {
    // Create base utag_data from siteUser
    this.utag_data = Object.assign({}, this.config.siteUser)

    // Add page-specific data
    this.addPageDataToUtag()

    // Add search data if applicable
    this.addSearchDataToUtag()
  }

  addPageDataToUtag() {
    const config = this.config

    if (config.pageType) this.utag_data.page_type = config.pageType
    if (config.pageSubType) this.utag_data.page_sub_type = config.pageSubType
    if (config.pageBrand) this.utag_data.page_make = config.pageBrand
    if (config.pageBrandId) this.utag_data.page_make_id = config.pageBrandId
    if (config.pageBrandCategory)
      this.utag_data.page_category = config.pageBrandCategory
    if (config.pageBrandCategoryId)
      this.utag_data.page_category_id = config.pageBrandCategoryId
    if (config.pageBrandSubCategory)
      this.utag_data.page_sub_category = config.pageBrandSubCategory
    if (config.pageBrandSubCategoryId)
      this.utag_data.page_sub_category_id = config.pageBrandSubCategoryId
    if (config.pageMakeGroup)
      this.utag_data.page_make_group = config.pageMakeGroup
  }

  addSearchDataToUtag() {
    const config = this.config

    // Process search filters if this is a search page
    if (config.pageType === 'search') {
      this.processSearchFilters()
    }

    if (config.searchKeyword)
      this.utag_data.search_keyword = config.searchKeyword
    if (
      config.searchPageAppliedFilters &&
      config.searchPageAppliedFilters.length > 0
    ) {
      this.utag_data.search_filters = config.searchPageAppliedFilters
    }
  }

  processSearchFilters() {
    const url = decodeURI(window.location.href)
    const inventoryIndex = url.indexOf('/inventory/')

    if (inventoryIndex !== -1) {
      const segments = url.substring(inventoryIndex + 11).split('/')
      const filters = {}

      // Process segments in pairs (filterName/filterValue)
      for (let i = 0; i < segments.length - 1; i += 2) {
        const key = segments[i]
        const value = segments[i + 1]

        if (key && value) {
          ;(filters[key] = filters[key] || []).push(value)
        }
      }

      // Separate query from other filters
      this.config.searchPageAppliedFilters = []
      Object.keys(filters).forEach((key) => {
        if (key === 'query') {
          this.config.searchKeyword = filters[key]
        } else {
          this.config.searchPageAppliedFilters.push(
            key + ':' + filters[key].join(',')
          )
        }
      })
    }
  }

  initializePageHandlers() {
    $(document).ready(() => {
      this.handleDocumentReady()
    })

    $(window).load(() => {
      this.handleWindowLoad()
    })
  }

  handleDocumentReady() {
    this.executeWithErrorHandling(() => {
      if (window.productHandler) {
        window.productHandler.getProductAnalyticsData(this.config)
        this.utag_data = $.extend({}, this.utag_data, this.config.productInfo)
      }
    }, 'Error processing product analytics:')

    this.executeWithErrorHandling(() => {
      if (window.productHandler) {
        window.productHandler.getPromotionAnalyticsData(this.config)
        this.utag_data = $.extend(
          {},
          this.utag_data,
          this.config.brandPromotionInfo
        )
      }
    }, 'Error processing promotion analytics:')

    this.utag_data.podium_chatbox_active =
      this.getCachedElement("div[class*='Premium-Texting_']", 'podiumChatbox')
        .length != 0
        ? 1
        : 0

    if (
      this.getCachedElement('#pageNotFoundModal', 'pageNotFoundModal').length
    ) {
      this.utag_data.tealium_event = 'error_view'
      this.utag_data.site_section = 'error'
      this.utag_data.site_sub_section = 'error'
      this.utag_data.page_error_code = '404'
    }

    if (window.eventHandler) {
      window.eventHandler.initialize(this.config, this.utag_data)
    }

    var allH1InHeader = this.getCachedElement('h1', 'h1Elements')
    if (allH1InHeader.length > 0) {
      this.utag_data.page_h1 = allH1InHeader[0].innerText
    }

    if (window.pageHandlers) {
      window.pageHandlers.handlePageSpecificLogic(this.config, this.utag_data)
    }

    this.executeWithErrorHandling(() => {
      this.config.loadTealiumScript() // Script should be loaded after all utag_data datapoints are created
    }, 'Could not load tealium script.')

    if (window.formHandler) {
      window.formHandler.initialize(this.config, this.utag_data)
    }

    if (
      this.getCachedElement(
        '[class*="New-Holland-CE-Dealer-Landing-Page"]',
        'newHollandCE'
      ).length > 0
    ) {
      this.utag_data.tealium_event = 'oem_standard_branded_zone_view'
      this.utag_data.page_make = 'new holland construction'
      this.utag_data.page_make_group = 'new holland construction'
    }

    // Initialize custom document event listeners
    this.setupCustomEventListeners()
  }

  setupCustomEventListeners() {
    // DIDViewOfferDetailsClick event listener (from old template)
    document.addEventListener('DIDViewOfferDetailsClick', (e) => {
      this.executeWithErrorHandling(() => {
        var promo = {}
        promo.tealium_event = 'did_view_offer_details_click'
        if (e.detail) {
          promo.did_promotions_name = e.detail.promotionName
          promo.campaign_id = e.detail.promotionId
        }
        var final = Object.assign({}, this.config.siteUser, promo)
        window.analyticsUtils.triggerUtagLink(
          final,
          'did_view_offer_details_click'
        )
      }, 'Could not trigger utag.link on promotion ' + (e.detail?.promotionId || ''))
    })

    // DIDViewMoreClick event listener (from old template)
    document.addEventListener('DIDViewMoreClick', (e) => {
      this.executeWithErrorHandling(() => {
        var promo = {}
        promo.tealium_event = 'did_view_more_click'
        if (e.detail) {
          promo.did_promotions_name = e.detail.promotionName
          promo.campaign_id = e.detail.promotionId
        }
        var final = Object.assign({}, this.config.siteUser, promo)
        window.analyticsUtils.triggerUtagLink(final, 'did_view_more_click')
      }, 'Could not trigger utag.link on promotion ' + (e.detail?.promotionId || ''))
    })

    // FormSubmissionDetails event listener (from old template)
    document.addEventListener('FormSubmissionDetails', (e) => {
      this.executeWithErrorHandling(() => {
        var form = {}
        form.tealium_event = 'form_submit'

        if (e.detail && e.detail.formData) {
          form = Object.assign({}, form, e.detail.formData)
        }

        // Handle specific form submission types
        if (form.form_name === 'Get A Quote') {
          form.tealium_event = 'did_get_a_quote_form_submit'
        }

        // Extract productDetails based on pageType (matches old template logic)
        const pageType = this.utag_data?.page_type || 'other'
        let productDetails = {}

        if (pageType === 'search') {
          // For search pages, parse from form data
          if (e.detail && e.detail.formData && window.productHandler) {
            productDetails =
              window.productHandler.parseProductsData(
                this.config,
                e.detail.formData
              ) || {}
          }
        } else if (pageType === 'finance') {
          // For finance pages, get from query string
          if (
            window.productHandler &&
            window.productHandler.getProductsDataFromQueryString
          ) {
            productDetails =
              window.productHandler.getProductsDataFromQueryString() || {}
          }
        } else {
          // For product details and other pages, use global productInfo
          productDetails = this.config.productInfo || {}
        }

        // Get showcase and promotion data (matches old template)
        const showcaseData =
          window.productHandler?.getShowCaseData?.(this.utag_data) || {}
        const promotionData =
          window.productHandler?.getPromotionData?.(form, e.detail?.formData) ||
          {}

        // Merge all data (matches old template structure)
        var final = Object.assign(
          {},
          this.config.siteUser,
          form,
          productDetails,
          showcaseData,
          promotionData
        )

        if (this.utag_data.page_h1) {
          final.page_h1 = this.utag_data.page_h1
        }

        // Set page make info from product details (matches old template)
        if (productDetails.product_make) {
          final.page_make = productDetails.product_make.toLowerCase()
        }
        if (productDetails.product_make_id) {
          final.page_make_id = productDetails.product_make_id
        }
        if (this.config.pageMakeGroup) {
          final.page_make_group = this.config.pageMakeGroup
        }

        window.analyticsUtils.triggerUtagLink(final, form.tealium_event)
      }, 'Could not trigger utag.link method for form submission')
    })

    // Inventory promo message click handler (from old template)
    this.setupInventoryPromoHandler()

    // eCommerce event listeners
    this.setupEcommerceEventListeners()
  }

  setupInventoryPromoHandler() {
    // Set up promotion link tracking (from old template)
    const limitedTimeOfferBtnClicked = 'limitedTimeOfferBtnClicked_flag'

    // Track promotion link clicks and set localStorage flag
    $('.promotion-link').click(function () {
      localStorage.setItem(limitedTimeOfferBtnClicked, true)
    })

    // Product details page specific handling (from old template)
    const pageType = this.utag_data?.page_type || 'other'
    if (pageType === 'product details') {
      // Check if user came from promotion link click
      if (localStorage.getItem(limitedTimeOfferBtnClicked)) {
        this.handleLimitedTimeOfferButtonClick()
        localStorage.removeItem(limitedTimeOfferBtnClicked)
      }

      // Set up inventory promo message click handler
      const inventoryPromoMessage = document.getElementById(
        'inventory_promoMessage'
      )
      if (inventoryPromoMessage) {
        inventoryPromoMessage.addEventListener('click', () => {
          this.handleLimitedTimeOfferButtonClick()
        })
      }
    }
  }

  // Handle limited time offer button click (from old template)
  handleLimitedTimeOfferButtonClick() {
    this.executeWithErrorHandling(() => {
      this.utag_data.tealium_event = 'did_limited_time_offer_click'
      window.analyticsUtils.triggerUtagLink(
        this.utag_data,
        'did_limited_time_offer_click'
      )
    }, 'Could not trigger limited time offer click event')
  }

  setupEcommerceEventListeners() {
    // eCommerce event handling (from old template)
    $(document).on('ecommerce_part_modify_cart', (event) => {
      this.executeWithErrorHandling(() => {
        if (
          event.data &&
          event.data.tealium_event === 'ecommerce_part_modify_cart' &&
          !('ecomm_part_detail_inventory_class' in event.data)
        ) {
          event.data.ecomm_part_detail_inventory_class = 'Part'
        }
        if (
          event.data &&
          event.data.tealium_event === 'ecommerce_part_cart_action'
        ) {
          event.data.ecomm_part_detail_inventory_class = 'Part'
        }
      }, 'Error processing eCommerce event')
    })

    window.utag_data = this.utag_data
  }

  handleWindowLoad() {
    const { pageType, referenceError } = this.config

    if (pageType === 'search' || pageType === 'product details') {
      this.utag_data.digital_retailing_active =
        document.getElementsByClassName('boatyard-btn').length > 0 ? 1 : 0
      this.utag_data.reserve_a_unit_active =
        document.querySelectorAll('#reserveUnitBtn').length > 0 ? 1 : 0
    }

    var pssExists = $(".component[class*='PSS-component_']").length >= 1
    var oemPartsLookupExists =
      $(".component[class*='OEMPartsLookup_']").length >= 1
    if (!pssExists || oemPartsLookupExists) {
      this.triggerUtagView()
    }

    if (window.formHandler) {
      window.formHandler.setTrackingCallback((eventType, data) => {
        this.triggerUtagLink(eventType, data)
      })
      window.formHandler.setupFormTracking()
      window.formHandler.setupFormSubmissionTracking()
    }

    window.utag_data = this.utag_data
  }

  updateUtagData(updates) {
    this.utag_data = $.extend({}, this.utag_data, updates)
    window.utag_data = this.utag_data
  }

  getUtagData() {
    return this.utag_data
  }
}

;(function () {
  window.analyticsManager = new AnalyticsManager()
})()

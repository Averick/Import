class EventHandler {
  constructor() {
    this.initialized = false
    this.eventMaps = {}
  }

  initialize(config) {
    if (this.initialized) return

    this.config = config
    this.setupEventDelegation()
    this.setupCustomEventListeners() // Moved from analytics-manager

    this.initialized = true
  }

  setupEventDelegation() {
    // Enhanced event delegation using mousedown for more accurate click tracking
    document.addEventListener('mousedown', (e) => {
      this.handleMouseDownEvents(e)
    })

    // Setup specific event delegation maps
    this.setupGoogleMapsEvents()
    this.setupPromoAndCarouselEvents()
  }

  setupGoogleMapsEvents() {
    this.eventMaps.googleMaps = {
      selectors: [
        'a[href*="maps.google.com"]',
        'a[href*="www.google.com/maps"]',
        'a[href*="goo.gl/maps"]',
        '.google-maps-link',
        '[data-event="google-maps"]',
      ],
      handler: (element) => {
        const eventData = Object.assign({}, this.config?.siteUser || {})
        eventData.tealium_event = 'google_maps_click'
        eventData.click_text = element.textContent?.trim() || ''
        eventData.click_url = element.href || ''

        window.analyticsUtils?.triggerUtagLink(eventData, 'google_maps_click')
      },
    }
  }

  setupPromoAndCarouselEvents() {
    // Carousel events (home page promotions carousel)
    this.eventMaps.carousel = {
      selectors: [
        '.promo-carousel',
        '.promotional-carousel',
        '[class*="carousel"]',
        '[class*="slider"]',
        '[class*="slick-slider"]',
      ],
      handler: (element) => {
        this.handleCarouselClick(element)
      },
    }

    // General promo clicks
    this.eventMaps.promoClick = {
      selectors: [
        '[data-event="promo-click"]',
        '.promotion-slide',
        '.promo-item',
      ],
      handler: (element) => {
        this.handlePromoClick(element)
      },
    }
  }

  // Handle carousel clicks (matches old design exactly)
  handleCarouselClick(element) {
    const currentlyVisibleSlide = element.querySelector(
      'div[class*="slide slick-slide slick-current"]'
    )
    let currentlyVisibleSlideIndex = ''
    let currentlyVisibleSlideName = ''

    if (currentlyVisibleSlide) {
      currentlyVisibleSlideIndex =
        currentlyVisibleSlide.getAttribute('data-slick-index') || ''
      const slideImage = currentlyVisibleSlide.querySelector('img')
      if (slideImage) {
        currentlyVisibleSlideName = slideImage.getAttribute('title') || ''
      }
    }

    const eventData = Object.assign({}, this.config?.siteUser || {})
    eventData.tealium_event = 'carousel_click'
    eventData.carousel_asset_name = currentlyVisibleSlideName
    eventData.carousel_asset_index = currentlyVisibleSlideIndex
    eventData.site_sub_section = 'home'

    window.analyticsUtils?.triggerUtagLink(eventData, 'carousel_click')
  }

  // Handle general promo clicks
  handlePromoClick(element) {
    const clickedPromotionDetails = element.querySelector('script')
    const eventData = Object.assign({}, this.config?.siteUser || {})

    if (clickedPromotionDetails) {
      try {
        const promotionDataSource = JSON.parse(
          clickedPromotionDetails.innerHTML.replace(/&quot;/g, '"')
        )
        if (promotionDataSource.promotionId) {
          eventData.promotion_id = promotionDataSource.promotionId
          eventData.promotion_name = promotionDataSource.promotionName
        }
        if (promotionDataSource.promotionMakeId) {
          eventData.promotion_make_id = promotionDataSource.promotionMakeId
          eventData.promotion_make = promotionDataSource.promotionMake
        }
        if (promotionDataSource.promotionCategoryId) {
          eventData.promotion_category = promotionDataSource.promotionCategory
          eventData.promotion_category_id =
            promotionDataSource.promotionCategoryId
        }
      } catch (error) {
        console.warn('Could not parse promotion data:', error)
      }
    }

    eventData.site_section = 'promo'
    eventData.site_sub_section = 'promo_detail'
    eventData.tealium_event = 'promo_click'

    window.analyticsUtils?.triggerUtagLink(eventData, 'promo_click')
  }

  // Custom event listeners moved from analytics-manager.js
  setupCustomEventListeners() {
    // DIDViewOfferDetailsClick event listener (moved from analytics-manager)
    document.addEventListener('DIDViewOfferDetailsClick', (e) => {
      this.handleDIDViewOfferDetailsClick(e)
    })

    // DIDViewMoreClick event listener (moved from analytics-manager)
    document.addEventListener('DIDViewMoreClick', (e) => {
      this.handleDIDViewMoreClick(e)
    })
  }

  handleDIDViewOfferDetailsClick(e) {
    try {
      var form = {}
      form.tealium_event = 'did_view_offer_details_click'

      if (e.detail) {
        if (e.detail.promotionTitle) {
          form.did_promotions_name = e.detail.promotionTitle
        }
        if (e.detail.promotionIds) {
          form.campaign_id = e.detail.promotionIds
        }

        // Store in localStorage for form tracking
        if (localStorage) {
          if (e.detail.promotionTitle) {
            localStorage.selectedPromotionTitle = e.detail.promotionTitle
          }
          if (e.detail.promotionIds) {
            localStorage.selectedPromotionIds = e.detail.promotionIds
          }
        }
      }

      var final = Object.assign({}, this.config?.siteUser || {}, form)
      if (window.utag_data && window.utag_data.page_h1) {
        final.page_h1 = window.utag_data.page_h1
      }

      window.analyticsUtils?.triggerUtagLink(
        final,
        'did_view_offer_details_click'
      )
    } catch (error) {
      console.error('Could not process DIDViewOfferDetailsClick event', error)
    }
  }

  handleDIDViewMoreClick(e) {
    try {
      var form = {}
      form.tealium_event = 'did_view_more_click'

      if (e.detail) {
        // Add any specific data from the event detail
        if (e.detail.section) {
          form.section_name = e.detail.section
        }
        if (e.detail.content) {
          form.content_type = e.detail.content
        }
      }

      var final = Object.assign({}, this.config?.siteUser || {}, form)
      if (window.utag_data && window.utag_data.page_h1) {
        final.page_h1 = window.utag_data.page_h1
      }

      window.analyticsUtils?.triggerUtagLink(final, 'did_view_more_click')
    } catch (error) {
      console.error('Could not process DIDViewMoreClick event', error)
    }
  }

  handleMouseDownEvents(e) {
    const element = e.target

    // Process each event map
    Object.keys(this.eventMaps).forEach((mapKey) => {
      const eventMap = this.eventMaps[mapKey]

      // Check if element matches any selector in this map
      const matchingSelector = eventMap.selectors.find((selector) => {
        try {
          return element.matches(selector) || element.closest(selector)
        } catch (err) {
          // Handle invalid selectors gracefully
          return false
        }
      })

      if (matchingSelector) {
        const targetElement = element.matches(matchingSelector)
          ? element
          : element.closest(matchingSelector)

        if (targetElement && eventMap.handler) {
          eventMap.handler(targetElement)
        }
      }
    })

    // Handle BRP branded zone events
    this.handleBRPBrandedZoneEvents(element)
  }

  handleBRPBrandedZoneEvents(element) {
    // BRP branded zone specific event handling
    if (this.config?.isExternalBrandedZoneSite) {
      const brandedZoneLink =
        element.closest('a[href*="brp-zone"]') ||
        element.closest('.brp-branded-link')

      if (brandedZoneLink) {
        const eventData = Object.assign({}, this.config?.siteUser || {})
        eventData.tealium_event = 'brp_branded_zone_click'
        eventData.click_url = brandedZoneLink.href || ''
        eventData.click_text = brandedZoneLink.textContent?.trim() || ''

        window.analyticsUtils?.triggerUtagLink(
          eventData,
          'brp_branded_zone_click'
        )
      }
    }
  }

  // Method to add new event mappings dynamically
  addEventMapping(key, selectors, handler) {
    this.eventMaps[key] = {
      selectors: Array.isArray(selectors) ? selectors : [selectors],
      handler: handler,
    }
  }

  // Method to remove event mappings
  removeEventMapping(key) {
    delete this.eventMaps[key]
  }

  // Method to get current event mappings (for debugging)
  getEventMappings() {
    return Object.keys(this.eventMaps).reduce((acc, key) => {
      acc[key] = {
        selectors: this.eventMaps[key].selectors,
        hasHandler: typeof this.eventMaps[key].handler === 'function',
      }
      return acc
    }, {})
  }

  destroy() {
    // Remove event listeners if needed
    this.eventMaps = {}
    this.initialized = false
  }
}

// Initialize event handler
;(function () {
  window.eventHandler = new EventHandler()
})()

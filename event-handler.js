class EventHandler {
  constructor() {
    this.initialized = false
  }

  triggerUtagLink(eventData) {
    window.analyticsUtils.triggerUtagLink({}, null, eventData)
  }

  triggerUtagTrack(eventName, eventData) {
    window.analyticsUtils.triggerUtagTrack(eventName, eventData)
  }

  initialize(config, utag_data) {
    if (this.initialized) return
    const handleGoogleMapClick = (event) => {
      utag_data.tealium_event = 'google_map_click'
      this.triggerUtagLink({ tealium_event: 'google_map_click' })
    }
    const handlePromoClick = (event, matchingElement) => {
      var clickedPromotionDetails = matchingElement.querySelector('script')

      if (clickedPromotionDetails) {
        try {
          var clickedPromotionDetailsJson = JSON.parse(
            clickedPromotionDetails.innerHTML
          )
          utag_data.promotion_id = clickedPromotionDetailsJson.id
          utag_data.promotion_name = clickedPromotionDetailsJson.name
          utag_data.promotion_creative = clickedPromotionDetailsJson.creative
          utag_data.promotion_category = clickedPromotionDetailsJson.category
          utag_data.promotion_position = clickedPromotionDetailsJson.position
          utag_data.promotion_discount = clickedPromotionDetailsJson.discount
          utag_data.promotion_discount_type =
            clickedPromotionDetailsJson.discount_type
          utag_data.promotion_start_date =
            clickedPromotionDetailsJson.start_date
          utag_data.promotion_end_date = clickedPromotionDetailsJson.end_date
          utag_data.promotion_disclaimer =
            clickedPromotionDetailsJson.disclaimer
          utag_data.promotion_external_url =
            clickedPromotionDetailsJson.external_url
          utag_data.promotion_internal_url =
            clickedPromotionDetailsJson.internal_url
        } catch (e) {
          console.log('Error parsing promotion details JSON', e)
        }
      }

      utag_data.site_section = 'promo'
      utag_data.site_sub_section = 'promo_detail'
      utag_data.tealium_event = 'promo_click'

      this.triggerUtagLink(utag_data)
    }
    const handleCarouselClick = (event, matchingElement) => {
      var currentlyVisibleSlide = matchingElement.querySelector(
        'div[class*="slide slick-slide slick-current"]'
      )
      var currentlyVisibleSlideIndex = ''
      var currentlyVisibleSlideImage = []
      var currentlyVisibleSlideName = ''

      if (currentlyVisibleSlide) {
        currentlyVisibleSlideIndex =
          currentlyVisibleSlide.getAttribute('data-slick-index')
        currentlyVisibleSlideImage =
          currentlyVisibleSlide.querySelectorAll('img')
        if (currentlyVisibleSlideImage.length > 0) {
          currentlyVisibleSlideName =
            currentlyVisibleSlideImage[0].getAttribute('alt')
        }
      }

      var final = {}

      final.tealium_event = 'carousel_click'
      final.carousel_asset_name = currentlyVisibleSlideName
      final.carousel_asset_index = currentlyVisibleSlideIndex
      final.site_sub_section = 'home'

      final = $.extend({}, utag_data, final)

      this.triggerUtagLink(final)
    }
    const mousedownEventDelegationMap = [
      {
        selector: '.location-directions',
        handler: handleGoogleMapClick,
      },
      {
        selector: '.click-promotion-details',
        handler: handlePromoClick,
      },
      {
        selector: '[class*="component OfferRotator_"]',
        handler: handleCarouselClick,
      },
    ]

    document.addEventListener('mousedown', (event) => {
      mousedownEventDelegationMap.forEach(({ selector, handler }) => {
        const matchingElement = event.target.closest(selector)
        if (matchingElement) {
          handler(event, matchingElement)
        }
      })
    })

    // Enhanced eCommerce event handling (from old template)
    $(document).on(
      'click',
      '[id^=addToCartECommerce]',
      function () {
        const buttonId = $(this).attr('id')
        const index = buttonId.split('-').pop()

        // Enhanced eCommerce data with proper inventory class handling
        const ecommerceData = {
          tealium_event: 'ecommerce_part_cart_action',
          product_id: $(`#product-id-${index}`).val(),
          product_name: $(`#product-name-${index}`).val(),
          product_brand: $(`#product-brand-${index}`).val(),
          product_category: $(`#product-category-${index}`).val(),
          product_variant: $(`#product-variant-${index}`).val(),
          product_list_name: $(`#product-list-name-${index}`).val(),
          product_list_id: $(`#product-list-id-${index}`).val(),
          product_position: $(`#product-position-${index}`).val(),
          product_quantity:
            parseInt($(`#product-quantity-${index}`).val()) || 1,
          product_price:
            window.analyticsUtils.parsePrice(
              $(`#product-price-${index}`).val()
            ) || 0,
          product_discount:
            window.analyticsUtils.parsePrice(
              $(`#product-discount-${index}`).val()
            ) || 0,
          product_coupon: $(`#product-coupon-${index}`).val(),
          ecomm_part_detail_inventory_class: 'Part', // Set inventory class as per old template
          order_id: '',
          order_total: 0,
          order_currency: 'USD',
        }

        // Trigger both traditional addtocart and new eCommerce event
        this.triggerUtagTrack('addtocart', ecommerceData)
        window.analyticsUtils.triggerUtagLink(
          ecommerceData,
          'ecommerce_part_cart_action'
        )
      }.bind(this)
    )

    // eCommerce cart modification event handler (from old template)
    this.setupEcommerceCartModificationListener()

    // Setup additional eCommerce event listeners
    this.setupEcommerceEventHandlers()

    window.addEventListener('load', () => {
      this.initializeBRPEvents(config, utag_data)
    })

    this.initialized = true
  }

  initializeBRPEvents(config, utag_data) {
    const branded_zone_event = 'oem_brp_branded_zone_click'

    function updateUtagDataWithCallback(
      event,
      tealiumEvent,
      action,
      model = '',
      condition = '',
      promotion = '',
      destination = '',
      relatedProductName = '',
      relatedProductId = '',
      productLine = '',
      hotspotTitle = '',
      hotspotSection = ''
    ) {
      event.preventDefault()

      const redirectUrl = event.target.closest('a')?.getAttribute('href') || ''

      const updatedData =
        typeof utag_data !== 'undefined'
          ? {
              ...utag_data,
              tealium_event: tealiumEvent,
              oem_brp_branded_zone_action: action,
              ...(model && { oem_brp_branded_zone_model: model }),
              ...(condition && { oem_brp_branded_zone_condition: condition }),
              ...(promotion && { oem_brp_branded_zone_promotion: promotion }),
              ...(destination && {
                oem_brp_branded_zone_destination: destination,
              }),
              ...(relatedProductName && {
                related_product_name: relatedProductName,
              }),
              ...(relatedProductId && { related_product_id: relatedProductId }),
              ...(productLine && {
                oem_brp_branded_zone_productline: productLine,
              }),
              ...(hotspotTitle && {
                oem_brp_branded_zone_hotspot_title: hotspotTitle,
              }),
              ...(hotspotSection && {
                oem_brp_branded_zone_hotspot_section: hotspotSection,
              }),
            }
          : null

      console.log('Updated data to send:', updatedData)

      const triggerRedirect = () => {
        if (redirectUrl) {
          if (redirectUrl.startsWith('http')) {
            window.open(redirectUrl, '_blank')
          } else {
            window.location.href = redirectUrl
          }
        }
      }

      if (
        updatedData &&
        typeof utag !== 'undefined' &&
        typeof utag.link === 'function'
      ) {
        utag.link(updatedData, null, [
          function () {
            triggerRedirect()
          },
        ])
      } else {
        triggerRedirect()
      }
    }

    function getModel(tabPane) {
      const modelHeading = tabPane?.querySelector(
        '.brp-lineup__unit-info .brp-lineup__unit-info-heading'
      )
      if (!modelHeading) return ''

      const modelText = modelHeading.textContent.trim()
      const words = modelText.split(' ')

      return words.length > 1
        ? words.slice(1).join(' ').toLowerCase()
        : modelText.toLowerCase()
    }

    function getCondition(inventoryItem) {
      const conditionElement = inventoryItem?.querySelector(
        '.brp-inventory-item__data-usage'
      )
      return conditionElement ? conditionElement.textContent.trim() : ''
    }

    function getActiveAccessoryProductLine() {
      const activeAccessoryTypeItem = document.querySelector(
        '.brp-accessories__type-item.active'
      )
      const activeAccessoryLink = activeAccessoryTypeItem?.querySelector('a')
      const productLineText = activeAccessoryLink?.textContent

      return productLineText ? productLineText.toLowerCase() : ''
    }

    function getActiveVehicleProductLine() {
      const activeVehicleTypeItem = document.querySelector(
        '.brp-lineup__type-item.active'
      )
      const activeVehicleLink = activeVehicleTypeItem?.querySelector('a')
      const productLineText = activeVehicleLink?.textContent

      return productLineText ? productLineText.toLowerCase() : ''
    }

    function getHotspotTitle() {
      const hotspotItem = document.querySelector(
        '.brp-accessories__modal-title'
      )
      return hotspotItem ? hotspotItem.textContent.trim().toLowerCase() : ''
    }

    function getHotspotSection() {
      const accessoryItem = document.querySelector('.brp-accessories__heading')
      return accessoryItem ? accessoryItem.textContent.trim().toLowerCase() : ''
    }

    function getModelForHotspotSection() {
      const section = document.getElementById('accessories')
      const activeAccessoryAnchor = document.querySelector(
        '.brp-accessories__type-item.active a'
      )
      const activeId = activeAccessoryAnchor?.getAttribute('href')?.substring(1)
      const activeTabPane = activeId ? document.getElementById(activeId) : null
      const img = activeTabPane?.querySelector(
        '.brp-accessories__hotspots-figure img'
      )

      const altText = img?.getAttribute('alt') || ''
      if (!altText) {
        return ''
      }
      const words = altText.split(' ')

      const brandExtractors = {
        'can-am': (words) => words.slice(1).join(' ').toLowerCase(),
        'sea-doo': (words) => words.join(' ').toLowerCase(),
      }
      const brand = Object.keys(brandExtractors).find((b) =>
        section?.classList.contains(b)
      )
      if (brand && brandExtractors[brand]) {
        return brandExtractors[brand](words)
      }
      return ''
    }

    const brpEventDelegationMap = [
      {
        selector: '.brp-promotions__btn--offer',
        handler: (event) =>
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_to_promo',
            '',
            '',
            'promotion banner'
          ),
      },
      {
        selector: '.brp-lineup__unit-item',
        handler: (event) => {
          const modelSpan = event.target
            .closest('.brp-lineup__unit-item')
            ?.querySelector('.brp-lineup__unit-nav-title')
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_on_model',
            modelSpan?.textContent.trim().toLowerCase() || ''
          )
        },
      },
      {
        selector: '.brp-header__button div a',
        handler: (event) =>
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_on_view_inventory'
          ),
      },
      {
        selector: '.logos__dealer',
        handler: (event) =>
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_on_dealer_logo'
          ),
      },
      {
        selector: '.brand__dropdown .dropdown__logo:not(.dropdown__logo--del)',
        handler: (event) => {
          const imgTag = event.target
            .closest('.dropdown__logo')
            ?.querySelector('img')
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_on_brand',
            '',
            '',
            '',
            imgTag?.getAttribute('alt') || ''
          )
        },
      },
      {
        selector: '.brp-heroshot .brp-heroshot__cta-buttons a:nth-child(2)',
        handler: (event) =>
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_on_secondary_cta'
          ),
      },
      {
        selector: '.brp-lineup__unit-inventory-all',
        handler: (event) => {
          const tabPane = event.target.closest('.tab-pane')
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_on_view_model_inventory',
            getModel(tabPane)
          )
        },
      },
      {
        selector:
          '.brp-inventory-item__cta-actions .brp-inventory-item__btn--primary',
        handler: (event) => {
          const inventoryItem = event.target.closest('.brp-inventory-item')
          const tabPane = event.target.closest('.tab-pane')
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'click_on_view_details',
            getModel(tabPane),
            getCondition(inventoryItem)
          )
        },
      },
      {
        selector: '.related_products_carousel .slick-track .related-product',
        handler: (event) => {
          const relatedProduct = event.target.closest('.related-product')
          const productTitleAnchor =
            relatedProduct?.querySelector('.product-title a')
          const productName = productTitleAnchor
            ? productTitleAnchor.textContent.trim()
            : ''
          const productHref = productTitleAnchor
            ? productTitleAnchor.getAttribute('href')
            : ''
          const productIdMatch = productHref
            ? productHref.match(/-(\d+)[^\\d]*$/)
            : null
          const productId = productIdMatch ? productIdMatch[1] : ''

          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'related_products_click',
            '',
            '',
            '',
            '',
            productName,
            productId
          )
        },
      },
      {
        selector:
          '.brp-accessories__hotspots-actions .brp-accessories__hotspot-btn',
        handler: (event) => {
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'opening_hotspot',
            getModelForHotspotSection(),
            '',
            '',
            '',
            '',
            '',
            getActiveAccessoryProductLine(),
            getHotspotTitle(),
            getHotspotSection()
          )
        },
      },
      {
        selector: '.brp-accessories__modal.modal .close',
        handler: (event) => {
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'closing_hotspot',
            getModelForHotspotSection(),
            '',
            '',
            '',
            '',
            '',
            getActiveAccessoryProductLine(),
            getHotspotTitle(),
            getHotspotSection()
          )
        },
      },
      {
        selector: '.brp-accessories__modal.modal .brp-accessories__modal-btn',
        handler: (event) => {
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'hotspot_cta',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            getHotspotTitle()
          )
        },
      },
      {
        selector: '.brp-accessories__type-item .brp-accessories__type-nav',
        handler: (event) => {
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'accessories_line_selector',
            getModelForHotspotSection(),
            '',
            '',
            '',
            '',
            '',
            getActiveAccessoryProductLine()
          )
        },
      },
      {
        selector: '.brp-lineup__type-item .brp-lineup__type-nav',
        handler: (event) => {
          updateUtagDataWithCallback(
            event,
            branded_zone_event,
            'vehicle_line_selector',
            '',
            '',
            '',
            '',
            '',
            '',
            getActiveVehicleProductLine()
          )
        },
      },
    ]

    document.addEventListener('click', (event) => {
      brpEventDelegationMap.forEach(({ selector, handler }) => {
        const matchingElement = event.target.closest(selector)
        if (matchingElement) {
          handler(event, matchingElement)
        }
      })
    })
  }

  // eCommerce cart modification listener (from old template)
  setupEcommerceCartModificationListener() {
    $(document).on('ecommerce_part_modify_cart', (event) => {
      this.executeWithErrorHandling(() => {
        if (
          event.data &&
          event.data.tealium_event === 'ecommerce_part_modify_cart' &&
          !('ecomm_part_detail_inventory_class' in event.data)
        ) {
          event.data.ecomm_part_detail_inventory_class = 'Part'
        }
      }, 'Error processing eCommerce cart modification event')
    })
  }

  // Setup additional eCommerce event handlers (from old template)
  setupEcommerceEventHandlers() {
    // Listen for custom eCommerce events
    $(document).on('ecommerce_part_cart_action', (event) => {
      this.executeWithErrorHandling(() => {
        if (
          event.data &&
          event.data.tealium_event === 'ecommerce_part_cart_action'
        ) {
          if (!('ecomm_part_detail_inventory_class' in event.data)) {
            event.data.ecomm_part_detail_inventory_class = 'Part'
          }
          // Trigger the event through analytics utils
          window.analyticsUtils.triggerUtagLink(
            event.data,
            'ecommerce_part_cart_action'
          )
        }
      }, 'Error processing eCommerce cart action event')
    })

    // Additional eCommerce tracking for part modifications
    $(document).on('ecommerce_part_modify_cart', (event) => {
      this.executeWithErrorHandling(() => {
        if (
          event.data &&
          event.data.tealium_event === 'ecommerce_part_modify_cart'
        ) {
          if (!('ecomm_part_detail_inventory_class' in event.data)) {
            event.data.ecomm_part_detail_inventory_class = 'Part'
          }
          // Trigger the event through analytics utils
          window.analyticsUtils.triggerUtagLink(
            event.data,
            'ecommerce_part_modify_cart'
          )
        }
      }, 'Error processing eCommerce part modification event')
    })
  }

  // Helper method to execute code with error handling
  executeWithErrorHandling(fn, errorMessage) {
    try {
      return fn()
    } catch (error) {
      console.error(errorMessage, error)
      return null
    }
  }
}

;(function () {
  window.eventHandler = new EventHandler()
})()

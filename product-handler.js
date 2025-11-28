class ProductHandler {
  static PRODUCT_FIELDS = [
    'itemMake',
    'itemYear',
    'productId',
    'productExternalId',
    'isUnitInventory',
    'itemOnSale',
    'name',
    'unitPrice',
    'itemType',
    'itemTypeId',
    'itemIndustry',
    'productOwnerId',
    'itemOriginalPrice',
    'vin',
    'primaryColor',
  ]

  static UTAG_MAPPINGS = {
    product_list_makes: 'makes',
    product_list_years: 'years',
    product_list_ids: 'ids',
    product_list_names: 'names',
    product_list_types: 'types',
    product_list_on_sale: 'onSales',
    product_list_prices: 'prices',
    product_list_categories: 'categories',
    product_list_category_ids: 'categoryIds',
    product_list_industries: 'industries',
    product_list_make_ids: 'makeIds',
    product_list_msrp: 'msrps',
    product_list_vins: 'vins',
    product_list_external_colors: 'externalColors',
    product_external_id: 'productExternalIds',
    product_external_platform: 'productExternalPlatforms',
    product_list_did_active: 'activePromotions',
  }

  constructor() {
    this.domCache = {
      visitorsCount: null,
      promoMessage: null,
      spin360: null,
      financingAnchor: null,
    }
  }

  parseJsonElement(elementId) {
    return window.analyticsUtils.parseJsonFromElement(elementId)
  }

  getDOMElement(selector, cacheKey) {
    if (!this.domCache[cacheKey]) {
      this.domCache[cacheKey] = document.querySelector(selector)
    }
    return this.domCache[cacheKey]
  }

  getProductAnalyticsData(config) {
    if (config.pageType !== 'product details') return

    const productDataSource = this.parseProductDataSource()
    if (!productDataSource) return

    this.setProductId(config, productDataSource)
    this.setBasicProductInfo(config, productDataSource)
    this.setProductCategories(config, productDataSource)
    this.setProductCondition(config, productDataSource)
    this.setProductPricing(config, productDataSource)
    this.setProductMedia(config, productDataSource)
    this.setProductType(config, productDataSource)
    this.updateFinancingUrl(config)
  }

  parseProductDataSource() {
    return this.parseJsonElement('unit-analytics-data')
  }

  setProductId(config, data) {
    if (config.isExternalBrandedZoneSite && data.productExternalId) {
      config.productInfo.product_id = data.productExternalId
      config.productInfo.product_external_platform = [
        config.parentSitePlatformType,
      ]
      config.productInfo.product_external_id = [data.productExternalId]
    } else {
      config.productInfo.product_id = data.productId
    }
  }

  setBasicProductInfo(config, data) {
    if (data.item) config.productInfo.product_name = data.item.trim()
    if (data.itemModel) config.productInfo.product_model = data.itemModel
    if (data.itemYear > 0) config.productInfo.product_year = data.itemYear
    if (data.itemIndustry)
      config.productInfo.product_industry = data.itemIndustry.trim()

    config.productInfo.product_uri = window.location.pathname
    config.productInfo.product_on_sale = data.itemOnSale ? 1 : 0

    config.productInfo.vdp_urgency_active = this.getDOMElement(
      '.visitors-count',
      'visitorsCount'
    )
      ? 1
      : 0
    utag_data.did_active = this.getDOMElement(
      '#inventory_promoMessage',
      'promoMessage'
    )
      ? 1
      : 0
  }

  setProductCategories(config, data) {
    if (data.itemTypeId) {
      config.productInfo.product_category = data.itemType
      config.productInfo.product_category_id = data.itemTypeId
    }

    if (data.itemSubtypeId) {
      config.productInfo.product_subcategory_id = data.itemSubtypeId
      config.productInfo.product_subcategory = data.itemSubtype
    }

    if (data.itemMakeId) {
      config.productInfo.product_make_id = data.itemMakeId
      config.productInfo.product_make = data.itemMake
    }
  }

  setProductCondition(config, data) {
    if (data.usageStatus) {
      config.productInfo.product_condition = data.usageStatus.trim()
    } else if (!data.isUnitInventory) {
      config.productInfo.product_condition = 'New'
    }
  }

  setProductPricing(config, data) {
    const parsePrice = (priceStr) => {
      const price = window.analyticsUtils.parsePrice(priceStr)
      return price > 0 ? price : null
    }

    if (data.itemOriginalPrice) {
      const originalPrice = parsePrice(data.itemOriginalPrice)
      if (originalPrice)
        config.productInfo.product_original_price = originalPrice
    }

    if (data.itemOnSale && data.salePrice) {
      config.productInfo.product_price = data.salePrice
        .toString()
        .replace(/[$,]/g, '')
      if (data.discountAmount) {
        config.productInfo.product_discount_amount = data.discountAmount
      }
    } else if (data.itemOriginalPrice) {
      const price = parsePrice(data.itemOriginalPrice)
      if (price) config.productInfo.product_price = price
    }
  }

  setProductMedia(config, data) {
    if (data.itemThumbNailUrl) {
      config.productInfo.product_image_url = data.itemThumbNailUrl
    }

    config.productInfo.product_custom_image_count =
      data.itemCustomImageCount || 0
    config.productInfo.product_videos_count = data.itemVideoExists || 0
    config.productInfo.product_360view_count = this.getDOMElement(
      '#dealer360-spin-container',
      'spin360'
    )
      ? 1
      : 0
    config.productInfo.product_description_char_count =
      data.itemDescriptionCount || 0
  }

  setProductType(config, data) {
    config.productInfo.product_type = data.isUnitInventory
      ? 'Inventory'
      : 'Showcase'
  }

  updateFinancingUrl(config) {
    const financingAnchor = $(
      "a[data-form-type='financing'][data-is-external-url='False']"
    )

    if (financingAnchor.length === 0) return

    try {
      const financingUrl = new URL(
        financingAnchor.attr('href'),
        window.location.origin
      )
      financingUrl.searchParams.append(
        'item_360view_count',
        config.productInfo.product_360view_count
      )
      financingUrl.searchParams.append(
        'vdp_urgency_active_flag',
        config.productInfo.vdp_urgency_active
      )
      financingAnchor.attr('href', financingUrl.toString())
    } catch (error) {
      console.error('Error parsing financing URL in Tealium component:', error)
    }
  }

  getPromotionAnalyticsData(config) {
    const promotionDataSource = this.parsePromotionDataSource()
    if (!promotionDataSource) return

    this.setPromotionBasicInfo(config, promotionDataSource)
    this.setPromotionMakeInfo(config, promotionDataSource)
    this.setPromotionCategoryInfo(config, promotionDataSource)
  }

  parsePromotionDataSource() {
    return this.parseJsonElement('promotion-analytics-data')
  }

  setPromotionBasicInfo(config, data) {
    if (data.promotionId) {
      config.brandPromotionInfo.promotion_id = data.promotionId
      config.brandPromotionInfo.promotion_name = data.promotionName
    }
  }

  setPromotionMakeInfo(config, data) {
    if (data.promotionMakeId) {
      config.brandPromotionInfo.promotion_make_id = data.promotionMakeId
      config.brandPromotionInfo.promotion_make = data.promotionMake
    }
  }

  setPromotionCategoryInfo(config, data) {
    if (data.promotionCategoryId) {
      config.brandPromotionInfo.promotion_category = data.promotionCategory
      config.brandPromotionInfo.promotion_category_id = data.promotionCategoryId
    }
  }

  setProductItemsArrays(config, utag_data, attributeName, propertyName) {
    const productArrays = this.initializeProductArrays()
    const productItems = this.extractProductItems(config)

    this.populateProductArrays(productArrays, productItems)
    this.addArraysToUtag(utag_data, productArrays)
  }

  initializeProductArrays() {
    return {
      makes: [],
      years: [],
      ids: [],
      names: [],
      types: [],
      onSales: [],
      prices: [],
      categories: [],
      categoryIds: [],
      industries: [],
      makeIds: [],
      msrps: [],
      vins: [],
      externalColors: [],
      productExternalIds: [],
      productExternalPlatforms: [],
      activePromotions: [],
    }
  }

  extractProductItems(config) {
    const productItems = []
    const productItemFields = ProductHandler.PRODUCT_FIELDS
    const self = this // Store reference to the class instance

    $('span.datasource.hidden').each(function () {
      try {
        // 'this' here refers to the DOM element (span)
        const elementText = this.innerText || this.textContent

        if (!elementText || elementText.trim() === '') {
          console.warn('Empty datasource element found:', this)
          return
        }

        const data = JSON.parse(elementText)

        // Use 'self' to call the class method
        if (self.isValidProductData(data, productItemFields)) {
          productItems.push(data)
        }
      } catch (error) {
        console.error('JSON parse failed for unit:', error, 'Element:', this)
      }
    })

    return productItems
  }

  isValidProductData(data, fields) {
    return Object.entries(data).some(
      ([key, value]) =>
        fields.includes(key) && value != null && !/^\s*$/.test(String(value))
    )
  }

  populateProductArrays(arrays, items) {
    items.forEach((data) => {
      arrays.makes.push(data.itemMake)
      arrays.years.push(data.itemYear)
      arrays.names.push(data.name)
      arrays.prices.push(data.unitPrice)
      arrays.categories.push(data.itemType)
      arrays.categoryIds.push(data.itemTypeId)
      arrays.industries.push(data.itemIndustry)
      arrays.makeIds.push(data.productOwnerId)
      arrays.msrps.push(data.itemOriginalPrice)
      arrays.vins.push(data.vin)
      arrays.externalColors.push(data.primaryColor)

      // Handle external branded zone sites
      if (config.isExternalBrandedZoneSite && data.productExternalId) {
        arrays.ids.push(parseInt(data.productExternalId))
        arrays.productExternalIds.push(data.productExternalId)
        arrays.productExternalPlatforms.push(config.parentSitePlatformType)
      } else {
        arrays.ids.push(data.productId)
      }

      arrays.types.push(
        this.getBooleanValue(data.isUnitInventory) ? 'Inventory' : 'Showcase'
      )
      arrays.onSales.push(this.getBooleanValue(data.itemOnSale) ? '1' : '0')
      arrays.activePromotions.push(data.arePromotionsAvailable ? 1 : 0)
    })
  }

  getBooleanValue(value) {
    return value !== undefined && String(value).toUpperCase() === 'TRUE'
  }

  addArraysToUtag(utag_data, arrays) {
    Object.entries(ProductHandler.UTAG_MAPPINGS).forEach(
      ([utagKey, arrayKey]) => {
        const array = arrays[arrayKey]
        if (array && array.length > 0) {
          utag_data[utagKey] = array
        }
      }
    )
  }

  parseProductsData(config, item) {
    const product = {}

    this.setProductIdFromItem(config, item, product)

    this.setBasicProductInfoFromItem(item, product)

    this.setProductCategorizationFromItem(item, product)

    this.setProductPricingFromItem(item, product)

    this.setProductMediaFromItem(item, product)

    this.setProductFlagsFromItem(item, product)

    return product
  }

  setProductIdFromItem(config, item, product) {
    if (config.isExternalBrandedZoneSite && item.productExternalId) {
      product.product_id = item.productExternalId
    } else if (item.productId) {
      product.product_id = item.productId
    }
  }

  setBasicProductInfoFromItem(item, product) {
    if (item.item) product.product_name = item.item
    if (item.itemModel || item.model) {
      product.product_model = item.itemModel || item.model
    }

    if (item.itemYear > 0 || item.year > 0) {
      product.product_year = item.itemYear > 0 ? item.itemYear : item.year
    }

    if (item.itemMake) product.product_make = item.itemMake
    if (item.itemMakeId) product.product_make_id = item.itemMakeId

    const url = item.itemUrl || item.itemurl
    if (url) {
      product.product_uri = new URL(url, window.location).pathname
    }

    if (item.usageStatus) product.product_condition = item.usageStatus
    product.product_type =
      item.isUnitInventory || item.isUnitInventory === 'True'
        ? 'Inventory'
        : 'Showcase'

    if (item.itemIndustry) product.product_industry = item.itemIndustry
  }

  setProductCategorizationFromItem(item, product) {
    if (item.itemType) product.product_category = item.itemType
    if (item.itemTypeId) product.product_category_id = item.itemTypeId
    if (item.itemSubtype) product.product_subcategory = item.itemSubtype
    if (item.itemSubtype && item.itemSubtypeId) {
      product.product_subcategory_id = item.itemSubtypeId
    }
  }

  setProductPricingFromItem(item, product) {
    if (item.itemDisplayPrice) {
      const displayPrice = this.parsePrice(item.itemDisplayPrice)
      if (displayPrice > 0) product.product_price = displayPrice
    }

    if (item.itemOriginalPrice) {
      const originalPrice = this.parsePrice(item.itemOriginalPrice)
      if (originalPrice > 0) product.product_original_price = originalPrice
    }

    if (item.itemOnSale) {
      product.product_on_sale =
        item.itemOnSale.toUpperCase() === 'TRUE' ? '1' : '0'
    } else if (item.FormId !== 1461) {
      // 1461 is id for 'Can't find what you are looking for' form
      product.product_on_sale = '0'
    }

    if (product.product_price && product.product_original_price) {
      const discount = product.product_original_price - product.product_price
      if (discount > 0) product.product_discount_amount = discount
    }
  }

  setProductMediaFromItem(item, product) {
    if (item.itemCustomImageCount !== undefined) {
      product.product_custom_image_count = item.itemCustomImageCount
    } else if (item.imageCount >= 0) {
      product.product_custom_image_count = item.imageCount
    }

    if (item.itemVideoExists !== undefined) {
      product.product_videos_count = item.itemVideoExists
    } else if (item.videoCount >= 0) {
      product.product_videos_count = item.videoCount
    }

    if (item.itemDescriptionCount !== undefined) {
      product.product_description_char_count = item.itemDescriptionCount
    } else if (item.descriptionLength >= 0) {
      product.product_description_char_count = item.descriptionLength
    }
  }

  setProductFlagsFromItem(item, product) {
    if (item.item_360view_count) {
      product.product_360view_count = item.item_360view_count
    }

    if (item.vdp_urgency_active_flag) {
      product.vdp_urgency_active = item.vdp_urgency_active_flag
    }
  }

  parsePrice(priceString) {
    return window.analyticsUtils.parsePrice(priceString)
  }

  getShowCaseData(utag_data) {
    var showCaseData = {}
    if (utag_data.page_make) {
      showCaseData.page_make = utag_data.page_make.toLowerCase()
    }
    if (utag_data.page_make_id) {
      showCaseData.page_make_id = utag_data.page_make_id
    }
    if (utag_data.page_category) {
      showCaseData.page_category = utag_data.page_category
    }
    if (utag_data.page_category_id) {
      showCaseData.page_category_id = utag_data.page_category_id
    }
    if (utag_data.page_subcategory) {
      showCaseData.page_subcategory = utag_data.page_subcategory
    }
    if (utag_data.page_subcategory_id) {
      showCaseData.page_subcategory_id = utag_data.page_subcategory_id
    }
    return showCaseData
  }

  getPromotionData(form, data) {
    var promotion = {}

    if (localStorage && localStorage.selectedPromotionIds) {
      promotion.did_promotions_selected = localStorage.selectedPromotionIds
      promotion.campaign_id = localStorage.selectedPromotionIds
    }

    if (form) {
      promotion.did_form_id = form.formId
      promotion.did_form_name = form.formName
      promotion.did_form_submission_first_name = form.form_submission_first_name
      promotion.did_form_submission_last_name = form.form_submission_last_name
    }

    if (data && data.contact) {
      promotion.did_form_submission_perferred_contact = data.contact
      if (data.contact === 'email') {
        promotion.did_form_submission_email = data.email
      }
      if (data.contact === 'phone') {
        promotion.did_form_submission_phone = data.phone
      }
    }

    return promotion
  }
}

// Initialize product handler (self-contained)
;(function () {
  window.productHandler = new ProductHandler()
})()

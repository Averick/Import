class AnalyticsUtils {
  constructor() {
    this.domCache = {}
  }

  // DOM utilities
  getCachedElement(selector, cacheKey = null) {
    const key = cacheKey || selector
    if (!this.domCache[key]) {
      this.domCache[key] = document.querySelector(selector)
    }
    return this.domCache[key]
  }

  getCachedElements(selector, cacheKey = null) {
    const key = cacheKey || selector
    if (!this.domCache[key]) {
      this.domCache[key] = document.querySelectorAll(selector)
    }
    return this.domCache[key]
  }

  // Tealium utilities
  triggerUtagView(utag_data, customData = {}) {
    // Check if there is a pending promo click event that needs to be fired first
    if (sessionStorage.getItem('ari_pending_promo_click')) {
        console.log('Suppressing view event due to pending promo click')
        return
    }

    let eventData = Object.assign({}, utag_data, customData)
    eventData = this.convertToSnakeCaseKeys(eventData)
    eventData = this.cleanEventData(eventData)
    if (typeof utag !== 'undefined') {
      utag.view(eventData)
    } else {
      console.log('Could not trigger utag.view method.')
    }
  }

  triggerUtagLink(utag_data, eventType = null, customData = {}, callback = null) {
    let eventData = {}

    if (sessionStorage.getItem('ari_pending_promo_click')) {
      eventData = Object.assign(eventData, utag_data, customData)
    } else {
      eventData = Object.assign(eventData, customData)
    }

    if (eventType) {
      eventData.tealium_event = eventType
    }

    eventData = this.convertToSnakeCaseKeys(eventData)
    eventData = this.cleanEventData(eventData)
    
    if (typeof utag !== 'undefined') {
      if (callback && typeof callback === 'function') {
        utag.link(eventData, callback)
      } else {
        utag.link(eventData)
      }
    } else {
      console.log(
        `Could not trigger utag.link method for event: ${eventType || 'unknown'
        }`
      )
    }
  }

  convertToSnakeCaseKeys(obj) {
    const newObj = {}
    // Special mappings for keys that don't follow standard camelCase (no uppercase letters)
    const specialMappings = {
      isnewvdp: 'is_new_vdp',
    }

    Object.keys(obj).forEach((key) => {
      let newKey

      if (key.startsWith('_')) {
        newKey = key
      } else if (specialMappings[key]) {
        newKey = specialMappings[key]
      } else {
        newKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)

        if (!key.startsWith('_') && newKey.startsWith('_')) {
          newKey = newKey.substring(1)
        }
      }

      newObj[newKey] = obj[key]
    })
    return newObj
  }

  cleanEventData(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj
        .map((item) => this.cleanEventData(item))
        .filter((item) => item !== null && item !== '' && item !== undefined)
    }

    obj = this.removeDuplicateKeys(obj)

    if (obj['lead_type']) {
      obj['form_type'] = obj['lead_type']
    }
    delete obj['lead_type']

    Object.keys(obj).forEach((key) => {
      const value = obj[key]
      if (value === null || value === '' || value === undefined) {
        delete obj[key]
      } else if (typeof value === 'object') {
        obj[key] = this.cleanEventData(value)
      }
    })
    return obj
  }

  removeDuplicateKeys(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return obj
    }

    const normalizedKeys = {}

    Object.keys(obj).forEach((key) => {
      const normalized = key.replace(/_/g, '').toLowerCase()

      if (normalizedKeys[normalized]) {
        const existingKey = normalizedKeys[normalized]
        const existingHasLeading = existingKey.startsWith('_')
        const currentHasLeading = key.startsWith('_')
        let shouldKeepCurrent = false

        if (currentHasLeading && !existingHasLeading) {
          shouldKeepCurrent = true
        } else if (existingHasLeading && !currentHasLeading) {
          shouldKeepCurrent = false
        } else {
          const existingUnderscores = (existingKey.match(/_/g) || []).length
          const currentUnderscores = (key.match(/_/g) || []).length

          if (currentUnderscores > existingUnderscores) {
            shouldKeepCurrent = true
          }
        }

        if (shouldKeepCurrent) {
          delete obj[existingKey]
          normalizedKeys[normalized] = key
        } else {
          delete obj[key]
        }
      } else {
        normalizedKeys[normalized] = key
      }
    })

    return obj
  }

  triggerUtagTrack(eventName, eventData) {
    if (eventData) {
      // Create a shallow copy to avoid mutating the original object
      eventData = Object.assign({}, eventData)
      eventData = this.cleanEventData(eventData)
    }

    if (window.utag && typeof utag.track === 'function') {
      utag.track(eventName, eventData)
    }
  }

  QueryStringToJSON() {
    var pairs = location.search.slice(1).split('&')
    var result = {}
    pairs.forEach(function (pair) {
      pair = pair.split('=')
      result[pair[0]] = decodeURIComponent(pair[1] || '')
    })
    return result
  }

  setDataPointByDataPropertyName(utag_data, attributeName, propertyName) {
    var result = $('span[' + attributeName + ']')
      .eq(0)
      .attr(attributeName)
    if (result) {
      utag_data[propertyName] = result
    }
  }

  getProductsDataFromQueryString(config) {
    var productJson = null
    try {
      productJson = this.QueryStringToJSON()
    } catch (e) { }
    return productJson && productJson.productId
      ? window.productHandler.parseProductsData(config, productJson)
      : null
  }

  /**
   * Parse JSON from DOM element with error handling
   * @param {string} elementId - DOM element ID
   * @returns {object|null} Parsed object or null if parsing fails
   */
  parseJsonFromElement(elementId) {
    try {
      const element = document.getElementById(elementId)
      return element ? this.safeJsonParse(element.innerHTML) : null
    } catch (error) {
      console.error(`Error parsing JSON from element ${elementId}:`, error)
      return null
    }
  }

  /**
   * Safely parse JSON string with error handling
   * @param {string} jsonString - JSON string to parse
   * @returns {object|null} Parsed object or null if parsing fails
   */
  safeJsonParse(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return null
    }

    try {
      // Handle HTML entities that might be in the JSON (preserve exact logic)
      const cleanedString = jsonString
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')

      return JSON.parse(cleanedString)
    } catch (error) {
      console.error('JSON parse failed:', error, 'Input:', jsonString)
      return null
    }
  }

  /**
   * Parse price string to number (preserve exact logic)
   * @param {string} priceString - Price string (e.g., "$1,234.56")
   * @returns {number} Numeric price value
   */
  parsePrice(priceString) {
    if (!priceString) return 0

    // Remove currency symbols, commas, and spaces (preserve exact regex)
    const cleanPrice = priceString.toString().replace(/[$,\s]/g, '')
    const price = parseFloat(cleanPrice)

    return isNaN(price) ? 0 : price
  }

  /**
   * Count characters in text elements
   * @param {NodeList} elements - Elements to count
   * @returns {number} Total character count
   */
  countTextCharacters(elements) {
    let totalCount = 0
    elements.forEach((element) => {
      totalCount += element.innerText.trim().length
    })
    return totalCount
  }

  /**
   * Extract text content and lengths from elements
   * @param {NodeList} elements - Elements to process
   * @returns {object} Object with texts and lengths arrays
   */
  extractTextData(elements) {
    const texts = []
    const lengths = []

    Array.from(elements).forEach((element) => {
      const text = element.innerText.trim()
      if (text.length > 0) {
        texts.push(text)
        lengths.push(text.length.toString())
      }
    })

    return { texts, lengths }
  }

  /**
   * Convert query string to JSON object
   * @param {string} queryString - Query string (optional, uses window.location.search if not provided)
   * @returns {object} Object with query parameters
   */
  static queryStringToJSON(queryString = null) {
    const query = queryString || window.location.search

    if (!query || query.length <= 1) {
      return {}
    }

    const pairs = query.substring(1).split('&')
    const result = {}

    pairs.forEach((pair) => {
      if (pair) {
        const [key, value] = pair.split('=')
        if (key) {
          try {
            result[decodeURIComponent(key)] = value
              ? decodeURIComponent(value)
              : ''
          } catch (error) {
            console.warn('Failed to decode query parameter:', key, value)
            result[key] = value || ''
          }
        }
      }
    })

    return result
  }

  /**
   * Validate email address format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone number format (US format)
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone format
   */
  static isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '')

    // Check for valid US phone number (10 or 11 digits)
    return (
      digitsOnly.length === 10 ||
      (digitsOnly.length === 11 && digitsOnly[0] === '1')
    )
  }

  /**
   * Format phone number to standard format
   * @param {string} phone - Raw phone number
   * @returns {string} Formatted phone number
   */
  static formatPhone(phone) {
    if (!phone) return ''

    const digitsOnly = phone.replace(/\D/g, '')

    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
        3,
        6
      )}-${digitsOnly.slice(6)}`
    } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
      return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(
        4,
        7
      )}-${digitsOnly.slice(7)}`
    }

    return phone // Return original if can't format
  }

  /**
   * Clean and validate URL
   * @param {string} url - URL to clean
   * @returns {string} Cleaned URL
   */
  static cleanUrl(url) {
    if (!url || typeof url !== 'string') {
      return ''
    }

    try {
      // Remove query parameters and fragments if specified
      const urlObj = new URL(url, window.location.origin)
      return urlObj.pathname
    } catch (error) {
      console.warn('Invalid URL:', url)
      return url // Return original if can't parse
    }
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL to extract domain from
   * @returns {string} Domain name
   */
  static extractDomain(url) {
    if (!url || typeof url !== 'string') {
      return ''
    }

    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch (error) {
      console.warn('Invalid URL for domain extraction:', url)
      return ''
    }
  }

  /**
   * Sanitize string for analytics (remove special characters, limit length)
   * @param {string} str - String to sanitize
   * @param {number} maxLength - Maximum length (default 100)
   * @returns {string} Sanitized string
   */
  static sanitizeString(str, maxLength = 100) {
    if (!str || typeof str !== 'string') {
      return ''
    }

    // Remove or replace problematic characters
    let sanitized = str
      .replace(/['"\\]/g, '') // Remove quotes and backslashes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim() // Trim whitespace

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength - 3) + '...'
    }

    return sanitized
  }

  /**
   * Get current timestamp in various formats
   * @param {string} format - Format type ('iso', 'unix', 'readable')
   * @returns {string|number} Formatted timestamp
   */
  static getCurrentTimestamp(format = 'iso') {
    const now = new Date()

    switch (format) {
      case 'unix':
        return Math.floor(now.getTime() / 1000)
      case 'readable':
        return now.toLocaleDateString() + ' ' + now.toLocaleTimeString()
      case 'iso':
      default:
        return now.toISOString()
    }
  }

  /**
   * Deep clone object (for utag_data manipulation)
   * @param {object} obj - Object to clone
   * @returns {object} Cloned object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item))
    }

    const cloned = {}
    Object.keys(obj).forEach((key) => {
      cloned[key] = this.deepClone(obj[key])
    })

    return cloned
  }

  /**
   * Merge objects with conflict resolution
   * @param {object} target - Target object
   * @param {object} source - Source object
   * @param {boolean} overwrite - Whether to overwrite existing properties
   * @returns {object} Merged object
   */
  static mergeObjects(target, source, overwrite = true) {
    const result = this.deepClone(target)

    Object.keys(source).forEach((key) => {
      if (overwrite || !(key in result)) {
        result[key] = this.deepClone(source[key])
      }
    })

    return result
  }

  /**
   * Check if element is visible in viewport
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if element is visible
   */
  static isElementVisible(element) {
    if (!element) return false

    const rect = element.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  static debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit time in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  /**
   * Generate unique identifier
   * @returns {string} Unique identifier
   */
  generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Log error with context for analytics debugging
   * @param {string} message - Error message
   * @param {object} context - Additional context
   * @param {Error} error - Original error object
   */
  static logError(message, context = {}, error = null) {
    const errorData = {
      message,
      context,
      timestamp: this.getCurrentTimestamp(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    if (error) {
      errorData.stack = error.stack
      errorData.originalMessage = error.message
    }

    console.error('Analytics Error:', errorData)

    // Could send to error tracking service here
    if (window.gtag && typeof window.gtag === 'function') {
      window.gtag('event', 'exception', {
        description: message,
        fatal: false,
      })
    }
  }
}

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
    this.loadedProductInfo = {}
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

    this.populateProductArrays(config, productArrays, productItems)
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
    const self = this

    $('span.datasource.hidden').each(function () {
      try {
        const elementText = this.innerText || this.textContent

        if (!elementText || elementText.trim() === '') {
          console.warn('Empty datasource element found:', this)
          return
        }

        const data = JSON.parse(elementText)

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

  populateProductArrays(config, arrays, items) {
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
      arrays.vins.push(data.vin || "")
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

  // Get product data from query string
  getProductsDataFromQueryString() {
    try {
      const queryString = window.location.search
      if (queryString && window.analyticsUtils) {
        const rawData = window.analyticsUtils.QueryStringToJSON() || {}
        if (rawData.productId) {
          return this.parseProductsData(window.TealiumConfig || {}, rawData)
        }
      }
    } catch (error) {
      console.warn('Failed to parse query string for product data:', error)
    }
    return {}
  }
}

class EventHandler {
  constructor() {
    this.initialized = false
  }

  triggerUtagView(eventData) {
    window.analyticsUtils.triggerUtagView(eventData)
  }

  triggerUtagLink(eventData, callback) {

    window.analyticsUtils.triggerUtagLink({}, null, eventData, callback)
  }

  triggerUtagTrack(eventName, eventData) {
    window.analyticsUtils.triggerUtagTrack(eventName, eventData)
  }

  initialize(config) {
    if (this.initialized) return


    const pendingPromoClick = sessionStorage.getItem('ari_pending_promo_click')
    
    const handleInitialEvents = () => {
         if (typeof utag !== 'undefined') {
            // This logic exists to avoid race condition between promotion detail click and promotion detail page navigation
            // If promotion detail click event is not fired, it will be fired here
             if (pendingPromoClick) {
                 try {
                     const pendingData = JSON.parse(pendingPromoClick)
                     this.triggerUtagLink(pendingData)
                     //utag.cfg.noview = true
                 } catch(e) {
                     console.error('Error firing pending promo click event', e)
                 } finally {
                     sessionStorage.removeItem('ari_pending_promo_click')
                     //utag.cfg.noview = false
                 }

               //this.triggerUtagView(window.utag_data)
             }
         } else {
             setTimeout(handleInitialEvents, 50)
         }
    }
    
    handleInitialEvents()


    const handleGoogleMapClick = (event) => {
      window.utag_data.tealium_event = 'google_map_click'
      this.triggerUtagLink(Object.assign({}, window.utag_data))
    }

    const handlePromoClick = (event, matchingElement) => {
      let promotionData = {};
      
      // 1. Extract ID from URL
      try {
        const href = matchingElement.getAttribute('href');
        if (href) {
            // potential formats: /factory-promotions/12345 or /factory-promotions/12345/
            const parts = href.split('/').filter(part => part.length > 0);
            const potentialId = parts.pop();
            if (potentialId && /^\d+$/.test(potentialId)) {
                promotionData.promotion_id = potentialId;
            }
        }
      } catch(e) { console.error('Error parsing promo ID from href', e); }

      // 2. Try to get data from embedded JSON (most reliable)
      try {
          const jsonScript = matchingElement.querySelector('.promotion-datasource');
          if (jsonScript) {
              const data = JSON.parse(jsonScript.textContent);
              if (data) {
                  if (data.promotionId) promotionData.promotion_id = data.promotionId;
                  if (data.promotionName) promotionData.promotion_name = data.promotionName;
                  if (data.promotionMake) promotionData.promotion_make = data.promotionMake;
                  if (data.promotionCategory) promotionData.promotion_category = data.promotionCategory;
                  if (data.promotionCategoryId) promotionData.promotion_category_id = data.promotionCategoryId;
              }
          }
      } catch (e) { console.error('Error parsing promotion datasource', e); }


      
      // Store event data for next page flow
      const promoEventData = {
          site_section: 'promo',
          site_sub_section: 'promo_detail',
          tealium_event: 'promo_click',
          ...promotionData
      }
      
      sessionStorage.setItem('ari_pending_promo_click', JSON.stringify(promoEventData))
      utag.cfg.noview = true
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

      final = $.extend({}, window.utag_data, final)
      
      this.triggerUtagLink(final)
    }

    const mousedownEventDelegationMap = [
      {
        selector: '.location-directions',
        handler: handleGoogleMapClick,
      },
      {
        selector: 'a[href*="/factory-promotions/"]',
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

    // Enhanced eCommerce event handling
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
          ecomm_part_detail_inventory_class: 'Part',
          order_id: '',
          order_total: 0,
          order_currency: 'USD',
        }

        // Trigger both traditional addtocart and new eCommerce event
        this.triggerUtagTrack('addtocart', ecommerceData)
        window.analyticsUtils.triggerUtagLink(
          {},
          'ecommerce_part_cart_action',
          ecommerceData
        )
      }.bind(this)
    )

    // eCommerce cart modification event handler
    this.setupEcommerceCartModificationListener()

    // Setup additional eCommerce event listeners
    this.setupEcommerceEventHandlers()

    window.addEventListener('load', () => {
      this.initializeBRPEvents(config, window.utag_data)
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

      if (updatedData) {
        window.analyticsUtils.triggerUtagLink({}, null, updatedData, function () {
          triggerRedirect()
        })
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

  // eCommerce cart modification listener
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

  // Setup additional eCommerce event handlers
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
          window.analyticsUtils.triggerUtagLink(
            {},
            'ecommerce_part_cart_action',
            event.data
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
          window.analyticsUtils.triggerUtagLink(
            {},
            'ecommerce_part_modify_cart',
            event.data
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

class FormHandler {
  constructor() {
    this.initialized = false
    this.interactionTracked = new Set()
    this.formSubmissionTracked = new Set()
    this.formLoadTracked = new Set()
    this.formTrackingSetup = false
    this.trackingCallback = null
  }

  initialize(config, utag_data) {
    if (this.initialized) return

    this.config = config
    this.utag_data = utag_data

    // Capture the correct 'this' context for use in event handlers
    const self = this

    // Listener for form load event from products page
    $('body').on('show.bs.modal', 'div[id*="AriFormModal"]', function (e) {
      var form = {}
      form.tealium_event = 'form_load'
      var modal = e.currentTarget.closest('.ari-form')
      var formdetail = modal.id
      form.form_name = $(modal)
        .find('span[data-form-name]')
        .attr('data-form-name')
      form.form_type = $(modal)
        .find('span[data-lead-type]')
        .attr('data-lead-type')
      form.form_id = $(modal).find('span[data-form-id]').attr('data-form-id')

      if (form.form_name === 'Get Promotions') {
        form.tealium_event = 'did_view_offer_details_click'
        if (localStorage) {
          form.did_promotions_name = localStorage.selectedPromotionTitle
          form.campaign_id = localStorage.selectedPromotionIds
        }
      }

      if (form.form_id && form.form_type && form.form_name) {
        // Extract product data from modal form datasource
        const modalProductData = self.extractFormProductData(modal)

        var final = $.extend(
          {},
          config.siteUser,
          form,
          modalProductData,
          config.productInfo
        )
        if (utag_data.page_h1) {
          final.page_h1 = utag_data.page_h1
        }
        if (final.product_make) {
          final.page_make = final.product_make.toLowerCase()
        }
        if (final.product_make_id) {
          final.page_make_id = final.product_make_id
        }
        if (config.pageMakeGroup) {
          final.page_make_group = config.pageMakeGroup
        }
        window.analyticsUtils.triggerUtagLink({}, final.tealium_event, final)
        self.formInteraction(final, formdetail)
      }
    })

    // Add search modal open event listener
    document.addEventListener('searchModalOpen', (e) => {
      var form = {}
      form.tealium_event = 'form_load'
      var productData = {}
      var item = e.detail
      var formDetail = ''

      if (item) {
        if (
          window.productHandler &&
          typeof window.productHandler.parseProductsData === 'function'
        ) {
          productData = window.productHandler.parseProductsData(config, item)

          // Cache product counts for form submission
          if (
            window.productHandler &&
            window.productHandler.loadedProductInfo &&
            productData.product_id
          ) {
            window.productHandler.loadedProductInfo[productData.product_id] = {
              imageCount: productData.product_custom_image_count,
              videoCount: productData.product_videos_count,
              descriptionLength: productData.product_description_char_count,
            }
          }
        }

        form.form_name = item.formName
        form.form_type = item.formType
        form.form_id = item.formId

        if (config.isExternalBrandedZoneSite && item.productId) {
          formDetail = `${item.modelName}_${item.productId}`
        } else {
          formDetail = `${item.modelName}_${productData.product_id || ''}`
        }

        if (form.form_id && form.form_type && form.form_name) {
          var final = Object.assign({}, config.siteUser, form, productData)
          if (utag_data && utag_data.page_h1) {
            final.page_h1 = utag_data.page_h1
          }
          if (config.pageMakeGroup) {
            final.page_make_group = config.pageMakeGroup
          }

          this.trackEvent('form_load', final)
          this.formInteraction(final, formDetail)
        }
      }
    })

    this.initialized = true
  }

  setTrackingCallback(callback) {
    this.trackingCallback = callback
  }

  setupFormTracking() {
    // Prevent multiple calls to setupFormTracking
    if (this.formTrackingSetup) {
      console.log('Form tracking already set up, skipping...')
      return
    }

    this.formTrackingSetup = true

    this.trackStaticFormLoads()
  }

  trackStaticFormLoads() {
    // Check page type from utag_data to determine if we should process static forms
    const pageType = window.utag_data?.page_type || 'other'

    // Skip static form processing for search and product details pages
    // Forms on these pages should only trigger when modals are opened
    if (pageType === 'search' || pageType === 'product details') {
      return
    }



    let forms = Array.from(
      document.querySelectorAll(
        '.component[class*=" LeadForm_"], .component[class*="OfferedServices_"]'
      )
    )

    // Filter out components that contain other selected components (prevent duplicates for nested forms)
    // If A contains B, we only want to track B (the inner/more specific one)
    forms = forms.filter((formA) => {
      const containsAnother = forms.some(
        (formB) => formB !== formA && formA.contains(formB)
      )
      return !containsAnother
    })



    forms.forEach((form) => {
      // Create unique identifier for this form to prevent duplicates
      const formId =
        form
          .querySelector('span[data-form-id]')
          ?.getAttribute('data-form-id') || 'unknown'
      const formName =
        form
          .querySelector('span[data-form-name]')
          ?.getAttribute('data-form-name') || 'unknown'
      const formKey = `${formId}_${formName}_${form.outerHTML.length}` // Include length to ensure uniqueness

      // Skip if already tracked
      if (this.formLoadTracked.has(formKey)) {
        return
      }

      // Follow EXACT exclusion logic from old template (return true = skip)
      if (form.closest('div[class*="Staff_"]')) {
        return // Skip staff forms (matches old template: return true)
      }
      // Removed exclusion for OfferedServices_ to allow tracking
      if (form.closest('div[class*="ShowcaseRoot_"]')) {
        return // Skip showcase forms (matches old template: return true)
      }
      if (form.closest('div[class*="VDP-Unit-Detail_"]')) {
        return // Skip VDP unit detail forms (matches old template: return true)
      }
      if (form.closest('div[class*="SearchRoot_"]')) {
        return // Skip search forms (matches old template: return true)
      }

      // Skip "Can't Find What You're Looking For?" form on desktop (exact logic from old template)
      if (formId == 1461 && screen.width >= 768) {
        return // Skip desktop "Can't Find" form (matches old template: return true)
      }

      // Mark as tracked BEFORE processing to prevent duplicates
      this.formLoadTracked.add(formKey)

      this.processFormLoad(form)
    })
  }

  processFormLoad(formElement) {
    const formData = this.extractFormData(formElement)

    // Extract product data from form datasource
    const productData = this.extractFormProductData(formElement)

    // Merge product data with form data
    const enrichedFormData = Object.assign(
      {},
      this.config?.siteUser || {},
      formData,
      productData,
      window.productHandler?.getShowCaseData(this.utag_data) || {}
    )

    if (this.utag_data && this.utag_data.page_h1) {
      enrichedFormData.page_h1 = this.utag_data.page_h1
    }
    if (enrichedFormData.product_make) {
      enrichedFormData.page_make = enrichedFormData.product_make.toLowerCase()
    }
    if (enrichedFormData.product_make_id) {
      enrichedFormData.page_make_id = enrichedFormData.product_make_id
    }
    if (this.config?.pageMakeGroup) {
      enrichedFormData.page_make_group = this.config.pageMakeGroup
    }
    
    // Ensure all Oem IDs and other site user properties are present
    // (Already covered by Object.assign with siteUser, but just to be safe if any specific logic needed)

    if (this.isValidForm(enrichedFormData)) {
      this.trackEvent('form_load', enrichedFormData)

      // Try to find actual DOM formDetail first (for forms with .ari-form containers)
      const ariForm = formElement.querySelector('.ari-form')
      let formDetail = ariForm ? ariForm.id : null

      // If no .ari-form found, construct formDetail from form data we already have
      if (!formDetail) {
        // Fallback for Alpaca forms or others
        const alpacaForm = formElement.querySelector('form[id^="alpaca"]')
        if (alpacaForm) {
          formDetail = alpacaForm.id
        } else {
          formDetail = `form_${enrichedFormData.form_id}_${enrichedFormData.form_name.replace(
            /\s+/g,
            '_'
          )}`
        }
      }

      // Use formInteraction method with the formDetail (real DOM ID or constructed identifier)
      this.formInteraction(enrichedFormData, formDetail)
    }
  }

  // Extract product data from form's datasource
  extractFormProductData(formElement) {
    const pageType = window.utag_data?.page_type || 'other'

    // Old template logic: different product data source based on page type
    if (pageType === 'finance') {
      // Use query string data for finance pages
      return window.productHandler?.getProductsDataFromQueryString() || {}
    } else {
      // For product details and other pages, check form's datasource
      const itemDataSource = formElement.querySelector('.datasource.hidden')
      if (itemDataSource && itemDataSource.innerHTML) {
        try {
          const productJson = JSON.parse(itemDataSource.innerHTML)
          if (productJson && productJson.productId && window.productHandler) {
            return window.productHandler.parseProductsData(
              window.TealiumConfig || {},
              productJson
            )
          }
        } catch (error) {
          console.warn('Failed to parse form datasource:', error)
        }
      }
    }

    return {}
  }

  extractFormData(formElement) {
    const extractedData = {
      form_element: '',
    }

    const processAttributes = (element) => {
      if (element && element.attributes) {
        Array.from(element.attributes).forEach((attr) => {
          if (attr.name.startsWith('data-')) {
            const key = attr.name.slice(5).replace(/-/g, '_')
            extractedData[key] = attr.value
          }
        })
      }
    }

    processAttributes(formElement)

    const spans = formElement.querySelectorAll('span')
    spans.forEach((span) => processAttributes(span))

    if (extractedData.lead_type && !extractedData.form_type) {
      extractedData.form_type = extractedData.lead_type
    }

    return extractedData
  }

  isValidForm(formData) {
    return formData.form_name && (formData.form_type || formData.form_id)
  }

  setupFormInteraction(formElement, formData) {
    const formKey = this.getFormKey(formData)

    if (this.interactionTracked.has(formKey)) {
      return
    }

    // Try multiple strategies to find the form modal container
    let formModal =
      formElement.closest('.ari-form') ||
      formElement.closest('[id*="AriFormModal"]') ||
      formElement.closest('[class*="Modal"]') ||
      formElement.closest('[class*="modal"]') ||
      formElement.closest('form')

    // If still no modal found, try looking for any parent with an ID
    if (!formModal) {
      let parent = formElement.parentElement
      while (parent && parent !== document.body) {
        if (parent.id) {
          formModal = parent
          break
        }
        parent = parent.parentElement
      }
    }

    const formId = formModal ? formModal.id : null

    if (!formId) {
      console.warn(
        'Could not find form modal ID for interaction tracking, falling back to direct form interaction'
      )
      // Fallback: attach directly to the form element itself
      this.setupDirectFormInteraction(formElement, formData, formKey)
      return
    }

    // Use jQuery event delegation exactly like original
    $(`#${formId}`).on('click', 'input,select,textarea,label', (e) => {
      if (!this.interactionTracked.has(formKey)) {
        this.interactionTracked.add(formKey)

        // Create form interaction data (reuse the same data from form_load)
        const interactionData = {
          ...formData,
          tealium_event: 'form_interaction',
        }

        this.trackEvent('form_interaction', interactionData)

        // Remove the event listener after first interaction (one-time only)
        $(`#${formId}`).off('click', 'input,select,textarea,label')
      }
    })
  }

  // Fallback method for forms without identifiable modal containers
  setupDirectFormInteraction(formElement, formData, formKey) {
    const handleFirstInteraction = (e) => {
      if (!this.interactionTracked.has(formKey)) {
        this.interactionTracked.add(formKey)

        const interactionData = {
          ...formData,
          tealium_event: 'form_interaction',
        }

        this.trackEvent('form_interaction', interactionData)

        // Remove event listeners after first interaction
        formElement.removeEventListener('input', handleFirstInteraction)
        formElement.removeEventListener('focus', handleFirstInteraction)
        formElement.removeEventListener('click', handleFirstInteraction)
      }
    }

    // Attach listeners directly to form inputs
    const inputs = formElement.querySelectorAll('input,select,textarea,label')
    inputs.forEach((input) => {
      input.addEventListener('input', handleFirstInteraction)
      input.addEventListener('focus', handleFirstInteraction)
      input.addEventListener('click', handleFirstInteraction)
    })
  }

  // Add formInteraction method to match original API exactly
  formInteraction(final, formDetail, optionalParam = '') {
    // Find the actual form element inside the modal (exactly like original)
    const formElement = document.querySelector(
      '#' + formDetail + ' form' + optionalParam
    )

    if (formElement) {
      const formKey = this.getFormKey(final)

      // Function to handle first interaction (exactly like original)
      const handleFirstInteraction = () => {
        if (!this.interactionTracked.has(formKey)) {
          this.interactionTracked.add(formKey)

          var finalInteractionData = Object.assign({}, final)
          finalInteractionData.tealium_event = 'form_interaction'

          // Trigger the event exactly like original
          window.analyticsUtils.triggerUtagLink({}, 'form_interaction', finalInteractionData)

          // Remove event listeners after the first interaction (exactly like original)
          formElement.removeEventListener('input', handleFirstInteraction)
          formElement.removeEventListener('focus', handleFirstInteraction)
          formElement.removeEventListener('click', handleFirstInteraction)
        }
      }

      // Attach listeners exactly like original (input, focus, click)
      formElement.addEventListener('input', handleFirstInteraction)
      formElement.addEventListener('focus', handleFirstInteraction)
      formElement.addEventListener('click', handleFirstInteraction)
    } else {
      // Fallback: if we have a constructed ID and it's not found, maybe we are dealing with a direct form element
      // Check if we can find it by other means or if the ID is actually on the form itself (which querySelector might miss if looking *inside*)
      if (document.getElementById(formDetail)) {
          const directForm = document.getElementById(formDetail);
          if (directForm.tagName === 'FORM' || directForm.querySelector('form')) {
              // Re-call logic manually or setup direct interaction
              // Since this method relies on formElement being found, let's try to adapt
              // If direct form is the form
          }
      }
    }
  }

  setupFormSubmissionListener() {
    document.addEventListener('submit', (event) => {
      const form = event.target
      const parentComponent = form.closest(
        '.component[class*=" LeadForm_"], .component[class*="OfferedServices_"]'
      )

      if (parentComponent) {
        this.handleFormSubmission(form, parentComponent)
      }
    })
  }

  handleFormSubmission(form, parentComponent) {
    const formData = this.extractFormData(parentComponent)
    const formKey = this.getFormKey(formData)

    if (this.formSubmissionTracked.has(formKey)) {
      return
    }

    this.formSubmissionTracked.add(formKey)

    const fieldData = this.extractFormFieldData(form)
    const submissionData = Object.assign(
      {},
      this.config?.siteUser || {},
      formData,
      fieldData
    )

    if (this.utag_data && this.utag_data.page_h1) {
      submissionData.page_h1 = this.utag_data.page_h1
    }
    if (submissionData.product_make) {
      submissionData.page_make = submissionData.product_make.toLowerCase()
    }
    if (submissionData.product_make_id) {
      submissionData.page_make_id = submissionData.product_make_id
    }
    if (this.config?.pageMakeGroup) {
      submissionData.page_make_group = this.config.pageMakeGroup
    }

    this.trackEvent('form_submission', submissionData)
  }

  extractFormFieldData(form) {
    const fieldData = {}
    const formData = new FormData(form)

    // Map common field names
    const fieldMapping = {
      firstName: 'customer_first_name',
      lastName: 'customer_last_name',
      email: 'customer_email',
      phone: 'customer_phone',
      zipCode: 'customer_zip_code',
      city: 'customer_city',
      state: 'customer_state',
      message: 'customer_message',
      interest: 'customer_interest',
    }

    for (const [key, value] of formData.entries()) {
      const mappedKey = fieldMapping[key] || key
      if (value && value.toString().trim()) {
        fieldData[mappedKey] = value.toString().trim()
      }
    }

    return fieldData
  }

  setupFormInteractionTracking() {
    // Enhanced interaction tracking for specific form types
    this.setupServiceFormTracking()
    this.setupFinancingFormTracking()
    this.setupTradeInFormTracking()
  }

  setupServiceFormTracking() {
    const serviceForms = document.querySelectorAll(
      '.component[class*="ServiceForm"]'
    )

    serviceForms.forEach((form) => {
      const serviceTypeSelect = form.querySelector(
        'select[name*="serviceType"]'
      )

      if (serviceTypeSelect) {
        serviceTypeSelect.addEventListener('change', (event) => {
          this.trackEvent('service_type_selected', {
            service_type: event.target.value,
            form_type: 'service',
          })
        })
      }
    })
  }

  setupFinancingFormTracking() {
    const financingForms = document.querySelectorAll(
      '.component[class*="FinancingForm"]'
    )

    financingForms.forEach((form) => {
      const creditScoreSelect = form.querySelector(
        'select[name*="creditScore"]'
      )

      if (creditScoreSelect) {
        creditScoreSelect.addEventListener('change', (event) => {
          this.trackEvent('credit_score_selected', {
            credit_score: event.target.value,
            form_type: 'financing',
          })
        })
      }
    })
  }

  setupTradeInFormTracking() {
    const tradeInForms = document.querySelectorAll(
      '.component[class*="TradeInForm"]'
    )

    tradeInForms.forEach((form) => {
      const vehicleTypeSelect = form.querySelector(
        'select[name*="vehicleType"]'
      )

      if (vehicleTypeSelect) {
        vehicleTypeSelect.addEventListener('change', (event) => {
          this.trackEvent('trade_vehicle_type_selected', {
            vehicle_type: event.target.value,
            form_type: 'trade_in',
          })
        })
      }
    })
  }

  setupDIDPromotionFormHandler() {
    // Handle DID promotion form events
    const didForms = document.querySelectorAll('.did-promotion-form')

    didForms.forEach((form) => {
      form.addEventListener('submit', (event) => {
        this.handleDIDFormSubmission(event, form)
      })
    })

    // Handle DID form show/hide events
    document.addEventListener('click', (event) => {
      if (event.target.matches('.did-promotion-toggle')) {
        this.handleDIDFormToggle(event)
      }
    })
  }

  handleDIDFormSubmission(event, form) {
    const promotionData = this.extractDIDPromotionData(form)
    this.trackEvent('did_promotion_form_submission', promotionData)
  }

  handleDIDFormToggle(event) {
    const isExpanding = event.target.getAttribute('aria-expanded') === 'false'
    const promotionId = event.target.getAttribute('data-promotion-id')

    this.trackEvent(
      isExpanding ? 'did_promotion_expanded' : 'did_promotion_collapsed',
      {
        promotion_id: promotionId,
        action: isExpanding ? 'expand' : 'collapse',
      }
    )
  }

  extractDIDPromotionData(form) {
    return {
      promotion_id: form.getAttribute('data-promotion-id') || '',
      promotion_name: form.getAttribute('data-promotion-name') || '',
      promotion_type: 'did',
      dealer_id: form.getAttribute('data-dealer-id') || '',
    }
  }

  // Utility methods
  getFormKey(formData) {
    return `${formData.form_name}_${formData.form_type}_${formData.form_id}`
  }

  trackEvent(eventType, additionalData = {}) {
    if (this.trackingCallback) {
      this.trackingCallback(eventType, additionalData)
    } else {
      console.warn('No tracking callback set for form event:', eventType)
    }
  }

  // Public methods for external form tracking
  trackCustomFormEvent(formElement, eventType, additionalData = {}) {
    const formData = this.extractFormData(formElement)
    const eventData = { ...formData, ...additionalData }
    this.trackEvent(eventType, eventData)
  }

  resetFormTracking(formElement) {
    const formData = this.extractFormData(formElement)
    const formKey = this.getFormKey(formData)

    this.interactionTracked.delete(formKey)
    this.formSubmissionTracked.delete(formKey)
  }

  // Get form analytics data
  getFormAnalytics() {
    return {
      formsWithInteraction: this.interactionTracked.size,
      formsSubmitted: this.formSubmissionTracked.size,
      totalFormsTracked: document.querySelectorAll(
        '.component[class*=" LeadForm_"]'
      ).length,
    }
  }

  // TriggerOfferedServicesFormLoad function (from old template)
  TriggerOfferedServicesFormLoad(modalName) {
    this.executeWithErrorHandling(() => {
      const modal = document.querySelector(`#${modalName} .ari-form`)
      if (modal) {
        this.TriggerUtagFormLoad(modal)
      }
    }, `Could not trigger offered services form load for ${modalName}`)
  }

  // TriggerUtagFormLoad function (from old template)
  TriggerUtagFormLoad(modal) {
    this.executeWithErrorHandling(() => {
      var form = {}
      form.tealium_event = 'form_load'
      var $modal = $(modal)

      // Check modal context (exactly like old template)
      if ($modal.closest('div[class*="Staff_"]').length > 0) {
        form.form_context = 'staff'
      }
      if ($modal.closest('div[class*="OfferedServices_"]').length > 0) {
        form.form_context = 'offered_services'
      }
      if ($modal.closest('div[class*="ShowcaseRoot_"]').length > 0) {
        form.form_context = 'showcase'
      }
      if ($modal.closest('div[class*="VDP-Unit-Detail_"]').length > 0) {
        form.form_context = 'vdp_unit_detail'
      }
      if ($modal.closest('div[class*="SearchRoot_"]').length > 0) {
        form.form_context = 'search'
      }

      // Extract form data exactly like old template
      form.form_name = $modal
        .find('span[data-form-name]')
        .attr('data-form-name')
      form.form_type = $modal
        .find('span[data-lead-type]')
        .attr('data-lead-type')
      form.form_id = $modal.find('span[data-form-id]').attr('data-form-id')
      var formDetail = $modal.find('.ari-form').attr('id')

      if (form.form_id && form.form_type && form.form_name) {
        var final = Object.assign({}, this.config?.siteUser || {}, form)
        if (window.utag_data && window.utag_data.page_h1) {
          final.page_h1 = window.utag_data.page_h1
        }

        this.trackEvent('form_load', final)

        // Set up form interaction tracking using formInteraction method
        if (formDetail) {
          this.formInteraction(final, formDetail)
        }
      }
    }, 'Could not trigger utag.link method')
  }

  // Enhanced form submission handling


  // Helper method to execute code with error handling
  executeWithErrorHandling(fn, errorMessage) {
    try {
      return fn()
    } catch (error) {
      console.error(errorMessage, error)
      return null
    }
  }

  // Normalize form submission data to match legacy (old-body-output.handlebars) logic
  normalizeFormSubmissionData(data) {
    var form = {}

    // Helper to safe unescape
    const safeUnescape = (str) => {
      try {
        return unescape(str)
      } catch (e) {
        return str
      }
    }

    if (
      data.firstname ||
      data.firstName ||
      data.lastname ||
      data.lastName
    ) {
      if (data.firstname) {
        form.form_submission_first_name = data.firstname
      } else if (data.firstName) {
        form.form_submission_first_name = data.firstName
      }
      if (data.lastname) {
        form.form_submission_last_name = data.lastname
      } else if (data.lastName) {
        form.form_submission_last_name = data.lastName
      }
    } else if (data.name) {
      if (data.name.split(' ').length > 0) {
        // logic to separate firstname and lastname in case just the "name" field exists
        form.form_submission_first_name = safeUnescape(
          data.name.split(' ')[0].toString()
        )
        var lastName = safeUnescape(
          data.name.replace(form.form_submission_first_name, '')
        )
        if (lastName) {
          form.form_submission_last_name = lastName
        }
      } else {
        form.form_submission_first_name = data.name
      }
    } else if (data.fullname) {
      var splittedName = data.fullname.split(' ')
      if (splittedName.length > 0) {
        // logic to separate firstname and lastname in case just the "fullname" field exists
        form.form_submission_first_name = safeUnescape(
          splittedName[0].toString()
        )
        var lastName = safeUnescape(
          data.fullname.replace(form.form_submission_first_name, '')
        )
        if (lastName) {
          form.form_submission_last_name = lastName
        }
      } else {
        form.form_submission_first_name = data.name
      }
    }

    if (data.email) {
      form.form_submission_email = safeUnescape(data.email.toString())
    } else if (data.contactEmail) {
      form.form_submission_email = safeUnescape(data.contactEmail.toString())
    }

    if (data.phone) {
      form.form_submission_phone_number = data.phone.toString()
    } else if (data.phoneNumber) {
      form.form_submission_phone_number = data.phoneNumber.toString()
    }

    if (data.address1) {
      form.form_submission_address = data.address1.toString()
    }
    if (data.street1) {
      form.form_submission_address = data.street1.toString()
    }

    if (data.city) {
      form.form_submission_city = data.city.toString()
    }

    if (data.postalcode) {
      form.form_submission_postal_code = data.postalcode.toString()
    }
    if (data.zip) {
      form.form_submission_postal_code = data.zip.toString()
    } else if (data.zipcode) {
      form.form_submission_postal_code = data.zipcode.toString()
    }

    if (data.region) {
      form.form_submission_state = data.region.toString()
    }

    if (data.tradeMake) {
      form.form_submission_trade_in_make = safeUnescape(
        data.tradeMake.toString()
      )
    }
    if (data.tradeModel) {
      form.form_submission_trade_in_model = safeUnescape(
        data.tradeModel.toString()
      )
    }
    if (data.tradeYear) {
      form.form_submission_trade_in_year = data.tradeYear.toString()
    }
    if (data.accessories) {
      form.form_submission_trade_in_accessories = safeUnescape(
        data.accessories.toString()
      )
    }
    if (data.usage) {
      form.form_submission_trade_in_miles = data.usage.toString()
    }

    if (data.leadType == 'scheduletestdrive' && data.item) {
      form.form_submission_vehicle_for_test_ride = safeUnescape(
        data.item.toString()
      )
    }

    if (data.SelectedServices) {
      form.form_submission_service_required = data.SelectedServices.join()
    }

    if (data.LeadId) {
      form.form_submission_id = data.LeadId
    }

    if (
      data.AllLocations &&
      data.AllLocations.length > 0 &&
      data.SelectedLocation
    ) {
      const selectedLocationValue = Array.isArray(data.SelectedLocation)
        ? data.SelectedLocation[0].value
        : data.SelectedLocation
      var location = data.AllLocations.find(
        (item) => item.value == selectedLocationValue
      )
      if (location) {
        form.form_submission_location_name = location.text
      }
    } else if (data.locationName) {
      form.form_submission_location_name = data.locationName
    }

    return form
  }

  destroy() {
    this.interactionTracked.clear()
    this.formSubmissionTracked.clear()
    this.formLoadTracked.clear()
    this.formTrackingSetup = false
    this.isInitialized = false
  }
}

class PageHandlers {
  constructor() {
    this.initialized = false
  }

  handlePageSpecificLogic(config, utag_data) {
    const { pageType, pageSubType } = config

    if (pageType === 'search') {
      window.productHandler.setProductItemsArrays(config, utag_data)

      var headerBanners = $('[class*="component SearchRoot_"] .seo-banner')
      if (headerBanners.length == 0) {
        headerBanners = $('[class*="component SEO-Content_"] .seo-banner')
      }

      if (headerBanners.length > 0) {
        var pageHeaderButtons =
          headerBanners[0].innerHTML.match(/href=(\"(.*?)\")/g)
        if (pageHeaderButtons) {
          utag_data.product_list_header_buttons_uris = pageHeaderButtons
        }
        var allHeaderDescriptiveElements =
          headerBanners[0].querySelectorAll('p,li')
        if (allHeaderDescriptiveElements.length > 0) {
          utag_data.product_list_header_p_char_counts =
            window.analyticsUtils.countTextCharacters(
              allHeaderDescriptiveElements
            )
        }
        utag_data.product_list_header_img_count =
          headerBanners[0].getElementsByTagName('img').length
      }

      var footerBanners = $('[class*="component SearchRoot_"] .seo-footer')
      if (footerBanners.length == 0) {
        footerBanners = $('[class*="component SEO-Content_"] .seo-footer')
      }

      if (footerBanners.length > 0) {
        var allH2InFooter = footerBanners[0].getElementsByTagName('h2')
        var allH3InFooter = footerBanners[0].getElementsByTagName('h3')

        var footerDescriptiveElements =
          footerBanners[0].querySelectorAll('p,li')
        if (footerDescriptiveElements.length > 0) {
          const textData = window.analyticsUtils.extractTextData(
            footerDescriptiveElements
          )
          utag_data.product_list_footer_p_char_counts = textData.lengths
        }
        utag_data.product_list_footer_img_count =
          footerBanners[0].getElementsByTagName('img').length

        if (allH2InFooter.length > 0) {
          const h2TextData =
            window.analyticsUtils.extractTextData(allH2InFooter)
          utag_data.product_list_footer_h2_char_counts = h2TextData.lengths
          utag_data.product_list_footer_h2_strings = h2TextData.texts
        }
        if (allH3InFooter.length > 0) {
          const h3TextData =
            window.analyticsUtils.extractTextData(allH3InFooter)
          utag_data.product_list_footer_h3_char_counts = h3TextData.lengths
          utag_data.product_list_footer_h3_strings = h3TextData.texts
        }
      }

      var searchResultsCountLabel = $('.search-results-count')
      if (searchResultsCountLabel.length > 0) {
        var arr = searchResultsCountLabel[0].innerText.split(' ')
        utag_data.search_result_count = arr[arr.length - 2]
      }

      utag_data.did_active =
        window.analyticsUtils.getCachedElements(
          '.promotion-link',
          'promotionLinks'
        ).length > 0
          ? 1
          : 0
    } else if (pageType == 'showroom') {
      window.analyticsUtils.setDataPointByDataPropertyName(
        utag_data,
        'data-product-owner-name',
        'page_make'
      )
      window.analyticsUtils.setDataPointByDataPropertyName(
        utag_data,
        'data-product-owner-id',
        'page_make_id'
      )
      window.analyticsUtils.setDataPointByDataPropertyName(
        utag_data,
        'data-category',
        'page_category'
      )
      window.analyticsUtils.setDataPointByDataPropertyName(
        utag_data,
        'data-category-id',
        'page_category_id'
      )
      window.analyticsUtils.setDataPointByDataPropertyName(
        utag_data,
        'data-selected-sub-category',
        'page_subcategory'
      )
      window.analyticsUtils.setDataPointByDataPropertyName(
        utag_data,
        'data-selected-sub-category-id',
        'page_subcategory_id'
      )
    }

    if (pageSubType === 'blog post') {
      var blog_article_author = $('.blog-detail__header-detail-author span')
        .text()
        .trim()
      if (blog_article_author) {
        utag_data.blog_article_author = blog_article_author
      }

      var blog_article_category = $('.blog-detail__header-detail-category span')
        .text()
        .trim()
      if (blog_article_category) {
        utag_data.blog_article_category = blog_article_category
      }

      var dateStr = $('.blog-detail__header-detail-date span').text().trim()
      if (dateStr && dateStr.length > 0) {
        var date = new Date(dateStr)
        utag_data.blog_article_date =
          ('0' + (date.getMonth() + 1)).slice(-2) +
          '/' +
          ('0' + date.getDate()).slice(-2) +
          '/' +
          date.getFullYear()
      }

      var allH2InBlogDetail = $('.blog-detail h2')
      if (allH2InBlogDetail.length > 0) {
        utag_data.blog_article_h2_char_counts = []
        utag_data.blog_article_h2_strings = []
        for (var i = 0; i < allH2InBlogDetail.length; i++) {
          utag_data.blog_article_h2_char_counts.push(
            allH2InBlogDetail[i].innerText.length.toString()
          )
          utag_data.blog_article_h2_strings.push(
            allH2InBlogDetail[i].innerText.trim()
          )
        }
      }

      var allDescriptiveElementsInBlogDetail = $(
        '.blog-detail p, .blog-detail li'
      )
      if (allDescriptiveElementsInBlogDetail.length > 0) {
        utag_data.blog_article_p_char_counts = []
        for (var i = 0; i < allDescriptiveElementsInBlogDetail.length; i++) {
          var text = allDescriptiveElementsInBlogDetail[i].innerText.trim()
          if (text.length > 0) {
            utag_data.blog_article_p_char_counts.push(text.length.toString())
          }
        }
      }
      var allTagsInBlogDetail = $('.blog-detail__tag-item')
      if (allTagsInBlogDetail.length > 0) {
        utag_data.blog_article_tags = []
        for (var i = 0; i < allTagsInBlogDetail.length; i++) {
          utag_data.blog_article_tags.push(
            allTagsInBlogDetail[i].innerText.trim()
          )
        }
      }
    } else if (pageSubType === 'blog list') {
      var allCategoriesInBlogListing = $('.blog-list__blog-category')
      if (allCategoriesInBlogListing.length > 0) {
        utag_data.blog_list_articles_category = []
        for (var i = 0; i < allCategoriesInBlogListing.length; i++) {
          utag_data.blog_list_articles_category.push(
            allCategoriesInBlogListing[i].innerText.trim()
          )
        }
      }
      var allArticleDateInBlogListing = $('.blog-list__blog-header-detail-date')
      if (allArticleDateInBlogListing.length > 0) {
        utag_data.blog_list_articles_date = []
        for (var i = 0; i < allArticleDateInBlogListing.length; i++) {
          var date = new Date(allArticleDateInBlogListing[i].innerText.trim())
          utag_data.blog_list_articles_date.push(
            ('0' + (date.getMonth() + 1)).slice(-2) +
            '/' +
            ('0' + date.getDate()).slice(-2) +
            '/' +
            date.getFullYear()
          )
        }
      }
      var allArticleTitlesInBlogListing = $('.blog-list__blog-title a')
      if (allArticleTitlesInBlogListing.length > 0) {
        utag_data.blog_list_articles_titles_char_counts = []
        utag_data.blog_list_articles_titles_strings = []
        for (var i = 0; i < allArticleTitlesInBlogListing.length; i++) {
          utag_data.blog_list_articles_titles_char_counts.push(
            allArticleTitlesInBlogListing[i].innerText.trim().length.toString()
          )
          utag_data.blog_list_articles_titles_strings.push(
            allArticleTitlesInBlogListing[i].innerText.trim()
          )
        }
      }
    }
  }
}

class AnalyticsManager {
  constructor() {
    this.initialized = false
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
    window.analyticsUtils.triggerUtagView(window.utag_data, customData)
  }

  triggerUtagLink(eventType, customData = {}) {
    window.analyticsUtils.triggerUtagLink(window.utag_data, eventType, customData)
  }

  initialize(config) {
    console.log('Initializing Tealium Analytics Manager')
    if (config && window.analyticsUtils) {
      config = window.analyticsUtils.cleanEventData(config)
    }
    this.config = config

    // Process configuration and create utag_data
    this.processConfiguration()

    this.initialized = true

    this.initializePageHandlers()

    return this
  }

  processConfiguration() {
    
    if (typeof $ !== 'undefined' && $.extend) {
        const existing = $.extend({}, window.utag_data);
        $.extend(window.utag_data, this.config.siteUser, existing);
    } else {
        const existing = Object.assign({}, window.utag_data);
        Object.assign(window.utag_data, this.config.siteUser, existing);
    }

    this.addPageDataToUtag()

    this.addSearchDataToUtag()

    if (window.analyticsUtils) {
      window.utag_data = window.analyticsUtils.cleanEventData(window.utag_data)
    }
  }

  addPageDataToUtag() {
    const config = this.config

    const pageType = config.pageType || config.page_type
    const pageSubType = config.pageSubType || config.page_sub_type || config.page_subtype

    if (pageType) {
      window.utag_data.page_type = pageType
      window.utag_data.site_section = pageType
    }
    if (pageSubType) {
      window.utag_data.page_sub_type = pageSubType
      window.utag_data.site_sub_section = pageSubType
    }
    if (config.pageBrand) window.utag_data.page_make = config.pageBrand
    if (config.pageBrandId) window.utag_data.page_make_id = config.pageBrandId
    if (config.pageBrandCategory)
      window.utag_data.page_category = config.pageBrandCategory
    if (config.pageBrandCategoryId)
      window.utag_data.page_category_id = config.pageBrandCategoryId
    if (config.pageBrandSubCategory)
      window.utag_data.page_sub_category = config.pageBrandSubCategory
    if (config.pageBrandSubCategoryId)
      window.utag_data.page_sub_category_id = config.pageBrandSubCategoryId
    if (config.pageMakeGroup)
      window.utag_data.page_make_group = config.pageMakeGroup
  }

  addSearchDataToUtag() {
    const config = this.config

    // Process search filters if this is a search page
    if (config.pageType === 'search') {
      this.processSearchFilters()
    }

    if (config.searchKeyword)
      window.utag_data.search_keyword = config.searchKeyword
    if (
      config.searchPageAppliedFilters &&
      config.searchPageAppliedFilters.length > 0
    ) {
      window.utag_data.search_filters = config.searchPageAppliedFilters
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
          ; (filters[key] = filters[key] || []).push(value)
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
        // Merge directly into window.utag_data
        $.extend(window.utag_data, this.config.productInfo)
      }
    }, 'Error processing product analytics:')

    this.executeWithErrorHandling(() => {
      if (window.productHandler) {
        window.productHandler.getPromotionAnalyticsData(this.config)
        // Merge directly into window.utag_data
        $.extend(window.utag_data, this.config.brandPromotionInfo)
      }
    }, 'Error processing promotion analytics:')

    window.utag_data.podium_chatbox_active =
      this.getCachedElement("div[class*='Premium-Texting_']", 'podiumChatbox')
        .length != 0
        ? 1
        : 0

    if (
      this.getCachedElement('#pageNotFoundModal', 'pageNotFoundModal').length
    ) {
      window.utag_data.tealium_event = 'error_view'
      window.utag_data.site_section = 'error'
      window.utag_data.site_sub_section = 'error'
      window.utag_data.page_error_code = '404'
    }

    if (window.eventHandler) {
      window.eventHandler.initialize(this.config, window.utag_data)
    }

    var allH1InHeader = this.getCachedElement('h1', 'h1Elements')
    if (allH1InHeader.length > 0) {
      window.utag_data.page_h1 = allH1InHeader[0].innerText
    }

    if (window.pageHandlers) {
      window.pageHandlers.handlePageSpecificLogic(this.config, window.utag_data)
    }

    this.executeWithErrorHandling(() => {
      this.config.loadTealiumScript() // Script should be loaded after all utag_data datapoints are created
    }, 'Could not load tealium script.')

    if (window.formHandler) {
      window.formHandler.initialize(this.config, window.utag_data)
    }

    if (
      this.getCachedElement(
        '[class*="New-Holland-CE-Dealer-Landing-Page"]',
        'newHollandCE'
      ).length > 0
    ) {
      window.utag_data.tealium_event = 'oem_standard_branded_zone_view'
      window.utag_data.page_make = 'new holland construction'
      window.utag_data.page_make_group = 'new holland construction'
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
          {},
          'did_view_offer_details_click',
          final
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
        window.analyticsUtils.triggerUtagLink({}, 'did_view_more_click', final)
      }, 'Could not trigger utag.link on promotion ' + (e.detail?.promotionId || ''))
    })

    // FormSubmissionDetails event listener
    document.addEventListener('FormSubmissionDetails', (e) => {
      this.executeWithErrorHandling(() => {
        var form = {}
        form.tealium_event = 'form_submit'



        var submissionData = e.detail && e.detail.formData ? e.detail.formData : (e.detail || {});
        form = Object.assign({}, form, submissionData);

        // Normalize specific fields to legacy format
        if (window.formHandler && window.formHandler.normalizeFormSubmissionData) {
            var normalizedData = window.formHandler.normalizeFormSubmissionData(submissionData);
            form = Object.assign({}, form, normalizedData);
        }

        // Handle specific form submission types
        if (form.form_name === 'Get A Quote' || form.FormName === 'Get A Quote') {
          form.tealium_event = 'did_get_a_quote_form_submit'
        }

        // Extract productDetails based on pageType
        const pageType = window.utag_data?.page_type || 'other'
        let productDetails = {}

        if (pageType === 'search') {
          let dataToParse = {}

          // Safely extract data from e.detail
          if (e.detail) {
            if (e.detail.formData && !e.detail.productId) {
              dataToParse = Object.assign({}, e.detail.formData)
            } else {
              dataToParse = Object.assign({}, e.detail)
            }
          }

          productDetails =
            window.productHandler.parseProductsData(this.config, dataToParse) ||
            {}

          // Restore cached counts from form_load (legacy behavior)
          if (
            productDetails.product_id &&
            window.productHandler &&
            window.productHandler.loadedProductInfo &&
            window.productHandler.loadedProductInfo[productDetails.product_id]
          ) {
            const cached =
              window.productHandler.loadedProductInfo[productDetails.product_id]

            if (cached.imageCount !== undefined && cached.imageCount !== null) {
              productDetails.product_custom_image_count = cached.imageCount
            }
            if (cached.videoCount !== undefined && cached.videoCount !== null) {
              productDetails.product_videos_count = cached.videoCount
            }
            if (
              cached.descriptionLength !== undefined &&
              cached.descriptionLength !== null
            ) {
              productDetails.product_description_char_count =
                cached.descriptionLength
            }
          }
        } else if (pageType === 'finance') {
          if (
            window.productHandler &&
            window.productHandler.getProductsDataFromQueryString
          ) {
            productDetails =
              window.productHandler.getProductsDataFromQueryString() || {}
          }
        } else {
          productDetails = this.config.productInfo || {}
        }

        const showcaseData =
          window.productHandler?.getShowCaseData?.(window.utag_data) || {}
        const promotionData =
          window.productHandler?.getPromotionData?.(form, e.detail?.formData) ||
          {}

        var final = Object.assign(
          {},
          this.config.siteUser,
          form,
          productDetails,
          showcaseData,
          promotionData
        )

        if (window.utag_data.page_h1) {
          final.page_h1 = window.utag_data.page_h1
        }

        if (productDetails.product_make) {
          final.page_make = productDetails.product_make.toLowerCase()
        }
        if (productDetails.product_make_id) {
          final.page_make_id = productDetails.product_make_id
        }
        if (this.config.pageMakeGroup) {
          final.page_make_group = this.config.pageMakeGroup
        }

        window.analyticsUtils.triggerUtagLink({}, form.tealium_event, final)
      }, 'Could not trigger utag.link method for form submission')
    })

    this.setupInventoryPromoHandler()
    this.setupEcommerceEventListeners()
  }

  setupInventoryPromoHandler() {
    // Set up promotion link tracking
    const limitedTimeOfferBtnClicked = 'limitedTimeOfferBtnClicked_flag'

    // Track promotion link clicks and set localStorage flag
    $('.promotion-link').click(function () {
      localStorage.setItem(limitedTimeOfferBtnClicked, true)
    })

    // Product details page specific handling
    const pageType = window.utag_data?.page_type || 'other'
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

  // Handle limited time offer button click
  handleLimitedTimeOfferButtonClick() {
    this.executeWithErrorHandling(() => {
      window.utag_data.tealium_event = 'did_limited_time_offer_click'
      window.analyticsUtils.triggerUtagLink(
        {},
        'did_limited_time_offer_click',
        window.utag_data
      )
    }, 'Could not trigger limited time offer click event')
  }

  setupEcommerceEventListeners() {
    // eCommerce event handling
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


  }

  handleWindowLoad() {
    const { pageType, referenceError } = this.config

    if (pageType === 'search' || pageType === 'product details') {
      window.utag_data.digital_retailing_active =
        document.getElementsByClassName('boatyard-btn').length > 0 ? 1 : 0
      window.utag_data.reserve_a_unit_active =
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
    }


  }

  updateUtagData(updates) {
    $.extend(window.utag_data, updates)
  }

  getUtagData() {
    return window.utag_data
  }
}

; (function () {
  window.analyticsUtils = new AnalyticsUtils()
  window.productHandler = new ProductHandler()
  window.eventHandler = new EventHandler()
  window.formHandler = new FormHandler()
  window.pageHandlers = new PageHandlers()
  window.analyticsManager = new AnalyticsManager()

  // Global functions from FormHandler
  window.TriggerOfferedServicesFormLoad = function (modalName) {
    return window.formHandler.TriggerOfferedServicesFormLoad(modalName)
  }

  window.TriggerUtagFormLoad = function (modal) {
    return window.formHandler.TriggerUtagFormLoad(modal)
  }
})()

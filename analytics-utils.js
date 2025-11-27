// analytics-utils.js
// Common utility functions for analytics processing

class AnalyticsUtils {
  constructor() {
    // Empty constructor
  }

  // PRESERVE EXACT FUNCTIONALITY - QueryStringToJSON function from original
  QueryStringToJSON() {
    var pairs = location.search.slice(1).split('&');
    var result = {};
    pairs.forEach(function(pair) {
      pair = pair.split('=');
      result[pair[0]] = decodeURIComponent(pair[1] || '');
    });
    return result;
  }

  // PRESERVE EXACT FUNCTIONALITY - setDataPointByDataPropertyName function from original
  setDataPointByDataPropertyName(utag_data, attributeName, propertyName) {
    var result = $('span[' + attributeName + ']').eq(0).attr(attributeName);
    if(result) {
      utag_data[propertyName] = result;
    }
  }

  // PRESERVE EXACT FUNCTIONALITY - getProductsDataFromQueryString function from original
  getProductsDataFromQueryString(config) {
    var productJson = null;
    try {
      productJson = this.QueryStringToJSON();
    } catch (e) {
    }
    return productJson && productJson.productId ? window.productHandler.parseProductsData(config, productJson) : null;
  }

  /**
   * Safely parse JSON string with error handling
   * @param {string} jsonString - JSON string to parse
   * @returns {object|null} Parsed object or null if parsing fails
   */
  safeJsonParse(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }

    try {
      // Handle HTML entities that might be in the JSON (preserve exact logic)
      const cleanedString = jsonString
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');

      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('JSON parse failed:', error, 'Input:', jsonString);
      return null;
    }
  }

  /**
   * Parse price string to number (preserve exact logic)
   * @param {string} priceString - Price string (e.g., "$1,234.56")
   * @returns {number} Numeric price value
   */
  parsePrice(priceString) {
    if (!priceString) return 0;

    // Remove currency symbols, commas, and spaces (preserve exact regex)
    const cleanPrice = priceString.toString().replace(/[$,\s]/g, '');
    const price = parseFloat(cleanPrice);

    return isNaN(price) ? 0 : price;
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
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// Initialize utilities (self-contained like productAiExpert.js)
(function() {
  // AnalyticsUtils is available in this script's scope
  window.analyticsUtils = new AnalyticsUtils();
})();

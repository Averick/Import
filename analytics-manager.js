// Prevent redeclaration errors
if (typeof AnalyticsManager === 'undefined') {
  class AnalyticsManager {
    constructor() {
      this.initialized = false;
      this.utag_data = {};
      this.config = null;
    }

  initialize(config) {
    console.log('Initializing Tealium Analytics Manager');
    this.config = config;
    
    // Initialize utag_data with siteUser data (preserve exact structure)
    this.utag_data = $.extend({}, config.siteUser);
    
    // Add search filters and keywords if present
    if (config.searchPageAppliedFilters.length > 0) {
      this.utag_data.search_filters = config.searchPageAppliedFilters;
    }
    if (config.searchKeyword) {
      this.utag_data.search_keyword = config.searchKeyword;
    }

    // Add page brand information
    if (config.pageBrand) {
      this.utag_data.page_make = config.pageBrand.toLowerCase();
    }
    if (config.pageBrandId) {
      this.utag_data.page_make_id = config.pageBrandId;
    }
    if (config.pageBrandCategory) {
      this.utag_data.page_category = config.pageBrandCategory;
    }
    if (config.pageBrandCategoryId) {
      this.utag_data.page_category_id = config.pageBrandCategoryId;
    }
    if (config.pageBrandSubCategory) {
      this.utag_data.page_subcategory = config.pageBrandSubCategory;
    }
    if (config.pageBrandSubCategoryId) {
      this.utag_data.page_subcategory_id = config.pageBrandSubCategoryId;
    }
    if (config.pageMakeGroup) {
      this.utag_data.page_make_group = config.pageMakeGroup;
    }

    // Add pageSubType if present
    if (config.pageSubType) {
      this.utag_data.site_sub_section = config.pageSubType;
    }

    // Make utag_data globally available for backwards compatibility
    window.utag_data = this.utag_data;

    this.initialized = true;
    
    // Initialize page-specific handlers based on pageType
    this.initializePageHandlers();
    
    return this;
  }

  initializePageHandlers() {
    const { pageType } = this.config;
    
    // Initialize document ready handlers
    $(document).ready(() => {
      this.handleDocumentReady();
    });

    // Initialize window load handlers
    $(window).load(() => {
      this.handleWindowLoad();
    });
  }

  handleDocumentReady() {
    try {
      // Get product analytics data (preserve exact function call)
      if (window.productHandler) {
        window.productHandler.getProductAnalyticsData(this.config);
        this.utag_data = $.extend({}, this.utag_data, this.config.productInfo);
      }
    } catch(err) {
      console.error(err.message);
    }

    try {
      // Get promotion analytics data (preserve exact function call)
      if (window.productHandler) {
        window.productHandler.getPromotionAnalyticsData(this.config);
        this.utag_data = $.extend({}, this.utag_data, this.config.brandPromotionInfo);
      }
    } catch(err) {
      console.error(err.message);
    }

    // Podium chatbox detection (preserve exact logic)
    this.utag_data.podium_chatbox_active = $("div[class*='Premium-Texting_']").length != 0 ? 1 : 0;

    // 404 modal detection (preserve exact logic)
    if ($('#pageNotFoundModal').length) {
      this.utag_data.tealium_event = 'error_view';
      this.utag_data.site_section = 'error';
      this.utag_data.site_sub_section = 'error';
      this.utag_data.page_error_code = '404';
    }

    // Initialize event handlers
    if (window.eventHandler) {
      window.eventHandler.initialize(this.config, this.utag_data);
    }

    // Get H1 tag content (preserve exact logic)
    var allH1InHeader = $('h1');
    if(allH1InHeader.length > 0) {
      this.utag_data.page_h1 = allH1InHeader[0].innerText; //only 1st H1 tag is required
    }

    // Initialize page-specific logic
    if (window.pageHandlers) {
      window.pageHandlers.handlePageSpecificLogic(this.config, this.utag_data);
    }

    // Load Tealium script (preserve exact timing and logic)
    try {
      this.config.loadTealiumScript(); // As a guideline from tealium,  script should be loaded after all utag_data datapoints are created.
    } catch {
      console.log('Could not load tealium script.');
    }

    // Initialize form handlers
    if (window.formHandler) {
      window.formHandler.initialize(this.config, this.utag_data);
    }

    // New Holland CE branded zone detection (preserve exact logic)
    if (document.querySelector('[class*="New-Holland-CE-Dealer-Landing-Page"]')) {
      this.utag_data.tealium_event = "oem_standard_branded_zone_view";
      this.utag_data.page_make = "new holland construction";
      this.utag_data.page_make_group = "new holland construction";
    }

    // Update global utag_data
    window.utag_data = this.utag_data;
  }

  handleWindowLoad() {
    const { pageType, referenceError } = this.config;

    // Digital retailing and reserve unit detection (preserve exact logic)
    if(pageType === 'search' || pageType === 'product details') {
      this.utag_data.digital_retailing_active = document.getElementsByClassName("boatyard-btn").length > 0 ? 1 : 0;
      this.utag_data.reserve_a_unit_active = document.querySelectorAll("#reserveUnitBtn").length > 0 ? 1 : 0;
    }

    // PSS and OEM parts lookup detection (preserve exact logic)
    var pssExists = $(".component[class*='PSS-component_']").length >= 1;
    var oemPartsLookupExists = $(".component[class*='OEMPartsLookup_']").length >= 1;
    if(!pssExists || oemPartsLookupExists){
      if(typeof utag !== referenceError) {
        utag.view(this.utag_data);
      } else {
        console.log('Could not trigger utag.view method.');
      }
    }

    // Initialize form tracking
    if (window.formHandler) {
      // Set up tracking callback for form events
      window.formHandler.setTrackingCallback((eventType, data) => {
        const formEventData = $.extend({}, this.utag_data, data, { tealium_event: eventType });
        if (typeof utag !== referenceError) {
          utag.link(formEventData);
        } else {
          console.log('Could not trigger utag.link method for form event:', eventType);
        }
      });
      window.formHandler.setupFormTracking();
    }

    // Update global utag_data
    window.utag_data = this.utag_data;
  }

  // Method to update utag_data (for use by other modules)
  updateUtagData(updates) {
    this.utag_data = $.extend({}, this.utag_data, updates);
    window.utag_data = this.utag_data;
  }

  // Method to get current utag_data
  getUtagData() {
    return this.utag_data;
  }
  }
}

// Initialize analytics manager (self-contained like productAiExpert.js)
(function() {
  // AnalyticsManager is available in this script's scope
  if (typeof window.analyticsManager === 'undefined') {
    window.analyticsManager = new AnalyticsManager();
  }
})();

class FormHandler {
  constructor() {
    this.initialized = false;
    this.interactionTracked = new Set();
    this.formSubmissionTracked = new Set();
    this.trackingCallback = null;
  }

  initialize(config, utag_data) {
    if (this.initialized) return;
    
    // Listener for form load event from products page
    $('body').on('show.bs.modal', 'div[id*="AriFormModal"]', function (e) { 
      var form = {};
      form.tealium_event = "form_load";
      var modal = e.currentTarget.closest('.ari-form');
      var formdetail = modal.id;
      form.form_name = $(modal).find('span[data-form-name]').attr('data-form-name');
      form.form_type = $(modal).find('span[data-lead-type]').attr('data-lead-type');
      form.form_id = $(modal).find('span[data-form-id]').attr('data-form-id');

      if(form.form_name === 'Get Promotions') {
        form.tealium_event = 'did_view_offer_details_click';
        if(localStorage) {
          form.did_promotions_name = localStorage.selectedPromotionTitle;
          form.campaign_id = localStorage.selectedPromotionIds;
        }
      }

      if (form.form_id && form.form_type && form.form_name) {
        var final = $.extend({}, config.siteUser, form, config.productInfo);
        if (utag_data.page_h1) {
          final.page_h1 = utag_data.page_h1;
        }
        if (config.productInfo.product_make) {
          final.page_make = config.productInfo.product_make.toLowerCase();
        }
        if (config.productInfo.product_make_id) {
          final.page_make_id = config.productInfo.product_make_id;
        }
        if (config.pageMakeGroup) {
          final.page_make_group = config.pageMakeGroup;
        }
        if(typeof utag !== config.referenceError) {
          utag.link(final);
        } else {
          console.log('Could not trigger utag.link method.');
        }
        window.formHandler.formInteraction(final, formdetail);
      }
    });

    // Add search modal open event listener (preserve exact logic from original)
    document.addEventListener("searchModalOpen", (e) => {
      var form = {};
      form.tealium_event = "form_load";
      var productData = {};
      var item = e.detail;
      var formDetail = "";
      
      if (item) {
        // Use productHandler to parse product data if available
        if (window.productHandler && typeof window.productHandler.parseProductsData === 'function') {
          productData = window.productHandler.parseProductsData(item);
        }
        
        form.form_name = item.formName;
        form.form_type = item.formType;
        form.form_id = item.formId;
        
        if (config.isExternalBrandedZoneSite && item.productId) {
          formDetail = `${item.modelName}_${item.productId}`;
        } else {
          formDetail = `${item.modelName}_${productData.product_id || ''}`;
        }
        
        if (form.form_id && form.form_type && form.form_name) {
          var final = Object.assign({}, config.siteUser, form, productData);
          if (utag_data && utag_data.page_h1) {
            final.page_h1 = utag_data.page_h1;
          }
          if (config.pageMakeGroup) {
            final.page_make_group = config.pageMakeGroup;
          }
          
          // Track the event using the callback
          this.trackEvent('form_load', final);
          
          // Set up form interaction tracking if form element exists
          const formElement = document.querySelector(`#${formDetail}`);
          if (formElement) {
            const formData = this.extractFormData(formElement);
            this.setupFormInteraction(formElement, formData);
          }
        }
      }
    });

    this.initialized = true;
  }

  setTrackingCallback(callback) {
    this.trackingCallback = callback
  }

  setupFormTracking() {
    // Track form loads
    this.trackFormLoads()

    // Set up observers for dynamically loaded forms
    this.observeForNewForms()
  }

  trackFormLoads() {
    const forms = document.querySelectorAll('.component[class*=" LeadForm_"]')
    forms.forEach((form) => {
      // Apply same exclusion logic as original Global Tealium Tracking
      if (form.closest('div[class*="Staff_"]')) return;
      if (form.closest('div[class*="OfferedServices_"]')) return;
      if (form.closest('div[class*="ShowcaseRoot_"]')) return;
      if (form.closest('div[class*="VDP-Unit-Detail_"]')) return;
      if (form.closest('div[class*="SearchRoot_"]')) return; // Fixes inventory page issue
      
      // Additional exclusion from original
      const formIdElement = form.querySelector('span[data-form-id]');
      const formId = formIdElement ? formIdElement.getAttribute('data-form-id') : null;
      if (formId == 1461 && screen.width >= 768) return; // Desktop "Can't Find" form
      
      this.processFormLoad(form);
    })
  }

  processFormLoad(formElement) {
    const formData = this.extractFormData(formElement)

    if (this.isValidForm(formData)) {
      this.trackEvent('form_load', formData)
      this.setupFormInteraction(formElement, formData)
    }
  }

  extractFormData(formElement) {
    const formNameElement = formElement.querySelector('span[data-form-name]')
    const leadTypeElement = formElement.querySelector('span[data-lead-type]')
    const formIdElement = formElement.querySelector('span[data-form-id]')
    const formLocationElement = formElement.querySelector(
      'span[data-form-location]'
    )

    return {
      form_name: formNameElement?.getAttribute('data-form-name') || '',
      form_type: leadTypeElement?.getAttribute('data-lead-type') || '',
      form_id: formIdElement?.getAttribute('data-form-id') || '',
      form_location:
        formLocationElement?.getAttribute('data-form-location') || '',
      form_element: formElement,
    }
  }

  isValidForm(formData) {
    return formData.form_name && (formData.form_type || formData.form_id)
  }

  setupFormInteraction(formElement, formData) {
    const formKey = this.getFormKey(formData)

    if (this.interactionTracked.has(formKey)) {
      return
    }

    // Get the form modal ID (formdetail equivalent)
    const formModal = formElement.closest('.ari-form') || formElement.closest('[id*="AriFormModal"]')
    const formId = formModal ? formModal.id : null

    if (!formId) {
      console.warn('Could not find form modal ID for interaction tracking')
      return
    }

    // Use jQuery event delegation exactly like original
    $(`#${formId}`).on('click', 'input,select,textarea,label', (e) => {
      if (!this.interactionTracked.has(formKey)) {
        this.interactionTracked.add(formKey)
        
        // Create form interaction data (reuse the same data from form_load)
        const interactionData = { ...formData, tealium_event: 'form_interaction' }
        
        this.trackEvent('form_interaction', interactionData)
        
        // Remove the event listener after first interaction (one-time only)
        $(`#${formId}`).off('click', 'input,select,textarea,label')
      }
    })
  }

  // Add formInteraction method to match original API
  formInteraction(formData, formdetail) {
    // This matches the original formInteraction(final, formdetail) call
    const formKey = this.getFormKey(formData)
    
    $(`#${formdetail}`).on('click', 'input,select,textarea,label', (e) => {
      if (!this.interactionTracked.has(formKey)) {
        this.interactionTracked.add(formKey)
        
        // Use same data as form_load but change event type
        const interactionData = { ...formData, tealium_event: 'form_interaction' }
        this.trackEvent('form_interaction', interactionData)
        
        // Remove listener after first click
        $(`#${formdetail}`).off('click', 'input,select,textarea,label')
      }
    })
  }

  setupFormSubmissionListener() {
    document.addEventListener('submit', (event) => {
      const form = event.target
      const parentComponent = form.closest('.component[class*=" LeadForm_"]')

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

    // Extract form field data
    const fieldData = this.extractFormFieldData(form)
    const submissionData = { ...formData, ...fieldData }

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

  observeForNewForms() {
    // Set up MutationObserver to detect dynamically added forms
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const forms = node.querySelectorAll(
              '.component[class*=" LeadForm_"]'
            )
            forms.forEach((form) => this.processFormLoad(form))

            // Check if the added node itself is a form
            if (
              node.matches &&
              node.matches('.component[class*=" LeadForm_"]')
            ) {
              this.processFormLoad(node)
            }
          }
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
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

  destroy() {
    this.interactionTracked.clear()
    this.formSubmissionTracked.clear()
    this.isInitialized = false
  }
}

// Initialize form handler (self-contained like productAiExpert.js)
(function() {
  // FormHandler is available in this script's scope
  window.formHandler = new FormHandler();
})();

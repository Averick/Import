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
        var final = $.extend({}, config.siteUser, form, config.productInfo)
        if (utag_data.page_h1) {
          final.page_h1 = utag_data.page_h1
        }
        if (config.productInfo.product_make) {
          final.page_make = config.productInfo.product_make.toLowerCase()
        }
        if (config.productInfo.product_make_id) {
          final.page_make_id = config.productInfo.product_make_id
        }
        if (config.pageMakeGroup) {
          final.page_make_group = config.pageMakeGroup
        }
        window.analyticsUtils.triggerUtagLink(final, final.tealium_event)
        window.formHandler.formInteraction(final, formdetail)
      }
    })

    // Add search modal open event listener (preserve exact logic from original)
    document.addEventListener('searchModalOpen', (e) => {
      var form = {}
      form.tealium_event = 'form_load'
      var productData = {}
      var item = e.detail
      var formDetail = ''

      if (item) {
        // Use productHandler to parse product data if available
        if (
          window.productHandler &&
          typeof window.productHandler.parseProductsData === 'function'
        ) {
          productData = window.productHandler.parseProductsData(item)
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

          // Track the event using the callback
          this.trackEvent('form_load', final)

          // Set up form interaction tracking using formInteraction method like original
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

    // Only track static form loads on appropriate page types
    // (Modal forms are tracked separately via show.bs.modal event)
    this.trackStaticFormLoads()

    // Set up observers for dynamically loaded forms
    this.observeForNewForms()
  }

  trackStaticFormLoads() {
    // Check page type from utag_data to determine if we should process static forms
    const pageType = window.utag_data?.page_type || 'other'

    console.log(
      `🔍 Page type: ${pageType} - Checking if static form loads should be tracked`
    )

    // The old template processes static LeadForms on all pages, but we should be more selective
    // Based on the issue description, forms should only trigger form_load when modals are opened
    // So we should NOT automatically process all LeadForms on page load for search pages
    if (pageType === 'search') {
      console.log(
        `⏭️ Skipping static form loads on search page - forms will only trigger when modals are opened`
      )
      return
    }

    const forms = document.querySelectorAll('.component[class*=" LeadForm_"]')
    console.log(
      `🔍 trackStaticFormLoads called for ${pageType} page - Found ${forms.length} LeadForm components`
    )

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
        console.log(
          `⏭️ Skipping already tracked form: ${formName} (ID: ${formId})`
        )
        return
      }

      // Follow EXACT exclusion logic from old template (return true = skip)
      if (form.closest('div[class*="Staff_"]')) {
        console.log(`⏭️ Skipping Staff form: ${formName} (ID: ${formId})`)
        return // Skip staff forms (matches old template: return true)
      }
      if (form.closest('div[class*="OfferedServices_"]')) {
        console.log(
          `⏭️ Skipping OfferedServices form: ${formName} (ID: ${formId})`
        )
        return // Skip offered services forms (matches old template: return true)
      }
      if (form.closest('div[class*="ShowcaseRoot_"]')) {
        console.log(
          `⏭️ Skipping ShowcaseRoot form: ${formName} (ID: ${formId})`
        )
        return // Skip showcase forms (matches old template: return true)
      }
      if (form.closest('div[class*="VDP-Unit-Detail_"]')) {
        console.log(
          `⏭️ Skipping VDP-Unit-Detail form: ${formName} (ID: ${formId})`
        )
        return // Skip VDP unit detail forms (matches old template: return true)
      }
      if (form.closest('div[class*="SearchRoot_"]')) {
        console.log(`⏭️ Skipping SearchRoot form: ${formName} (ID: ${formId})`)
        return // Skip search forms (matches old template: return true)
      }

      // Skip "Can't Find What You're Looking For?" form on desktop (exact logic from old template)
      if (formId == 1461 && screen.width >= 768) {
        console.log(
          `⏭️ Skipping Can't Find form (desktop): ${formName} (ID: ${formId})`
        )
        return // Skip desktop "Can't Find" form (matches old template: return true)
      }

      // Mark as tracked BEFORE processing to prevent duplicates
      this.formLoadTracked.add(formKey)

      console.log(
        `🔍 Processing static form_load for: ${formName} (ID: ${formId}) - Key: ${formKey}`
      )

      this.processFormLoad(form)
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
    const formModal =
      formElement.closest('.ari-form') ||
      formElement.closest('[id*="AriFormModal"]')
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

  // Add formInteraction method to match original API exactly
  formInteraction(final, formDetail, optionalParam = '') {
    console.log('formInteraction called with:', { final, formDetail })

    // Find the actual form element inside the modal (exactly like original)
    const formElement = document.querySelector(
      '#' + formDetail + ' form' + optionalParam
    )

    if (formElement) {
      console.log('Form with ID found, attaching event listeners.')
      const formKey = this.getFormKey(final)

      // Function to handle first interaction (exactly like original)
      const handleFirstInteraction = () => {
        if (!this.interactionTracked.has(formKey)) {
          console.log('Tracking form interaction for:', formKey)
          this.interactionTracked.add(formKey)

          var finalInteractionData = Object.assign({}, final)
          finalInteractionData.tealium_event = 'form_interaction'

          // Trigger the event using trackingCallback
          this.trackEvent('form_interaction', finalInteractionData)

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
      console.log(`Form with ID ${formDetail} not found.`)
    }
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
  setupFormSubmissionTracking() {
    document.addEventListener('submit', (event) => {
      const form = event.target
      const parentComponent = form.closest('.component[class*=" LeadForm_"]')

      if (parentComponent) {
        this.handleFormSubmission(form, parentComponent)
      }
    })

    // Listen for custom form submission events
    document.addEventListener('FormSubmissionDetails', (e) => {
      this.executeWithErrorHandling(() => {
        if (e.detail && e.detail.formData) {
          const eventData = {
            tealium_event: 'form_submit',
            ...e.detail.formData,
          }

          // Check for specific form submission types
          if (eventData.form_name === 'Get A Quote') {
            eventData.tealium_event = 'did_get_a_quote_form_submit'
          }

          this.trackEvent(eventData.tealium_event, eventData)
        }
      }, 'Could not process form submission details event')
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

  destroy() {
    this.interactionTracked.clear()
    this.formSubmissionTracked.clear()
    this.formLoadTracked.clear()
    this.formTrackingSetup = false
    this.isInitialized = false
  }
}

// Initialize form handler (self-contained like productAiExpert.js)
;(function () {
  // FormHandler is available in this script's scope
  window.formHandler = new FormHandler()

  // Expose utility functions globally to match old template API
  window.TriggerOfferedServicesFormLoad = function (modalName) {
    return window.formHandler.TriggerOfferedServicesFormLoad(modalName)
  }

  window.TriggerUtagFormLoad = function (modal) {
    return window.formHandler.TriggerUtagFormLoad(modal)
  }
})()

class FormHandler {
  constructor() {
    this.initialized = false
    this.interactionTracked = new Set()
    this.formSubmissionTracked = new Set()
    this.formLoadTracked = new Set()
    this.formTrackingSetup = false
  }

  initialize(config, utag_data) {
    if (this.initialized) return

    // Store config for use in event handlers
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

        // Merge with existing product info and form data
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

        // Direct call to analytics utils - simplified pattern
        window.analyticsUtils.triggerUtagLink(final, final.tealium_event)

        // Always set up form interaction (answer 1: yes to every form_load)
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

          // Direct call to analytics utils
          window.analyticsUtils.triggerUtagLink(final, 'form_load')

          // Always set up form interaction
          this.formInteraction(final, formDetail)
        }
      }
    })

    // FormSubmissionDetails event listener (moved from analytics-manager)
    document.addEventListener('FormSubmissionDetails', (e) => {
      this.handleFormSubmissionDetails(e)
    })

    // Setup promotion handlers (moved from analytics-manager)
    this.setupPromotionHandlers()

    this.initialized = true
  }

  setupFormTracking() {
    // Prevent multiple calls to setupFormTracking
    if (this.formTrackingSetup) {
      console.log('Form tracking already set up, skipping...')
      return
    }

    this.formTrackingSetup = true

    // Track static form loads (removed page type restrictions - answer 1)
    this.trackStaticFormLoads()

    // Set up observers for dynamically loaded forms
    this.observeForNewForms()

    // Setup form submission tracking
    this.setupFormSubmissionTracking()
  }

  trackStaticFormLoads() {
    const pageType = window.utag_data?.page_type || 'other'

    console.log(
      `🔍 Page type: ${pageType} - Processing static form loads (all pages now include interaction tracking)`
    )

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
      const formKey = `${formId}_${formName}_${form.outerHTML.length}`

      // Skip if already tracked
      if (this.formLoadTracked.has(formKey)) {
        console.log(
          `⏭️ Skipping already tracked form: ${formName} (ID: ${formId})`
        )
        return
      }

      // Follow EXACT exclusion logic from old template
      if (form.closest('div[class*="Staff_"]')) {
        console.log(`⏭️ Skipping Staff form: ${formName} (ID: ${formId})`)
        return
      }
      if (form.closest('div[class*="OfferedServices_"]')) {
        console.log(
          `⏭️ Skipping OfferedServices form: ${formName} (ID: ${formId})`
        )
        return
      }
      if (form.closest('div[class*="ShowcaseRoot_"]')) {
        console.log(
          `⏭️ Skipping ShowcaseRoot form: ${formName} (ID: ${formId})`
        )
        return
      }
      if (form.closest('div[class*="VDP-Unit-Detail_"]')) {
        console.log(
          `⏭️ Skipping VDP-Unit-Detail form: ${formName} (ID: ${formId})`
        )
        return
      }
      if (form.closest('div[class*="SearchRoot_"]')) {
        console.log(`⏭️ Skipping SearchRoot form: ${formName} (ID: ${formId})`)
        return
      }

      // Skip "Can't Find What You're Looking For?" form on desktop
      if (formId == 1461 && screen.width >= 768) {
        console.log(
          `⏭️ Skipping Can't Find form (desktop): ${formName} (ID: ${formId})`
        )
        return
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
    const productData = this.extractFormProductData(formElement)
    const enrichedFormData = Object.assign({}, formData, productData)

    if (this.isValidForm(enrichedFormData)) {
      // Direct call to analytics utils
      window.analyticsUtils.triggerUtagLink(enrichedFormData, 'form_load')

      // Try to find actual DOM formDetail first
      const ariForm = formElement.querySelector('.ari-form')
      let formDetail = ariForm ? ariForm.id : null

      // If no .ari-form found, construct formDetail from form data
      if (!formDetail) {
        formDetail = `form_${
          enrichedFormData.form_id
        }_${enrichedFormData.form_name.replace(/\s+/g, '_')}`
      }

      // Always set up form interaction (answer 1: yes)
      this.formInteraction(enrichedFormData, formDetail)
    }
  }

  // FormSubmissionDetails handler (moved from analytics-manager)
  handleFormSubmissionDetails(e) {
    try {
      var form = {}
      form.tealium_event = 'form_submit'

      if (e.detail && e.detail.formData) {
        form = Object.assign({}, form, e.detail.formData)
      }

      // Handle specific form submission types
      if (form.form_name === 'Get A Quote') {
        form.tealium_event = 'did_get_a_quote_form_submit'
      }

      // Extract productDetails based on pageType
      const pageType = this.utag_data?.page_type || 'other'
      let productDetails = {}

      if (pageType === 'search') {
        if (e.detail && e.detail.formData && window.productHandler) {
          productDetails =
            window.productHandler.parseProductsData(
              this.config,
              e.detail.formData
            ) || {}
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

      // Get showcase and promotion data
      const showcaseData =
        window.productHandler?.getShowCaseData?.(this.utag_data) || {}
      const promotionData =
        window.productHandler?.getPromotionData?.(form, e.detail?.formData) ||
        {}

      // Merge all data
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

      // Set page make info from product details
      if (productDetails.product_make) {
        final.page_make = productDetails.product_make.toLowerCase()
      }
      if (productDetails.product_make_id) {
        final.page_make_id = productDetails.product_make_id
      }
      if (this.config.pageMakeGroup) {
        final.page_make_group = this.config.pageMakeGroup
      }

      // Direct call to analytics utils
      window.analyticsUtils.triggerUtagLink(final, form.tealium_event)
    } catch (error) {
      console.error('Could not process form submission details event', error)
    }
  }

  // Promotion handlers (moved from analytics-manager)
  setupPromotionHandlers() {
    const limitedTimeOfferBtnClicked = 'limitedTimeOfferBtnClicked_flag'

    // Track promotion link clicks and set localStorage flag
    $('.promotion-link').click(function () {
      localStorage.setItem(limitedTimeOfferBtnClicked, true)
    })

    // Product details page specific handling
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

  // Handle limited time offer button click
  handleLimitedTimeOfferButtonClick() {
    try {
      const eventData = Object.assign({}, this.utag_data)
      eventData.tealium_event = 'did_limited_time_offer_click'
      window.analyticsUtils.triggerUtagLink(
        eventData,
        'did_limited_time_offer_click'
      )
    } catch (error) {
      console.error('Could not trigger limited time offer click event', error)
    }
  }

  // Extract product data from form's datasource
  extractFormProductData(formElement) {
    const pageType = window.utag_data?.page_type || 'other'

    if (pageType === 'finance') {
      return window.productHandler?.getProductsDataFromQueryString() || {}
    } else {
      const itemDataSource = formElement.querySelector('.datasource.hidden')
      if (itemDataSource && itemDataSource.innerHTML) {
        try {
          const productJson = JSON.parse(itemDataSource.innerHTML)
          if (productJson && productJson.productId && window.productHandler) {
            return window.productHandler.parseProductsData(
              this.config || {},
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

  // Form interaction method (matches original API exactly)
  formInteraction(final, formDetail, optionalParam = '') {
    console.log('formInteraction called with:', { final, formDetail })

    // Find the actual form element inside the modal
    const formElement = document.querySelector(
      '#' + formDetail + ' form' + optionalParam
    )

    if (formElement) {
      console.log(`Form with ID found, attaching event listeners.`)
      const formKey = this.getFormKey(final)

      // Function to handle first interaction
      const handleFirstInteraction = () => {
        if (!this.interactionTracked.has(formKey)) {
          console.log('Tracking form interaction for:', formKey)
          this.interactionTracked.add(formKey)

          var finalInteractionData = Object.assign({}, final)
          finalInteractionData.tealium_event = 'form_interaction'

          // Direct call to analytics utils
          window.analyticsUtils.triggerUtagLink(
            finalInteractionData,
            'form_interaction'
          )

          // Remove event listeners after first interaction
          formElement.removeEventListener('input', handleFirstInteraction)
          formElement.removeEventListener('focus', handleFirstInteraction)
          formElement.removeEventListener('click', handleFirstInteraction)
        }
      }

      // Attach listeners exactly like original
      formElement.addEventListener('input', handleFirstInteraction)
      formElement.addEventListener('focus', handleFirstInteraction)
      formElement.addEventListener('click', handleFirstInteraction)
    } else {
      console.log(`Form with ID ${formDetail} not found.`)
    }
  }

  setupFormSubmissionTracking() {
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

    const fieldData = this.extractFormFieldData(form)
    const submissionData = { ...formData, ...fieldData }

    // Direct call to analytics utils
    window.analyticsUtils.triggerUtagLink(submissionData, 'form_submission')
  }

  extractFormFieldData(form) {
    const fieldData = {}
    const formData = new FormData(form)

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

  observeForNewForms() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const forms = node.querySelectorAll(
              '.component[class*=" LeadForm_"]'
            )
            forms.forEach((form) => this.processFormLoad(form))

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

  // TriggerOfferedServicesFormLoad function (from old template)
  TriggerOfferedServicesFormLoad(modalName) {
    try {
      const modal = document.querySelector(`#${modalName} .ari-form`)
      if (modal) {
        this.TriggerUtagFormLoad(modal)
      }
    } catch (error) {
      console.error(
        `Could not trigger offered services form load for ${modalName}`,
        error
      )
    }
  }

  // TriggerUtagFormLoad function (from old template)
  TriggerUtagFormLoad(modal) {
    try {
      var form = {}
      form.tealium_event = 'form_load'
      var $modal = $(modal)

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

        // Direct call to analytics utils
        window.analyticsUtils.triggerUtagLink(final, 'form_load')

        // Always set up form interaction
        if (formDetail) {
          this.formInteraction(final, formDetail)
        }
      }
    } catch (error) {
      console.error('Could not trigger utag.link method', error)
    }
  }

  destroy() {
    this.interactionTracked.clear()
    this.formSubmissionTracked.clear()
    this.formLoadTracked.clear()
    this.formTrackingSetup = false
    this.initialized = false
  }
}

// Initialize form handler
;(function () {
  window.formHandler = new FormHandler()

  // Expose utility functions globally to match old template API
  window.TriggerOfferedServicesFormLoad = function (modalName) {
    return window.formHandler.TriggerOfferedServicesFormLoad(modalName)
  }

  window.TriggerUtagFormLoad = function (modal) {
    return window.formHandler.TriggerUtagFormLoad(modal)
  }
})()

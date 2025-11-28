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

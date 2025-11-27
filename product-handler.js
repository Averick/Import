// Handles all product-specific analytics data processing

class ProductHandler {
  constructor() {
    // Empty constructor - methods will be called statically
  }

  getProductAnalyticsData(config) {
    if(config.pageType === "product details") {
      var productDataSource = JSON.parse(document.getElementById('unit-analytics-data').innerHTML.replace(/&quot;/g, '"'));
      if(config.isExternalBrandedZoneSite && productDataSource.productExternalId) {
        config.productInfo.product_id = productDataSource.productExternalId;
        config.productInfo.product_external_platform = [config.parentSitePlatformType];
        config.productInfo.product_external_id = [productDataSource.productExternalId];
      } else {
        config.productInfo.product_id = productDataSource.productId;
      }
      config.productInfo.product_name = productDataSource.item.trim();
      config.productInfo.vdp_urgency_active = document.querySelector('.visitors-count') ? 1 : 0;
      utag_data.did_active = document.querySelectorAll("#inventory_promoMessage").length > 0 ? 1 : 0;
      if(productDataSource.itemTypeId) {
        config.productInfo.product_category = productDataSource.itemType;
        config.productInfo.product_category_id = productDataSource.itemTypeId;
      }
      if(productDataSource.itemSubtypeId){
        config.productInfo.product_subcategory_id = productDataSource.itemSubtypeId;
        config.productInfo.product_subcategory = productDataSource.itemSubtype;
      }
      if(productDataSource.itemMakeId) {
        config.productInfo.product_make_id = productDataSource.itemMakeId;
        config.productInfo.product_make = productDataSource.itemMake;
      }
      if(productDataSource.itemModel) {
        config.productInfo.product_model = productDataSource.itemModel;
      }
      if(productDataSource.itemYear > 0) {
        config.productInfo.product_year = productDataSource.itemYear;
      }
      if(productDataSource.usageStatus) {
        config.productInfo.product_condition = productDataSource.usageStatus.trim();
      } else if(!productDataSource.isUnitInventory) {
        config.productInfo.product_condition = "New";
      }
      if(productDataSource.itemIndustry) {
        config.productInfo.product_industry = productDataSource.itemIndustry.trim();
      }
      config.productInfo.product_on_sale = productDataSource.itemOnSale ? 1 : 0;
      if(productDataSource.isUnitInventory) {
        config.productInfo.product_type = "Inventory";
      } else {
        config.productInfo.product_type = "Showcase";
      }
      config.productInfo.product_uri = window.location.pathname;
      if(productDataSource.itemThumbNailUrl) {
        config.productInfo.product_image_url = productDataSource.itemThumbNailUrl;
      }
      config.productInfo.product_custom_image_count = productDataSource.itemCustomImageCount;
      config.productInfo.product_videos_count = productDataSource.itemVideoExists;
      config.productInfo.product_360view_count = document.getElementById('dealer360-spin-container') != null ? 1 : 0;
      config.productInfo.product_description_char_count = productDataSource.itemDescriptionCount;
      if(productDataSource.itemOriginalPrice) {
        var originalPrice = parseFloat(productDataSource.itemOriginalPrice.replace(/[$,]/g,''));
        if(originalPrice > 0){
          config.productInfo.product_original_price = originalPrice;
        }
      }
      if(productDataSource.itemOnSale) {
        if(productDataSource.salePrice) {
          config.productInfo.product_price = productDataSource.salePrice.toString().replace(/[$,]/g,'');
        }
        if(productDataSource.discountAmount) {
          config.productInfo.product_discount_amount = productDataSource.discountAmount;
        }
      } else {
        var productPrice = parseFloat(productDataSource.itemOriginalPrice.replace(/[$,]/g,''));
        if(productPrice > 0) {
          config.productInfo.product_price = productPrice;
        }
      }

      var financingAnchor = $("a[data-form-type='financing'][data-is-external-url='False']");		
      try {
        if(financingAnchor.length > 0) {
          var financingUrl = new URL(financingAnchor.attr('href'), window.location.origin);
          financingUrl.searchParams.append("item_360view_count", config.productInfo.product_360view_count);
          financingUrl.searchParams.append("vdp_urgency_active_flag", config.productInfo.vdp_urgency_active);
          financingAnchor.attr("href", financingUrl.toString());
        }
      } catch(e) {
        console.error('Error parsing financing URL in Tealium component');
      }
    }
  }

  getPromotionAnalyticsData(config) {
    var promotionAnalyticsData = document.getElementById('promotion-analytics-data');
    if(promotionAnalyticsData) {
      var promotionDataSource = JSON.parse(promotionAnalyticsData.innerHTML.replace(/&quot;/g, '"'));
      if(promotionDataSource.promotionId) {
        config.brandPromotionInfo.promotion_id = promotionDataSource.promotionId;
        config.brandPromotionInfo.promotion_name = promotionDataSource.promotionName; 
      }
      if(promotionDataSource.promotionMakeId) {
        config.brandPromotionInfo.promotion_make_id = promotionDataSource.promotionMakeId;
        config.brandPromotionInfo.promotion_make = promotionDataSource.promotionMake;
      }
      if(promotionDataSource.promotionCategoryId) {
        config.brandPromotionInfo.promotion_category = promotionDataSource.promotionCategory; 
        config.brandPromotionInfo.promotion_category_id = promotionDataSource.promotionCategoryId;
      }
    }
  }

  // PRESERVE EXACT FUNCTIONALITY - setProductItemsArrays function
  setProductItemsArrays(config, utag_data, attributeName, propertyName) {
    var makes = [];
    var years = [];
    var ids = [];
    var names = [];
    var types = [];
    var onSales = [];
    var prices = [];
    var categories = [];
    var categoryIds = [];
    var industries = [];
    var makeIds = [];
    var msrps = [];
    var vins = [];
    var externalColors = [];
    var productExternalIds = [];
    var productExternalPlatforms = [];
    var activePromotions = [];

    var IsProductData = function(data) {
      var productItemFields = ['itemMake', 'itemYear', 'productId', 'productExternalId', 'isUnitInventory', 'itemOnSale', 'name', 'unitPrice', 'itemType', 'itemTypeId', 'itemIndustry', 'productOwnerId', 'itemOriginalPrice', 'vin', 'primaryColor']
      return Object.entries(data).filter(item => productItemFields.includes(item[0]) && item[1] != null && !/^\s*$/.test(item[1])).length > 0
    }

    $('span.datasource.hidden').each(function() {
      try {
        var data = JSON.parse(this.innerText);
        if(IsProductData(data)) {
          makes.push(data.itemMake);
          years.push(data.itemYear);
          if(config.isExternalBrandedZoneSite && data.productExternalId) {
            ids.push(parseInt(data.productExternalId));
            productExternalIds.push(data.productExternalId);
            productExternalPlatforms.push(config.parentSitePlatformType);
          } else {
            ids.push(data.productId);
          }
          names.push(data.name);
          types.push(data.isUnitInventory != undefined && data.isUnitInventory.toString().toUpperCase() === 'TRUE' ? 'Inventory' : 'Showcase');
          onSales.push(data.itemOnSale != undefined && data.itemOnSale.toString().toUpperCase() === 'TRUE' ? '1' : '0');
          prices.push(data.unitPrice);
          categories.push(data.itemType);
          categoryIds.push(data.itemTypeId);
          industries.push(data.itemIndustry);
          makeIds.push(data.productOwnerId);
          msrps.push(data.itemOriginalPrice);
          vins.push(data.vin);
          externalColors.push(data.primaryColor);	
          activePromotions.push(data.arePromotionsAvailable ? 1 : 0);	
        }
      } catch (error) {
        console.error('JSON parse failed for unit: ', error);
      }
    });
      
    var addToUtag = function(array, name) {
      if(array.length > 0) {
        utag_data[name] = array;
      }
    }

    addToUtag(makes, 'product_list_makes');
    addToUtag(years, 'product_list_years');
    addToUtag(ids, 'product_list_ids');
    addToUtag(names, 'product_list_names');
    addToUtag(types, 'product_list_types');
    addToUtag(onSales, 'product_list_on_sale');
    addToUtag(prices, 'product_list_prices');
    addToUtag(categories, 'product_list_categories');
    addToUtag(categoryIds, 'product_list_category_ids');
    addToUtag(industries, 'product_list_industries');
    addToUtag(makeIds, 'product_list_make_ids');
    addToUtag(msrps, 'product_list_msrp');
    addToUtag(vins, 'product_list_vins');
    addToUtag(externalColors, 'product_list_external_colors');
    addToUtag(productExternalIds, 'product_external_id');
    addToUtag(productExternalPlatforms, 'product_external_platform');
    addToUtag(activePromotions, 'product_list_did_active');
  }

  // PRESERVE EXACT FUNCTIONALITY - parseProductsData function
  parseProductsData(config, item) {
    var product = {};
    if(config.isExternalBrandedZoneSite && item.productExternalId) {
      product.product_id = item.productExternalId;
    } else {
      if (item.productId) {
        product.product_id = item.productId;
      }
    }
    if (item.item) {
      product.product_name = item.item;
    }
    if (item.itemYear > 0) {
      product.product_year = item.itemYear;
    } else if (item.year > 0) {
      product.product_year = item.year;
    }
    if (item.itemMake) {
      product.product_make = item.itemMake;
    }
    if (item.itemMakeId) {
      product.product_make_id = item.itemMakeId;
    }
    if (item.itemModel) {
      product.product_model = item.itemModel;
    } else if (item.model) {
      product.product_model = item.model;
    }
    if (item.itemUrl) {
      product.product_uri = new URL(item.itemUrl, window.location).pathname;
    } else if (item.itemurl) {
      product.product_uri = new URL(item.itemurl, window.location).pathname;
    }
    if (item.usageStatus) {
      product.product_condition = item.usageStatus;
    }
    if (item.isUnitInventory || item.isUnitInventory === 'True') {
      product.product_type = 'Inventory';
    } else {
      product.product_type = 'Showcase';
    }
    if (item.itemDisplayPrice) {
      var price = parseFloat(item.itemDisplayPrice.replace(/[$,]/g,''));
      if (price > 0) {
        product.product_price = price;
      }
    }
    if (item.itemType) {
      product.product_category = item.itemType;
    }		
    if (item.itemTypeId) {
      product.product_category_id = item.itemTypeId;
    }	
    if (item.itemOriginalPrice) {
      var price = parseFloat(item.itemOriginalPrice.replace(/[$,]/g,''));
      if (price > 0){
        product.product_original_price = price;
      }
    }
    if (item.itemIndustry) {
      product.product_industry = item.itemIndustry;
    }
    if (item.itemOnSale) {
      product.product_on_sale = item.itemOnSale.toUpperCase() === 'TRUE' ? '1' : '0';
    } else if(item.FormId != 1461) { //1461 is id for 'Can't find what you are looking for' form
      product.product_on_sale = '0';
    }
    if (product.product_price && product.product_original_price) {
      var price = product.product_original_price - product.product_price;
      if (price > 0){
        product.product_discount_amount = price;
      }
    }
    if (item.itemSubtype) {
      product.product_subcategory = item.itemSubtype;
    }
    if (item.itemSubtype && item.itemSubtypeId) {
      product.product_subcategory_id = item.itemSubtypeId;
    }
    if (item.itemCustomImageCount) {
      product.product_custom_image_count = item.itemCustomImageCount;
    } else if (item.imageCount >= 0) {
      product.product_custom_image_count = item.imageCount;
    }
    if (item.itemVideoExists) {
      product.product_videos_count = item.itemVideoExists;
    } else if (item.videoCount >= 0) {
      product.product_videos_count = item.videoCount;
    }
    if (item.itemDescriptionCount) {
      product.product_description_char_count = item.itemDescriptionCount;
    } else if (item.descriptionLength >= 0) {
      product.product_description_char_count = item.descriptionLength;
    }
    if (item.item_360view_count) {
      product.product_360view_count = item.item_360view_count;
    }
    if (item.vdp_urgency_active_flag) {
      product.vdp_urgency_active = item.vdp_urgency_active_flag;
    }
    return product;
  }

  // PRESERVE EXACT FUNCTIONALITY - getShowCaseData function
  getShowCaseData(utag_data) {
    var showCaseData = {};
    if (utag_data.page_make) {
      showCaseData.page_make = utag_data.page_make.toLowerCase();
    }
    if (utag_data.page_make_id) {
      showCaseData.page_make_id = utag_data.page_make_id;
    }
    if (utag_data.page_category) {
      showCaseData.page_category = utag_data.page_category;
    }
    if (utag_data.page_category_id) {
      showCaseData.page_category_id = utag_data.page_category_id;
    }
    if (utag_data.page_subcategory) {
      showCaseData.page_subcategory = utag_data.page_subcategory;
    }
    if (utag_data.page_subcategory_id) {
      showCaseData.page_subcategory_id = utag_data.page_subcategory_id;
    }
    return showCaseData;
  }

  // PRESERVE EXACT FUNCTIONALITY - getPromotionData function
  getPromotionData(form, data) {
    var promotion = {};

    if(localStorage && localStorage.selectedPromotionIds) {
      promotion.did_promotions_selected = localStorage.selectedPromotionIds;
      promotion.campaign_id = localStorage.selectedPromotionIds;
    }

    if(form) {
      promotion.did_form_id = form.formId;
      promotion.did_form_name = form.formName;
      promotion.did_form_submission_first_name = form.form_submission_first_name;
      promotion.did_form_submission_last_name = form.form_submission_last_name;
    }
    
    if(data && data.contact) {
      promotion.did_form_submission_perferred_contact = data.contact;
      if(data.contact === 'email') {
        promotion.did_form_submission_email = data.email;
      }
      if(data.contact === 'phone') {
        promotion.did_form_submission_phone = data.phone;
      }
    }

    return promotion;	
  }
}

// Initialize product handler (self-contained like productAiExpert.js)
(function() {
  // ProductHandler is available in this script's scope
  window.productHandler = new ProductHandler();
})();

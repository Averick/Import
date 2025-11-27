// page-handlers.js
// Handles page-specific logic - PRESERVE EXACT FUNCTIONALITY

class PageHandlers {
  constructor() {
    this.initialized = false;
  }

  handlePageSpecificLogic(config, utag_data) {
    const { pageType, pageSubType } = config;

    // PRESERVE EXACT PAGE-SPECIFIC LOGIC FROM ORIGINAL

    if(pageType === 'search') {
      window.productHandler.setProductItemsArrays(config, utag_data);
      
      var headerBanners = $('[class*="component SearchRoot_"] .seo-banner');
      if(headerBanners.length == 0) {
        headerBanners = $('[class*="component SEO-Content_"] .seo-banner');
      }
      
      if(headerBanners.length > 0) {
        var pageHeaderButtons = headerBanners[0].innerHTML.match(/href=(\"(.*?)\")/g);
        if (pageHeaderButtons) {
          utag_data.product_list_header_buttons_uris = pageHeaderButtons;
        }
        var allHeaderDescriptiveElements = headerBanners[0].querySelectorAll('p,li');
        if(allHeaderDescriptiveElements.length > 0) {
          var paragraphCharacterCounts = 0;
          allHeaderDescriptiveElements.forEach((p, i) => {
            paragraphCharacterCounts = paragraphCharacterCounts + p.innerText.trim().length;
          })
          utag_data.product_list_header_p_char_counts = paragraphCharacterCounts;
        }
        utag_data.product_list_header_img_count = headerBanners[0].getElementsByTagName("img").length;
      }

      var footerBanners = $('[class*="component SearchRoot_"] .seo-footer');
      if(footerBanners.length == 0) {
        footerBanners = $('[class*="component SEO-Content_"] .seo-footer');
      }
      
      if (footerBanners.length > 0) {
        var allH2InFooter = footerBanners[0].getElementsByTagName("h2");
        var allH3InFooter = footerBanners[0].getElementsByTagName("h3");

        var footerDescriptiveElements = footerBanners[0].querySelectorAll('p,li');
        if (footerDescriptiveElements.length > 0) {
          utag_data.product_list_footer_p_char_counts = [];
          Array.from(footerDescriptiveElements).forEach(function (item) {
            var text = item.innerText.trim();
            if(text.length > 0) {
              utag_data.product_list_footer_p_char_counts.push(text.length.toString());
            }
          });
        }
        utag_data.product_list_footer_img_count = footerBanners[0].getElementsByTagName("img").length;

        if (allH2InFooter.length > 0) {
          utag_data.product_list_footer_h2_char_counts = [];
          utag_data.product_list_footer_h2_strings = [];
          for (var i = 0; i < allH2InFooter.length; i++) {
            utag_data.product_list_footer_h2_char_counts.push(allH2InFooter[i].innerText.length.toString());
            utag_data.product_list_footer_h2_strings.push(allH2InFooter[i].innerText);
          }
        }
        if (allH3InFooter.length > 0) {
          utag_data.product_list_footer_h3_char_counts = [];
          utag_data.product_list_footer_h3_strings = [];
          for (var i = 0; i < allH3InFooter.length; i++) {
            utag_data.product_list_footer_h3_char_counts.push(allH3InFooter[i].innerText.length.toString());
            utag_data.product_list_footer_h3_strings.push(allH3InFooter[i].innerText);
          }
        }
      }

      var searchResultsCountLabel = $('.search-results-count');
      if(searchResultsCountLabel.length > 0){
        var arr = searchResultsCountLabel[0].innerText.split(' ');
        utag_data.search_result_count = arr[arr.length - 2];
      }

      utag_data.did_active = document.querySelectorAll(".promotion-link").length > 0 ? 1 : 0;
    } else if (pageType == 'showroom') {
      window.analyticsUtils.setDataPointByDataPropertyName(utag_data, 'data-product-owner-name', 'page_make');
      window.analyticsUtils.setDataPointByDataPropertyName(utag_data, 'data-product-owner-id', 'page_make_id');
      window.analyticsUtils.setDataPointByDataPropertyName(utag_data, 'data-category', 'page_category');
      window.analyticsUtils.setDataPointByDataPropertyName(utag_data, 'data-category-id', 'page_category_id');
      window.analyticsUtils.setDataPointByDataPropertyName(utag_data, 'data-selected-sub-category', 'page_subcategory');
      window.analyticsUtils.setDataPointByDataPropertyName(utag_data, 'data-selected-sub-category-id', 'page_subcategory_id');
    }

    if (pageSubType === 'blog post') {
      var blog_article_author = $('.blog-detail__header-detail-author span').text().trim();
      if (blog_article_author) {
        utag_data.blog_article_author = blog_article_author;  
      }
      
      var blog_article_category = $('.blog-detail__header-detail-category span').text().trim();
      if (blog_article_category) {
        utag_data.blog_article_category = blog_article_category;  
      }
      
      var dateStr = $('.blog-detail__header-detail-date span').text().trim();
      if (dateStr && dateStr.length > 0) {
        var date = new Date(dateStr);
        utag_data.blog_article_date = ('0' + (date.getMonth()+1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + '/' + date.getFullYear();
      }
      
      var allH2InBlogDetail = $('.blog-detail h2');
      if (allH2InBlogDetail.length > 0) {
        utag_data.blog_article_h2_char_counts = [];
        utag_data.blog_article_h2_strings = [];
        for(var i=0; i<allH2InBlogDetail.length; i++) {
          utag_data.blog_article_h2_char_counts.push(allH2InBlogDetail[i].innerText.length.toString());
          utag_data.blog_article_h2_strings.push(allH2InBlogDetail[i].innerText.trim());
        }
      }
      
      var allDescriptiveElementsInBlogDetail = $('.blog-detail p, .blog-detail li');
      if (allDescriptiveElementsInBlogDetail.length > 0) {
        utag_data.blog_article_p_char_counts = [];
        for(var i=0; i<allDescriptiveElementsInBlogDetail.length; i++) {
          var text = allDescriptiveElementsInBlogDetail[i].innerText.trim();
          if(text.length > 0) {
            utag_data.blog_article_p_char_counts.push(text.length.toString());
          }
        }
      }
      var allTagsInBlogDetail = $('.blog-detail__tag-item');
      if (allTagsInBlogDetail.length > 0) {
        utag_data.blog_article_tags = [];
        for(var i=0; i<allTagsInBlogDetail.length; i++) {
          utag_data.blog_article_tags.push(allTagsInBlogDetail[i].innerText.trim());
        }
      }
    } else if (pageSubType === 'blog list') {
      var allCategoriesInBlogListing = $('.blog-list__blog-category');
      if (allCategoriesInBlogListing.length > 0) {
        utag_data.blog_list_articles_category = [];
        for(var i=0; i<allCategoriesInBlogListing.length; i++) {
          utag_data.blog_list_articles_category.push(allCategoriesInBlogListing[i].innerText.trim());
        }
      }
      var allArticleDateInBlogListing = $('.blog-list__blog-header-detail-date');
      if (allArticleDateInBlogListing.length > 0) {
        utag_data.blog_list_articles_date = [];
        for(var i=0; i<allArticleDateInBlogListing.length; i++) {
          var date = new Date(allArticleDateInBlogListing[i].innerText.trim());
          utag_data.blog_list_articles_date.push(('0' + (date.getMonth()+1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + '/' + date.getFullYear());
        }
      }
      var allArticleTitlesInBlogListing = $('.blog-list__blog-title a');
      if (allArticleTitlesInBlogListing.length > 0) {
        utag_data.blog_list_articles_titles_char_counts = [];
        utag_data.blog_list_articles_titles_strings = [];
        for(var i=0; i<allArticleTitlesInBlogListing.length; i++) {
          utag_data.blog_list_articles_titles_char_counts.push(allArticleTitlesInBlogListing[i].innerText.trim().length.toString());
          utag_data.blog_list_articles_titles_strings.push(allArticleTitlesInBlogListing[i].innerText.trim());
        }
      }
    }
  }
}

// Initialize page handlers (self-contained like productAiExpert.js)
(function() {
  // PageHandlers is available in this script's scope
  window.pageHandlers = new PageHandlers();
})();

<script>
"use strict"

var tealiumEnvironment = 'prod';
var tealiumProfile = 'default';
var piwikId = '';
var ga4Id = '';
var productInfo = {};
var brandPromotionInfo = {};
var loadedProductInfo = {};
var referenceError = 'undefined';
var isExternalBrandedZoneSite = false;
var isBrandedZoneSite = false;
var absolutePath = '{{Helpers.String.Replace @root.Url.AbsolutePath "'" "\'"}}';
var parentSitePlatformType = '';

{{#if @root.Site.Settings.OemProgram.IsActive}}
	isBrandedZoneSite = true;
	{{#Helpers.Object.Compare @root.Site.Settings.OemProgram.ParentSite.PlatformType "!=" @root.customDataModel.ProxyAccountPlatform.Spark}}
		isExternalBrandedZoneSite = true;
		parentSitePlatformType = '{{Helpers.String.Replace @root.Site.Settings.OemProgram.ParentSite.PlatformType "'" "\'"}}';
	{{/Helpers.Object.Compare}}
{{/if}}

{{#if @root.Site.SiteDefaultDataModel.TealiumEnvironment}}
	tealiumEnvironment = '{{@root.Site.SiteDefaultDataModel.TealiumEnvironment}}';
{{/if}}

{{#if @root.Site.SiteDefaultDataModel.TealiumProfile}}
	tealiumProfile = '{{@root.Site.SiteDefaultDataModel.TealiumProfile}}';
{{/if}}

var profilePrefix = isExternalBrandedZoneSite ? 'dealerspike' : 'ari';
tealiumProfile = tealiumProfile === 'default' ? profilePrefix + '-eas' : profilePrefix + '-' + tealiumProfile;

{{#each @root.ExternalDataModel.0.data}}
	{{#Helpers.Regex.IsMatch @key "Piwik Pro" "i"}} 
		piwikId = '{{@value}}'; 
	{{/Helpers.Regex.IsMatch}}
{{/each}}

{{#if @root.Site.Settings.OemProgram.IsActive}}
	{{#Helpers.Object.Compare @root.Site.Settings.OemProgram.ParentSite.PlatformType @root.customDataModel.ProxyAccountPlatform.DealerSpike}}
		{{#each @root.Site.SiteDefaultDataModel.OEMTrackingIds}}
			{{#Helpers.Object.Compare this.Oem.Name @root.CustomDataModel.TrackingGroupId.ParentWebsiteGA4ID}}
					ga4Id = '{{this.trackingId}}';
			{{/Helpers.Object.Compare}}
		{{/each}} 
	{{else}}
		{{#each @root.ExternalDataModel.0.data}}
			{{#Helpers.Regex.IsMatch @key "GA4" "i"}} 
				ga4Id = '{{@value}}';
			{{/Helpers.Regex.IsMatch}}
		{{/each}}
	{{/Helpers.Object.Compare}}
{{else}}
	{{#each @root.ExternalDataModel.0.data}}
		{{#Helpers.Regex.IsMatch @key "GA4" "i"}} 
			ga4Id = '{{@value}}';
		{{/Helpers.Regex.IsMatch}}
	{{/each}}
{{/if}}

// Tealium script loading function
var loadTealiumScript = function(a,b,c,d){
	a='//tags.tiqcdn.com/utag/dtms/' + tealiumProfile + '/' + tealiumEnvironment + '/utag.js'; 
	b=document;c='script';d=b.createElement(c);d.src=a;d.type='text/java'+c;d.async=true;
	a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a);
};

// Page variables
var langCode = navigator.language||navigator.userLanguage;
var searchPageAppliedFilters = [];
var searchKeyword = '';
var pageType = 'other';
var pageSubType = '';
var eventType = 'standard_view';
var pageBrand = '';
var pageBrandId = '';
var pageBrandCategory = '';
var pageBrandCategoryId = '';
var pageBrandSubCategory = '';
var pageBrandSubCategoryId = '';
var productDescription = '';
var pageMakeGroup = '';

{{#*inline "pageMappingProperties"}}
	pageType = '{{this.pageType}}';
	eventType = '{{this.eventType}}';
	pageSubType = '{{this.pageSubType}}';
	pageBrand = '{{this.pageMake}}';
	pageBrandId = '{{this.pageMakeId}}';
	pageBrandCategory = '{{this.pageCategory}}';
	pageBrandCategoryId = '{{this.pageCategoryId}}';
	pageBrandSubCategory = '{{this.pageSubCategory}}';
	pageBrandSubCategoryId = '{{this.pageSubCategoryId}}';
	pageMakeGroup = '{{this.pageMakeGroup}}';
{{/inline}}

// Page mapping logic
// 1. First, check specific Branded Zone Pages if active
if (isBrandedZoneSite) {
	{{#each @root.CustomDataModel.pageMappings}}
		{{#Helpers.Regex.IsMatch @root.Site.Settings.OemProgram.FolderPath @key "i"}}
			{{> pageMappingProperties}}
		{{/Helpers.Regex.IsMatch}}
	{{/each}}
} 

if (!isBrandedZoneSite || (isBrandedZoneSite && absolutePath !== '/')) {
	{{#each @root.CustomDataModel.pageMappings}}
		{{#Helpers.Regex.IsMatch @root.Url.AbsolutePath @key "i"}}
			{{> pageMappingProperties}}
		{{/Helpers.Regex.IsMatch}}
	{{/each}}
}
// Branded zone specific logic
if (isBrandedZoneSite) {
	pageMakeGroup = '{{Helpers.String.Lowercase @root.Site.Settings.OemProgram.ParentCompany}}';

 // In Common page show oem program's make and Id
	if (eventType === 'standard_view') {
		{{#each @root.CustomDataModel.pageMappings}}
			{{#Helpers.Regex.IsMatch @root.Site.Settings.OemProgram.FolderPath @key "i"}}
				pageBrand = '{{this.pageMake}}';
				pageBrandId = '{{this.pageMakeId}}';
			{{/Helpers.Regex.IsMatch}}
		{{/each}}
	}
	 // for specific brand page
	{{#each @root.Site.Settings.OemProgram.OemBrands}}
		{{#Helpers.String.EndsWith (Helpers.String.Lowercase @root.Url.AbsolutePath) (Helpers.String.Lowercase Name)}}
			pageBrandId = '{{this.Id}}';
			pageBrand = '{{this.Name}}';
			pageSubType = `{{Helpers.String.Lowercase @root.Site.Settings.OemProgram.Name}} {{Helpers.String.Lowercase this.Name}} ${pageType}`;
		{{/Helpers.String.EndsWith}}
	{{/each}}
}

var siteUser = {
	tealium_event: eventType,
	{{#if @root.User.GeoLocation.City}}
		customer_city: '{{Helpers.String.Replace @root.User.GeoLocation.City "'" "\'"}}',
	{{/if}}  
	{{#if @root.User.GeoLocation.CountryName}}
		customer_country: '{{Helpers.String.Replace @root.User.GeoLocation.CountryName "'" "\'"}}',
	{{/if}}
	{{#if @root.User.GeoLocation.PostalCode}}
		customer_postal_code: '{{Helpers.String.Replace @root.User.GeoLocation.PostalCode "'" "\'"}}',
	{{/if}}
	{{#if @root.User.GeoLocation.Region}}
		customer_state: '{{Helpers.String.Replace @root.User.GeoLocation.Region "'" "\'"}}',
	{{/if}}
	{{#if @root.User.GeoLocation.CountryCode}}
		customer_country_code: '{{Helpers.String.Replace @root.User.GeoLocation.CountryCode "'" "\'"}}',
	{{/if}}	
	customer_language_code: langCode.split('-')[0].toUpperCase(),
	{{#if @root.Page.Title}}
		page_title: '{{Helpers.String.Replace @root.Page.Title "'" "\'"}}',
		page_title_count: '{{Helpers.String.Replace @root.Page.Title "'" "\'"}}'.length.toString(),
	{{/if}}
	site_section: pageType,
	site_sub_section: pageSubType,
	site_platform: 'Dealer Spike',
	{{#each @root.Locations}} 
		{{#if this.IsPrimary}} 
			site_company_name: '{{#if this.ResolvedName}}{{Helpers.String.Replace this.ResolvedName "'" "\'"}}{{else}}{{Helpers.String.Replace this.Name "'" "\'"}}{{/if}}',
			site_phone_main : '{{Helpers.String.Replace this.Address.PhoneNumber "'" "\'"}}',
			site_company_city: '{{Helpers.String.Replace this.Address.City "'" "\'"}}',
			site_company_state: '{{Helpers.String.Replace this.Address.Region "'" "\'"}}',
			site_company_zip_code: '{{Helpers.String.Replace this.Address.PostalCode "'" "\'"}}', 
			site_country: '{{Helpers.String.Replace this.Address.CountryAbbreviation "'" "\'"}}',
		{{/if}} 
	{{/each}}
	
	{{#if @root.Site.Settings.OemProgram.IsActive}}
		site_id: '{{@root.Site.Settings.OemProgram.ParentSite.Id}}',
		{{#Helpers.Object.Compare @root.Site.Settings.OemProgram.ParentSite.PlatformType "=" @root.customDataModel.ProxyAccountPlatform.Spark}}
			site_internal_id: '{{Helpers.String.Replace @root.Site.Settings.OemProgram.ParentSite.FacilityId "'" "\'"}}',
		{{else}}
			site_internal_id: '{{@root.Site.Settings.OemProgram.ParentSite.Id}}'
		{{/Helpers.Object.Compare}}
	{{else}}
		site_id: '{{@root.Site.Id}}',
		site_internal_id: '{{Helpers.String.Replace @root.Site.FacilityId "'" "\'"}}',
	{{/if}}
}

if(piwikId) {
	siteUser.piwik_id = piwikId;
}

if(ga4Id) {
	siteUser.ga4_id = ga4Id;
}

{{#each @root.Site.SiteDefaultDataModel.OEMTrackingIds}}
    {{#Helpers.Object.Compare this.Oem.Name @root.CustomDataModel.OEMs.Polaris.Name}}
        {{#if this.trackingId}}
            siteUser.oem_polaris_id = '{{this.trackingId}}';
        {{/if}}
    {{/Helpers.Object.Compare}}
    
    {{#Helpers.Object.Compare this.Oem.Name @root.CustomDataModel.OEMs.Harley.Name}}
		{{#if this.trackingId}}
			siteUser.oem_harley_id = '{{this.trackingId}}';
		{{/if}}
	{{/Helpers.Object.Compare}}
	
	{{#Helpers.Object.Compare this.Oem.Name @root.CustomDataModel.OEMs.BMW.Name}}
		{{#if this.trackingId}}
			siteUser.oem_bmw_id = '{{this.trackingId}}';
		{{/if}}
	{{/Helpers.Object.Compare}}

	{{#Helpers.Object.Compare this.Oem.Name @root.CustomDataModel.OEMs.BRP.Name}}
		{{#if this.trackingId}}
			siteUser.oem_brp_id = '{{this.trackingId}}';
		{{/if}}
	{{/Helpers.Object.Compare}}

	{{#Helpers.Object.Compare this.Oem.Name @root.CustomDataModel.OEMs.Firestorm.Name}}
		{{#if this.trackingId}}
			siteUser.firestorm_dealer_id = '{{this.trackingId}}';
		{{/if}}
    {{/Helpers.Object.Compare}}
{{/each}}

if (siteUser.firestorm_dealer_id) {
    siteUser.firestorm_dealer_id = siteUser.firestorm_dealer_id.split(',');
}

// Create utag_data object
var utag_data = $.extend({}, siteUser);

if (pageType) utag_data.page_type = pageType;
if (pageSubType) utag_data.page_sub_type = pageSubType;
if (pageBrand) utag_data.page_make = pageBrand;
if (pageBrandId) utag_data.page_make_id = pageBrandId;
if (pageBrandCategory) utag_data.page_category = pageBrandCategory;
if (pageBrandCategoryId) utag_data.page_category_id = pageBrandCategoryId;
if (pageBrandSubCategory) utag_data.page_sub_category = pageBrandSubCategory;
if (pageBrandSubCategoryId) utag_data.page_sub_category_id = pageBrandSubCategoryId;
if (pageMakeGroup) utag_data.page_make_group = pageMakeGroup;

if (searchKeyword) utag_data.search_keyword = searchKeyword;
if (searchPageAppliedFilters.length > 0) utag_data.search_filters = searchPageAppliedFilters;

window.TealiumConfig = {
  // Core variables
  tealiumEnvironment: tealiumEnvironment,
  tealiumProfile: tealiumProfile,
  piwikId: piwikId,
  ga4Id: ga4Id,
  isExternalBrandedZoneSite: isExternalBrandedZoneSite,
  isBrandedZoneSite: isBrandedZoneSite,
  absolutePath: absolutePath,
  parentSitePlatformType: parentSitePlatformType,
  
  // Page variables
  langCode: langCode,
  searchPageAppliedFilters: searchPageAppliedFilters,
  searchKeyword: searchKeyword,
  pageType: pageType,
  pageSubType: pageSubType,
  eventType: eventType,
  pageBrand: pageBrand,
  pageBrandId: pageBrandId,
  pageBrandCategory: pageBrandCategory,
  pageBrandCategoryId: pageBrandCategoryId,
  pageBrandSubCategory: pageBrandSubCategory,
  pageBrandSubCategoryId: pageBrandSubCategoryId,
  pageMakeGroup: pageMakeGroup,
  
  // Data objects
  siteUser: siteUser,
  productInfo: productInfo,
  brandPromotionInfo: brandPromotionInfo,
  loadedProductInfo: loadedProductInfo,
  
  // Functions
  loadTealiumScript: loadTealiumScript,
  
  // Constants
  referenceError: referenceError
};

$(document).ready(function () {
	console.log('Global Tealium Tracking: DOM ready, initializing analytics system');
	if (window.analyticsManager && window.analyticsManager.initialize) {
		try {
			window.analyticsManager.initialize(window.TealiumConfig);
			console.log('Global Tealium Tracking: System initialized successfully');
		} catch (error) {
			console.error('Failed to initialize Global Tealium Tracking:', error);
		}
	} else {
		console.warn('Global Tealium Tracking: Analytics Manager not found');
	}
});
</script>

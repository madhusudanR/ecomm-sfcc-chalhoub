
'use strict';

var Site = require('dw/system/Site');
var ProductMgr = require('dw/catalog/ProductMgr');
var Locale = require('dw/util/Locale');
var URLUtils = require('dw/web/URLUtils');
var Logger = require('dw/system/Logger').getLogger('deliveryFulfillment', 'helper');

const VALID_TIERS = {
    SAME_DAY: true,
    NEXT_DAY: true,
    STANDARD: true
};

const transformImage = {
    scaleWidth: 500,
    scaleHeight: 500,
    format: 'jpg'
};

/**
 * Checks whether delivery fulfilment is enabled for the current site.
 *
 * @returns {boolean} True when the feature is enabled
 */
function isDeliveryFulfillmentEnabled() {
    return Site.getCurrent().getCustomPreferenceValue('enableDeliveryFulfillment') === true;
}

/**
 * Checks whether a product can be used for delivery fulfilment.
 *
 * @param {dw.catalog.Product} product Product to validate
 * @returns {boolean} True when eligible
 */
function isEligibleProduct(product) {
    return !!product &&
        product.isOnline() &&
        !product.isMaster() &&
        !product.isProductSet() &&
        !product.isBundle();
}

/**
 * Creates a consistent failure response.
 *
 * @param {string} errorCode Internal error code
 * @returns {Object} Safe error result
 */
function createErrorResult(errorCode) {
    return {
        enabled: false,
        success: false,
        error: true,
        errorCode: errorCode,
        deliveryInfo: null
    };
}

/**
 * Gets delivery information for an eligible product.
 *
 * @param {string} productId Product ID
 * @param {Object} req SFRA request object
 * @returns {Object} Delivery information or a safe error result
 */
function getDeliveryInfo(productId, req) {
    if (!isDeliveryFulfillmentEnabled()) {
        return {
            enabled: false,
            success: false,
            error: false,
            deliveryInfo: null
        };
    }

    if (!req || !req.locale || !req.locale.id) {
        return createErrorResult('locale_unavailable');
    }

    var product = ProductMgr.getProduct(productId);

    if (!isEligibleProduct(product)) {
        return createErrorResult('invalid_product');
    }

    var locale = Locale.getLocale(req.locale.id);
    var countryCode = locale ? locale.getCountry() : '';

    if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) {
        return createErrorResult('country_unavailable');
    }

    try {
        var fulfillmentService = require('*/cartridge/scripts/services/fulfillmentService');
        var result = fulfillmentService.getTier(product.ID, countryCode.toUpperCase());

        if (!result || !result.ok || !VALID_TIERS[result.tier]) {
            return createErrorResult('fulfillment_unavailable');
        }

        return {
            enabled: true,
            success: true,
            error: false,
            deliveryImage: URLUtils.staticURL('/images/truck.png').toString(),
            deliveryInfo: {
                tier: result.tier
            }
        };
    } catch (e) {
        Logger.error(
            'Delivery fulfilment lookup failed for product {0}: {1}',
            productId,
            e.message
        );

        return createErrorResult('fulfillment_unavailable');
    }
}

module.exports = {
    isDeliveryFulfillmentEnabled: isDeliveryFulfillmentEnabled,
    getDeliveryInfo: getDeliveryInfo
};

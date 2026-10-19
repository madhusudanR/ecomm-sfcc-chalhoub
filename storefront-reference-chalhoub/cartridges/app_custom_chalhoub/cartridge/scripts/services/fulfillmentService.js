
'use strict';

var serviceInit = require('*/cartridge/scripts/services/serviceInit');
var Logger = require('dw/system/Logger').getLogger('deliveryFulfillment', 'service');

var VALID_TIERS = {
    SAME_DAY: true,
    NEXT_DAY: true,
    STANDARD: true
};

/**
 * Retrieves the fulfilment tier for a product and country.
 *
 * @param {string} productId Product SKU or ID
 * @param {string} country Two-letter country code
 * @returns {Object} Normalized fulfilment service response
 */
function getTier(productId, country) {
    try {
        var service = serviceInit.deliveryFulfillmentService;
        var result = service.call({
            sku: productId,
            country: country.toUpperCase()
        });

        if (!result || !result.ok || !result.object) {
            Logger.warn(
                'Fulfilment service call failed for product {0}.',
                productId
            );

            return {
                ok: false,
                errorCode: 'service_unavailable'
            };
        }

        var response = result.object;

        // Support a service response already normalized by parseResponse.
        if (!response.ok || !VALID_TIERS[response.tier]) {
            return {
                ok: false,
                errorCode: 'invalid_service_response'
            };
        }

        return {
            ok: true,
            tier: response.tier,
            sku: response.sku || productId,
            country: response.country || country.toUpperCase()
        };
    } catch (e) {
        Logger.error(
            'Unexpected fulfilment service error for product {0}: {1}',
            productId,
            e.message
        );

        return {
            ok: false,
            errorCode: 'service_error'
        };
    }
}

module.exports = {
    getTier: getTier
};

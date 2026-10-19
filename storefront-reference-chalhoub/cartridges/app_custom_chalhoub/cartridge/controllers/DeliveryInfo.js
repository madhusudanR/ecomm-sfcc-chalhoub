
'use strict';

var server = require('server');
var Logger = require('dw/system/Logger').getLogger('deliveryFulfillment', 'controller');
var cache = require('*/cartridge/scripts/middleware/cache');
var deliveryHelper = require('*/cartridge/scripts/helpers/deliveryFulfillment');

/**
 * Render delivery information for a product.
 */
server.get('Get', cache.applyDefaultCache, function (req, res, next) {
    var viewData = {
        enabled: false,
        deliveryInfo: {},
        error: false
    };

    try {
        var productId = req.querystring.pid;
        productId = productId.trim();

        var result = deliveryHelper.getDeliveryInfo(productId, req);
        if (result && result.enabled && result.deliveryInfo) {
            viewData = result;
        } else if (result) {
            viewData = result;
            viewData.enabled = false;
        }

        res.render('product/deliveryDetails', viewData);
    } catch (error) {
        Logger.error('Unable to retrieve delivery information for product {0}. Error: {1}', productId || 'unknown', error.toString());

        viewData = {
            enabled: false,
            deliveryInfo: {},
            error: true
        };

        res.render('product/deliveryDetails', viewData);
    }

    return next();
});

module.exports = server.exports();

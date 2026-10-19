
'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var StringUtils = require('dw/util/StringUtils');

/**
 * Creates and returns the delivery fulfilment service.
 *
 * Configure the service profile and credentials in Business Manager.
 *
 * @returns {dw.svc.Service} Configured fulfilment service
 */
function createDeliveryFulfillmentService() {
    return LocalServiceRegistry.createService('fulfillment.free.beeceptor.get', {
        /**
         * Builds the outbound HTTP request.
         *
         * @param {dw.svc.HTTPService} service Service instance
         * @param {Object} args Request parameters
         * @returns {string|null} Request body
         */
        createRequest: function (service, args) {
            if (!args || !args.sku || !args.country) {
                throw new Error('Missing fulfilment request parameters');
            }

            service.setRequestMethod('GET');
            service.addHeader('Accept', 'application/json');

            // Configure Basic Auth in Business Manager when possible.
            // Do not manually add Authorization if service authentication
            // is already configured to use Basic authentication.
            var credential = service.getConfiguration().getCredential();

            if (credential && credential.getUser() !== null &&
                credential.getPassword() !== null) {
                var credentials = credential.getUser() + ':' + credential.getPassword();

                service.addHeader(
                    'Authorization',
                    'Basic ' + StringUtils.encodeBase64(credentials)
                );
            }

            var url = service.getURL();
            var separator = url.indexOf('?') === -1 ? '?' : '&';
            var queryParams = 'sku=' + encodeURIComponent(args.sku) +
                '&country=' + encodeURIComponent(args.country);

            service.setURL(url + separator + queryParams);

            return null;
        },

        /**
         * Parses and validates the response.
         *
         * @param {dw.svc.HTTPService} service Service instance
         * @param {dw.net.HTTPClient} client HTTP response
         * @returns {Object} Parsed fulfilment response
         */
        parseResponse: function (service, client) {
            if (client.statusCode < 200 || client.statusCode >= 300) {
                return {
                    ok: false,
                    errorCode: 'http_error',
                    statusCode: client.statusCode
                };
            }

            var response;

            try {
                response = JSON.parse(client.text);
            } catch (e) {
                return {
                    ok: false,
                    errorCode: 'invalid_json'
                };
            }

            return {
                ok: true,
                sku: response.sku,
                country: response.country,
                tier: response.tier
            };
        },

        /**
         * Returns a deterministic mock response when mock mode is enabled.
         *
         * @param {Object} service Service instance
         * @param {Object} args Request parameters
         * @returns {Object} Mock HTTP response
         */
        mockCall: function (service, args) {
            return {
                statusCode: 200,
                statusMessage: 'OK',
                text: JSON.stringify({
                    sku: args && args.sku ? args.sku : 'MOCK-SKU',
                    country: args && args.country ? args.country : 'US',
                    tier: 'NEXT_DAY'
                })
            };
        },

        filterLogMessage: function (message) {
            return message;
        }
    });
}

/**
 * Lazily creates the service and returns its instance.
 */
var deliveryFulfillmentService = createDeliveryFulfillmentService();

module.exports = {
    deliveryFulfillmentService: deliveryFulfillmentService
};

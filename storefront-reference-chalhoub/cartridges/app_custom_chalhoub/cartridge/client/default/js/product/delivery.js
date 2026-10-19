
'use strict';

var updateDeliveryInfo = function () {
    $('body').on('product:afterAttributeSelect', function (e, response) {
        var $deliveryContainer = $('.delivery-details');

        if (!$deliveryContainer.length || !response || !response.data || !response.data.product) {
            return;
        }

        var productId = response.data.product.id;
        var url = $deliveryContainer.data('url');

        if (!url || !productId) {
            return;
        }

        $.spinner().start();

        $.ajax({
            url: url,
            type: 'GET',
            data: {
                pid: productId
            },
            success: function (data) {
                $deliveryContainer.html(data);
            },
            error: function () {
                $deliveryContainer.empty();
            },
            complete: function () {
                $.spinner().stop();
            }
        });
    });
};

module.exports = {
    updateDeliveryInfo: updateDeliveryInfo
};

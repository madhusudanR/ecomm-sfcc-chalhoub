# app_custom_chalhoub — Delivery & Fulfillment Cartridge

A custom Salesforce B2C Commerce (SFCC) cartridge that extends Storefront Reference Architecture (SFRA) with delivery and fulfillment information on the Product Detail Page (PDP).

The intended flow is:

1. The PDP identifies the selected product/variant.
2. A controller endpoint receives the product identifier and, where applicable, a delivery-country selection.
3. A helper validates the product, feature flag, country, and service response.
4. An SFCC HTTP service calls the configured fulfillment endpoint.
5. The response is normalized to one of three supported tiers: `SAME_DAY`, `NEXT_DAY`, or `STANDARD`.
6. The PDP renders or asynchronously updates the matching delivery card.
7. If the feature is disabled or the service fails, the PDP continues to work without delivery content.

> **Implementation note:** This README documents the intended architecture from the supplied project outline. Confirm the actual filenames, endpoint names, response shape, and build scripts in your repository before treating the commands and examples as verified. SFCC service mocking normally requires mock mode to be configured; it is not an automatic fallback merely because a live endpoint fails.

## Contents

- [Features](#features)
- [Cartridge structure](#cartridge-structure)
- [Request flow](#request-flow)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Business Manager configuration](#business-manager-configuration)
- [Fulfillment API contract](#fulfillment-api-contract)
- [Frontend integration](#frontend-integration)
- [Build](#build)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security and operational guidance](#security-and-operational-guidance)

## Features

- Delivery tiers: `SAME_DAY`, `NEXT_DAY`, and `STANDARD`.
- SFCC `LocalServiceRegistry` integration for an external HTTP endpoint.
- Feature-flag support through a site custom preference.
- Server-side validation and normalized service responses.
- ISML delivery card and responsive SCSS styling.
- Asynchronous refresh support for variant changes and optional delivery-country/postal-code interactions.
- Graceful failure behavior so delivery lookup problems do not block core PDP functionality.
- Service mocking support for deterministic development and testing.

## Cartridge structure

Expected structure based on the supplied project outline:

```text
cartridges/
└── app_custom_chalhoub/
    ├── cartridge/
    │   ├── client/default/
    │   │   ├── js/
    │   │   │   ├── product/delivery.js
    │   │   │   └── productDetail.js
    │   │   └── scss/product/
    │   │       ├── detail.scss
    │   │       └── _delivery.scss
    │   ├── controllers/
    │   │   └── DeliveryInfo.js
    │   ├── scripts/
    │   │   ├── helpers/deliveryFulfillment.js
    │   │   └── services/
    │   │       ├── fulfillmentService.js
    │   │       └── serviceInit.js
    │   ├── static/default/        # Compiled assets, depending on build setup
    │   └── templates/
    │       ├── default/product/
    │       │   ├── deliveryDetails.isml
    │       │   └── productDetails.isml
    │       └── resources/product.properties
    └── package.json
```

The exact static asset output directories depend on the cartridge's build configuration. Follow the existing project's conventions for compiled assets and asset manifests.

## Request flow

```text
PDP / selected variant
        |
        v
DeliveryInfo controller endpoint
        |
        v
deliveryFulfillment helper
  - feature flag
  - product eligibility
  - country validation
        |
        v
fulfillmentService
        |
        v
LocalServiceRegistry service
        |
        v
External fulfillment API or configured mock
        |
        v
Validate and normalize tier
        |
        v
ISML response / AJAX fragment
        |
        v
Delivery card on PDP
```

## Prerequisites

- Access to an SFCC B2C Commerce sandbox or environment.
- An SFRA storefront and a compatible cartridge path.
- Node.js and npm versions compatible with the project's build tooling.
- An endpoint and credentials for the fulfillment API, or a mock endpoint for development.
- Business Manager access to configure site preferences and services.

## Installation

1. Place `app_custom_chalhoub` under the project's `cartridges/` directory.
2. Install dependencies from the cartridge root:

   ```bash
   npm install
   ```

3. Add the cartridge to the site's cartridge path in Business Manager. For example:

   ```text
   app_custom_chalhoub:app_storefront_base
   ```

   Preserve existing cartridges and ordering. Custom overrides must appear before the cartridges they override.

4. Configure the service and feature flag as described below.
5. Build client assets and deploy the cartridge using your team's normal SFCC workflow.
6. Open an eligible PDP and verify the delivery component.

> Do not replace an existing cartridge path with the example above unless it represents the complete path required by your site.

## Business Manager configuration

### Site preference

Create a site custom preference with the exact ID expected by the helper:

- **ID:** `enableDeliveryFulfillment`
- **Type:** Boolean
- **Purpose:** Enables or disables delivery fulfilment for the current site.

The helper should fail closed when this preference is unset or `false`.

### Service configuration

The service ID used by `LocalServiceRegistry.createService(...)` must match the service ID configured in Business Manager. The supplied outline mentions `chalhoub.fulfillment.service`, while earlier code examples used other IDs. Choose one ID and use it consistently in code and Business Manager.

Configure:

- **Service ID:** e.g. `chalhoub.fulfillment.service`
- **Service type:** HTTP
- **Endpoint URL:** full base URL and endpoint path, e.g. `https://<mock-host>/fulfillment`
- **Authentication:** Basic authentication if required
- **Credentials:** store username/password in the SFCC service credential, not source code
- **Timeouts:** choose suitable connection and socket timeouts
- **Mock mode:** enable only in development/test when testing deterministic mock responses

If Basic authentication is configured natively in Business Manager, do not add a second `Authorization` header in code. If constructing the header manually, verify the credential API and Base64 encoding for the target SFCC runtime. Never log credentials or authorization headers.

### Country source

Use a trusted country source. The request locale may provide a country for locale IDs such as `en_US`, but it is not necessarily the customer's shipping destination. If availability depends on delivery address, use the selected shipping address country or an explicit, validated country selection.

## Fulfillment API contract

Example request:

```http
GET /fulfillment?sku=<SKU>&country=<ISO-3166-1-alpha-2>
Accept: application/json
Authorization: Basic <credentials>
```

Example success response:

```json
{
  "sku": "701642819455M",
  "country": "US",
  "tier": "NEXT_DAY"
}
```

Supported `tier` values:

| Tier | Example PDP copy |
|---|---|
| `SAME_DAY` | Same-day delivery |
| `NEXT_DAY` | Next-day delivery |
| `STANDARD` | Standard delivery |

The service wrapper should reject non-2xx HTTP responses, malformed JSON, missing tiers, and unsupported tier values. The UI should not display a delivery card for an invalid or failed response.

### Mock response

A deterministic mock may return:

```json
{
  "sku": "MOCK-SKU",
  "country": "US",
  "tier": "SAME_DAY"
}
```

SFCC `mockCall` is used when service mocking is enabled/configured. It is not automatic failover when the real service times out or returns HTTP 500. To test failures, configure a mock response or mock endpoint that deliberately delays or returns an error, then verify the application handles the result safely.

## Frontend integration

- `DeliveryInfo.js` exposes the endpoint used by PDP JavaScript.
- `product/delivery.js` requests delivery information and updates the delivery component.
- `productDetail.js` integrates the delivery module into the PDP client entry point.
- `deliveryDetails.isml` renders tier-specific content.
- `_delivery.scss` defines responsive component styles.
- `product.properties` contains localized labels and fallback text.

Confirm the actual endpoint name (for example, `DeliveryInfo-GetDetails`) in the controller and use the matching URL in ISML or JavaScript. On variant selection, request delivery information for the selected variant SKU rather than a master product ID. Avoid duplicate requests and prevent stale AJAX responses from overwriting the currently selected variant's result.

For accessibility, use meaningful text, avoid relying on color or icons alone, and ensure the widget remains usable on mobile. The widget should be optional so service latency or failure does not block adding a product to the cart.

## Build

Run these commands from the cartridge root only if the corresponding scripts exist in `package.json`:

```bash
npm install
npm run compile
```

If `compile` is not defined, inspect available scripts:

```bash
npm run
```

Some SFRA repositories use scripts such as `compile:js`, `compile:scss`, or a top-level build command. Use scripts actually defined in the repository.

After compilation, deploy using your team's established SFCC-compatible workflow. Do not manually edit compiled assets if they are generated from source files.

## Testing

### Service tests

- Verify the service ID matches between code and Business Manager.
- Test valid responses for `SAME_DAY`, `NEXT_DAY`, and `STANDARD`.
- Test invalid JSON, missing/unsupported tier, HTTP 500, timeout, and connection failure.
- Confirm mock mode returns the expected response when enabled.
- Confirm credentials and authorization headers never appear in logs.

### Helper/controller tests

- Feature preference disabled.
- Missing or invalid product ID.
- Master, bundle, product set, offline, and out-of-stock variants according to business rules.
- Missing or invalid country.
- Service success and failure.
- Unexpected exception.
- Consistent view-data shape and graceful failure behavior.

### PDP functional tests

1. Open a PDP for an eligible product.
2. Verify the widget appears only when fulfilment is enabled and the service returns a valid tier.
3. Change size/color and confirm the selected variant's estimate refreshes.
4. Verify each tier's copy and styling.
5. Simulate a slow service and ensure the PDP remains usable.
6. Simulate an error and confirm the widget is hidden or displays the approved fallback.
7. Inspect browser Network and Console panels for failed requests and JavaScript errors.
8. Test responsive layouts and accessibility.

Use a non-production environment or controlled mock to simulate failures. Do not alter production credentials to force errors.

## Troubleshooting

| Symptom | Checks |
|---|---|
| Widget never appears | Check site preference, product eligibility, controller response, and tier value. |
| Service call fails | Check service ID, endpoint URL, credentials, network access, timeout, and response format. |
| Mock response is not used | Confirm mock mode/configuration is enabled and `mockCall` returns a supported response shape for the SFCC runtime. |
| Wrong country is sent | Check whether the implementation uses request locale or the actual shipping destination. |
| Wrong variant's estimate appears | Ensure selected variant SKU is sent and stale AJAX responses are ignored. |
| Styles are missing | Check SCSS import, build output, asset manifest, deployment, and browser cache. |
| JavaScript does not run | Confirm PDP entry point imports/initializes `delivery.js` and exposes the endpoint URL to the client. |
| Build command fails | Run `npm run` and use scripts defined in `package.json`. |

## Security and operational guidance

- Never hardcode API credentials in source control.
- Do not log credentials, authorization headers, or sensitive address data.
- Validate product identifiers, country codes, response status, JSON, and tier values server-side.
- Set appropriate service timeouts and ensure fulfilment latency does not block core shopping.
- Cache only when the cache key and invalidation policy account for SKU, country, inventory, and other inputs affecting the result.
- Do not cache personalized or destination-specific responses in a shared page cache unless the cache configuration varies by all relevant inputs.
- Keep the feature flag available for rollback.
- Keep service IDs and controller routes consistent across code, Business Manager, templates, and JavaScript.

## Implementation checklist

- [ ] Cartridge is in the site cartridge path.
- [ ] `enableDeliveryFulfillment` site preference exists and is configured.
- [ ] Service ID matches between code and Business Manager.
- [ ] Service URL, authentication, timeout, and mock settings are configured.
- [ ] Country source matches the business requirement.
- [ ] Only supported delivery tiers are accepted.
- [ ] PDP sends the selected variant SKU.
- [ ] AJAX route and frontend endpoint match.
- [ ] SCSS and JavaScript are built and deployed.
- [ ] Error, timeout, mock, and responsive behavior have been tested.

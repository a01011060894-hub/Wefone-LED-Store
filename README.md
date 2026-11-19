# WeFone LED website

Arabic, right-to-left LED product catalog, project calculator, and WhatsApp order flow. Hosted as a static GitHub Pages site.

## Products and images

The site includes all 64 products from the 2026 workbook and nine generated illustrative category images. Tap the WeFone logo five times to open store settings. Product prices, specifications, image URLs, and new products are edited in the private management spreadsheet linked there. Use public HTTPS image URLs or the category illustrations in `images/products/`.

## Customer orders

`Code.gs` is the bound Google Apps Script backend. It stores catalog rows, order summaries, and per-item details in a private spreadsheet. The public web app exposes only product catalog rows through GET and accepts order submissions through POST; it does not return customer records. Formula-like user text is escaped before it is written to Sheets.

`appsscript.json` requests the current bound spreadsheet and external HTTP scopes. The public product source CSV is imported into the private catalog tab during `setupOrderSheets()`. Customer order tabs remain private.

## Hosting

GitHub Pages publishes the repository root from the `main` branch through `.github/workflows/deploy.yml`. The duplicate Jekyll Pages workflow was removed to prevent artifact conflicts.


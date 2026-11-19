# WeFone LED website

Arabic, right-to-left LED product catalog, project calculator, and WhatsApp order flow. Hosted as a static GitHub Pages site.

## Product catalog

The product catalog is based on the 64-row 2026 price workbook. Category-level illustrative product images are stored in `images/products/`. Replace them with exact model photos when available. Five quick taps on the WeFone logo opens store settings; product, price, specification, and public image URL changes are managed in the linked Google Sheets catalog. Browser-only editor changes are saved in that browser and are not published to all visitors.

## Customer order data

`Code.gs` is the Google Apps Script backend. It reads the public product catalog from the linked workbook and saves customer orders to a separate private spreadsheet created by `setupOrderSheets()`. It never returns customer/order rows to website visitors.

To finish setup:

1. Open [script.google.com](https://script.google.com) using the Google account that owns the catalog spreadsheet and create a project.
2. Paste `Code.gs` into the editor and save.
3. Run `setupOrderSheets()` once and authorize Google Sheets access. The execution log returns the URL of the new private order spreadsheet. Leave that spreadsheet private.
4. Deploy the script as a web app that executes as you, with access set to anyone. This makes the website able to append order requests; the script only exposes the product catalog through GET and accepts order submissions through POST.
5. Copy the web app URL and the private order spreadsheet ID into `ORDERS_WEB_APP_URL` and `PRIVATE_ORDER_BOOK_ID` near the top of the inline script in `index.html`.
6. Commit and push the updated `index.html` to GitHub Pages.

Do not place the order spreadsheet ID in the Apps Script response, and do not change the private order spreadsheet's sharing setting. Owner access is available through the five-tap settings link after the ID is filled in.

## Website deployment

GitHub Pages publishes the repository root from the `main` branch using the included GitHub Actions workflow.


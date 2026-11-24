# WeFone LED — merged storefront

- The uploaded bilingual/light-theme storefront is the base.
- The merged catalog retains 66 product records: the 64 GitHub product IDs plus the two Hub P10 module records.
- The uploaded catalog supplies bilingual names/specifications and product-specific image paths; GitHub fields fill any missing values.
- Browser catalog migration reads both `wefone_custom_products_v66_webp` and the former `wefone_custom_products_v3` key. Local price/name edits and custom products are retained; generic placeholder image paths are upgraded to the product-specific image path where available.
- Exact pre-merge copies are in `backups/`.

## Google Sheets integration
The storefront retains the Apps Script URL supplied with the uploaded version and the `sync_all_products` / `new_order` actions. POST uses `text/plain;charset=utf-8` carrying a JSON body, compatible with Apps Script parsing of `e.postData.contents` without an application/json preflight. The `no-cors` response is opaque, so the browser cannot verify that the sheet wrote the record; confirm writes in the Products and Orders tabs.

The currently described Products schema lacks `name_en`, `unit_en`, and `specs_en`; add these columns to the Apps Script schema before expecting bilingual data to round-trip. The existing script's `clearContents()` behavior should not be used against a sheet with extra or unbacked data.

## PWA
The app now loads a hosted manifest and `sw.js`; it no longer registers a Blob URL as a service worker. GitHub Pages serves the site over HTTPS.

## Items not silently changed
The pricing rates, installation choices, engineering assumptions, and admin PIN were left as in the uploaded source. The admin PIN is client-side and is not secure authentication. Validate module/cabinet geometry, processor limits, installation pricing, and backend write permissions before relying on it for live quotations or production administration.

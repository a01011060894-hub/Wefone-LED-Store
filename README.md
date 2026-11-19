# WeFone LED website

Arabic, right-to-left product catalog and LED project calculator. This is a static website and can be hosted with GitHub Pages.

## Publish with GitHub Pages

1. Create a GitHub repository and upload the contents of this folder to its root.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. GitHub Pages will show the public site URL after deployment completes.

The store and calculator run in visitors' browsers. Cart contents and submitted order history are kept only in that browser's local storage. Sending an order opens WhatsApp with a prefilled message; the order is not written to a central database. Product editing has been disabled in this public build because a secret embedded in a static HTML file cannot be kept private.

## Product images

The catalog includes SVG fallback illustrations. Optional product images can be placed in `images/` using the filenames referenced by the catalog in `index.html`.

## External assets

Tailwind CSS is loaded from its CDN and the Cairo font is loaded from Google Fonts, so those two visual assets require an internet connection.

const SPREADSHEET_ID = "1oOMsgkZXoc-xHBYN2PuyMuu1PzcWQE6rl9SHaU_6NKk";
const CATALOG_SHEET = "كتالوج الأسعار والصور (64)";
const ORDERS_SHEET = "سجل الطلبات والمورد";
const ORDER_ITEMS_SHEET = "تفاصيل الطلبات";
const CUSTOMER_SAR_RATE = 1.02;
const ORDER_BOOK_ID_PROPERTY = "WEFONE_PRIVATE_ORDER_BOOK_ID";

function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== "catalog") {
    return jsonOutput_({ ok: false, message: "Not found" });
  }

  const products = readCatalog_();
  const callback = String(e.parameter.callback || "");
  if (callback && /^[A-Za-z_$][\w$.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(products) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonOutput_(products);
}

function doPost(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    if (params.action !== "order") return jsonOutput_({ ok: false, message: "Unsupported action" });

    const order = JSON.parse(params.payload || "{}");
    if (order.website) return jsonOutput_({ ok: false, message: "Rejected" });
    validateOrder_(order);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const orderBookId = PropertiesService.getScriptProperties().getProperty(ORDER_BOOK_ID_PROPERTY);
      if (!orderBookId) throw new Error("Order book is not initialized; run setupOrderSheets first");
      const ss = SpreadsheetApp.openById(orderBookId);
      const ordersSheet = getOrCreateSheet_(ss, ORDERS_SHEET, [
        "رقم الطلب", "التاريخ والوقت", "اسم العميل", "جوال العميل", "المدينة / الشحن",
        "الأصناف المطلوبة", "سعر البيع للعميل (SAR)", "تكلفة المورد (AED)",
        "صافي الربح التقديري (AED)", "رابط واتساب المورد"
      ]);
      const detailSheet = getOrCreateSheet_(ss, ORDER_ITEMS_SHEET, [
        "رقم الطلب", "التاريخ والوقت", "اسم العميل", "جوال العميل", "الشحن والمدينة",
        "كود المنتج", "اسم الصنف", "الكمية", "المقاس والتفاصيل الفنية",
        "سعر الوحدة للعميل (SAR)", "سعر الوحدة للمورد (AED)",
        "إجمالي الصنف للعميل (SAR)", "إجمالي الصنف للمورد (AED)"
      ]);

      if (orderAlreadySaved_(ordersSheet, order.orderId)) return jsonOutput_({ ok: true, duplicate: true });

      const items = order.items.map(item => normalizeItem_(item));
      const totalCustomerSAR = items.reduce((sum, item) => sum + item.customerLineSAR, 0);
      const totalSupplierAED = items.reduce((sum, item) => sum + item.supplierLineAED, 0);
      const estimatedProfitAED = totalCustomerSAR / CUSTOMER_SAR_RATE - totalSupplierAED;
      const supplierMessage = buildSupplierMessage_(order, items, totalSupplierAED);
      const supplierUrl = "https://wa.me/201011060894?text=" + encodeURIComponent(supplierMessage);
      const now = new Date();
      const destination = cleanText_(order.shippingDestination, 180) +
        (order.cityAndNotes ? " — " + cleanText_(order.cityAndNotes, 240) : "");
      const itemSummary = items.map(item => item.productName + " ×" + item.quantity +
        (item.details ? " (" + item.details + ")" : "")).join(" | ");

      ordersSheet.appendRow([
        cleanText_(order.orderId, 32), now, cleanText_(order.customerName, 120),
        cleanPhone_(order.customerPhone), destination,
        itemSummary, Math.round(totalCustomerSAR), Math.round(totalSupplierAED),
        Math.round(estimatedProfitAED), supplierUrl
      ]);

      const detailRows = items.map(item => [
        cleanText_(order.orderId, 32), now, cleanText_(order.customerName, 120),
        cleanPhone_(order.customerPhone), destination, item.productId,
        item.productName, item.quantity, item.details,
        Math.round(item.customerUnitSAR), Math.round(item.supplierUnitAED),
        Math.round(item.customerLineSAR), Math.round(item.supplierLineAED)
      ]);
      detailSheet.getRange(detailSheet.getLastRow() + 1, 1, detailRows.length, detailRows[0].length)
        .setValues(detailRows);

      return jsonOutput_({ ok: true, orderId: order.orderId });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonOutput_({ ok: false, message: String(error && error.message || error) });
  }
}

// Run once from the Apps Script editor. This creates a new private spreadsheet for customer data.
function setupOrderSheets() {
  const props = PropertiesService.getScriptProperties();
  let orderBookId = props.getProperty(ORDER_BOOK_ID_PROPERTY);
  let ss;
  if (orderBookId) {
    ss = SpreadsheetApp.openById(orderBookId);
  } else {
    ss = SpreadsheetApp.create("WeFone LED - سجل الطلبات الخاص");
    orderBookId = ss.getId();
    props.setProperty(ORDER_BOOK_ID_PROPERTY, orderBookId);
  }
  getOrCreateSheet_(ss, ORDERS_SHEET, [
    "رقم الطلب", "التاريخ والوقت", "اسم العميل", "جوال العميل", "المدينة / الشحن",
    "الأصناف المطلوبة", "سعر البيع للعميل (SAR)", "تكلفة المورد (AED)",
    "صافي الربح التقديري (AED)", "رابط واتساب المورد"
  ]);
  getOrCreateSheet_(ss, ORDER_ITEMS_SHEET, [
    "رقم الطلب", "التاريخ والوقت", "اسم العميل", "جوال العميل", "الشحن والمدينة",
    "كود المنتج", "اسم الصنف", "الكمية", "المقاس والتفاصيل الفنية",
    "سعر الوحدة للعميل (SAR)", "سعر الوحدة للمورد (AED)",
    "إجمالي الصنف للعميل (SAR)", "إجمالي الصنف للمورد (AED)"
  ]);
  const url = ss.getUrl();
  console.log("Private order spreadsheet: " + url);
  return "تم تجهيز ملف الطلبات الخاص: " + url;
}

function readCatalog_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CATALOG_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getDisplayValues();
  return values.filter(row => row[1] && row[3]).map(row => {
    const id = String(row[1]).trim();
    const categoryName = String(row[2] || "");
    const unit = String(row[4] || "قطعة");
    const slug = categorySlug_(categoryName, id);
    const enteredImage = String(row[9] || "").trim();
    const imageCategory = { posters: "poster", modules: "module", controllers: "controller" }[slug] || slug;
    const image = /^https:\/\//i.test(enteredImage)
      ? enteredImage
      : "images/products/" + (id.startsWith("LT-116") ? "television" : imageCategory) + ".svg";
    return {
      id: id, cat: id.startsWith("LT-116") ? "televisions" : slug,
      img: image, zoom: 100, posX: 50, posY: 50,
      name: String(row[3]), unit: unit, soldBySqm: /متر مربع/.test(unit),
      marketAED: Number(String(row[5]).replace(/,/g, "")) || 0,
      resellerAED: Number(String(row[7]).replace(/,/g, "")) || 0,
      specs: String(row[10] || "")
    };
  });
}

function categorySlug_(name, id) {
  if (id.startsWith("IS-")) return "indoor";
  if (id.startsWith("OS-")) return "outdoor";
  if (id.startsWith("ORS-") || id.startsWith("IRS-") || id.startsWith("TRS-")) return "rental";
  if (id.startsWith("IFS-")) return "flexible";
  if (id.startsWith("LP-")) return "posters";
  if (id.startsWith("SB-") || id.startsWith("OPS-") || id.startsWith("K-") || id.startsWith("AI-")) return "smartboard";
  if (id.startsWith("MOD-") || id.startsWith("PSU-") || id.startsWith("PA-") || id.startsWith("SSR-") || id.startsWith("FLIGHT-") || id.startsWith("HANGING-")) return "modules";
  if (id.startsWith("LT-116")) return "televisions";
  if (/داخلية/.test(name)) return "indoor";
  if (/خارجية/.test(name)) return "outdoor";
  if (/تأجير/.test(name)) return "rental";
  if (/مرنة/.test(name)) return "flexible";
  if (/سبور|كاميرا|ستاند|OPS/.test(name)) return "smartboard";
  if (/موديول|باور|لوحة|حساس|صندوق|مسطرة/.test(name)) return "modules";
  return "controllers";
}

function normalizeItem_(item) {
  const quantity = Math.max(1, Math.min(10000, Number(item.quantity) || 1));
  const customerUnitAED = Math.max(0, Number(item.customerUnitAED) || 0);
  const supplierUnitAED = Math.max(0, Number(item.supplierUnitAED) || 0);
  return {
    productId: cleanText_(item.productId || "PROJECT", 80),
    productName: cleanText_(item.productName, 180), quantity,
    details: cleanText_(item.details, 1500),
    customerUnitSAR: customerUnitAED * CUSTOMER_SAR_RATE,
    supplierUnitAED: supplierUnitAED,
    customerLineSAR: customerUnitAED * quantity * CUSTOMER_SAR_RATE,
    supplierLineAED: supplierUnitAED * quantity
  };
}

function buildSupplierMessage_(order, items, totalSupplierAED) {
  const lines = items.map((item, index) =>
    (index + 1) + ". " + item.productName + " | الكود: " + item.productId +
    " | الكمية: " + item.quantity + " | التفاصيل/المقاس: " + (item.details || "غير محدد") +
    " | تكلفة الوحدة: " + Math.round(item.supplierUnitAED) + " AED | الإجمالي: " +
    Math.round(item.supplierLineAED) + " AED");
  return "طلب توريد WeFone LED رقم " + cleanText_(order.orderId, 32) + "\n" +
    "العميل: " + cleanText_(order.customerName, 120) + "\n" +
    "الجوال: " + cleanPhone_(order.customerPhone) + "\n" +
    "الشحن: " + cleanText_(order.shippingDestination, 180) + " " + cleanText_(order.cityAndNotes, 240) +
    "\n\nتفاصيل الأصناف:\n" + lines.join("\n") +
    "\n\nإجمالي تكلفة المورد: " + Math.round(totalSupplierAED) + " AED\nيرجى تأكيد التوفر ومدة التجهيز والشحن.";
}

function validateOrder_(order) {
  if (!order || !/^[A-Za-z0-9-]{5,32}$/.test(String(order.orderId || ""))) throw new Error("Invalid order ID");
  if (!cleanText_(order.customerName, 120)) throw new Error("Customer name is required");
  if (cleanPhone_(order.customerPhone).replace(/\D/g, "").length < 7) throw new Error("A valid phone is required");
  if (!Array.isArray(order.items) || order.items.length < 1 || order.items.length > 100) throw new Error("Invalid items");
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function orderAlreadySaved_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  return sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(String(orderId))
    .matchEntireCell(true).findNext() !== null;
}

function cleanText_(value, maxLength) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength || 500);
}

function cleanPhone_(value) {
  return cleanText_(value, 40).replace(/[^0-9+() -]/g, "");
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}




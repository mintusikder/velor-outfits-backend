
const PRODUCT_STATUSES = ["active", "draft", "archived"];

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isValidPrice = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0;

const isValidStock = (value) =>
  Number.isInteger(value) && value >= 0;

const isValidImage = (image) =>
  image &&
  typeof image === "object" &&
  typeof image.url === "string" &&
  /^https?:\/\/.+/i.test(image.url);

const isValidColor = (color) =>
  color &&
  typeof color.name === "string" &&
  typeof color.hex === "string" &&
  /^#[0-9A-Fa-f]{6}$/.test(color.hex);

const isValidVariant = (variant) =>
  variant &&
  typeof variant === "object" &&
  isNonEmptyString(variant.size) &&
  isNonEmptyString(variant.color) &&
  isNonEmptyString(variant.sku) &&
  isValidStock(variant.stock);

export function validateProduct(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      valid: false,
      errors: ["Invalid product data."],
    };
  }

  // Name
  if (!isNonEmptyString(payload.name)) {
    errors.push("Product name is required.");
  }

  // SKU
  if (!isNonEmptyString(payload.sku)) {
    errors.push("Product SKU is required.");
  }

  // Category
  if (!isNonEmptyString(payload.category)) {
    errors.push("Product category is required.");
  }

  // Price
  if (!isValidPrice(payload.price)) {
    errors.push("Price must be a valid non-negative number.");
  }

  // Sale Price
  if (payload.salePrice !== undefined && payload.salePrice !== null) {
    if (!isValidPrice(payload.salePrice)) {
      errors.push("Sale price must be a valid non-negative number.");
    } else if (
      isValidPrice(payload.price) &&
      payload.salePrice >= payload.price
    ) {
      errors.push("Sale price must be less than regular price.");
    }
  }

  // Description
  if (
    payload.description !== undefined &&
    typeof payload.description !== "string"
  ) {
    errors.push("Description must be a string.");
  }

  // Images
  if (payload.images !== undefined) {
    if (!Array.isArray(payload.images)) {
      errors.push("Images must be an array.");
    } else if (!payload.images.every(isValidImage)) {
      errors.push("Each image must have a valid HTTP or HTTPS URL.");
    }
  }

  // Sizes
  if (payload.sizes !== undefined) {
    if (
      !Array.isArray(payload.sizes) ||
      !payload.sizes.every(isNonEmptyString)
    ) {
      errors.push("Sizes must be an array of valid strings.");
    }
  }

  // Colors
  if (payload.colors !== undefined) {
    if (
      !Array.isArray(payload.colors) ||
      !payload.colors.every(isValidColor)
    ) {
      errors.push("Each color must contain a name and valid HEX code.");
    }
  }

  // Variants
  if (payload.variants !== undefined) {
    if (
      !Array.isArray(payload.variants) ||
      !payload.variants.every(isValidVariant)
    ) {
      errors.push(
        "Each variant must contain size, color, SKU and valid stock."
      );
    }
  }

  // Stock
  if (payload.stock !== undefined && !isValidStock(payload.stock)) {
    errors.push("Stock must be a non-negative integer.");
  }

  // Status
  if (
    payload.status !== undefined &&
    !PRODUCT_STATUSES.includes(payload.status)
  ) {
    errors.push("Invalid product status.");
  }

  // Featured
  if (
    payload.featured !== undefined &&
    typeof payload.featured !== "boolean"
  ) {
    errors.push("Featured must be true or false.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Generate URL-friendly slug
export function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


import { getDB } from "./db.js";

export async function initializeProductIndexes() {
  const db = getDB();
  const products = db.collection("products");

  // Unique SKU
  await products.createIndex(
    { sku: 1 },
    {
      unique: true,
      name: "unique_product_sku",
    }
  );

  // Unique product slug
  await products.createIndex(
    { slug: 1 },
    {
      unique: true,
      name: "unique_product_slug",
    }
  );

  // Category filtering
  await products.createIndex(
    { category: 1, status: 1 },
    {
      name: "category_status_index",
    }
  );

  // Featured products
  await products.createIndex(
    { featured: 1, status: 1 },
    {
      name: "featured_status_index",
    }
  );

  // Latest products
  await products.createIndex(
    { createdAt: -1 },
    {
      name: "product_created_at_index",
    }
  );

  // Price sorting and filtering
  await products.createIndex(
    { price: 1 },
    {
      name: "product_price_index",
    }
  );

  console.log("✅ Product indexes initialized successfully!");
}

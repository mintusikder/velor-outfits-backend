
import { ObjectId } from "mongodb";

import { getDB } from "../config/db.js";
import { uploadImagesToImgBB } from "../services/imgbb.service.js";
import {
  validateProduct,
  generateSlug,
} from "../products/product.validation.js";

// ========================================
// HELPERS
// ========================================

function parsePositiveInteger(value, fallback, max = 100) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return fallback;
  }

  return Math.min(number, max);
}

function isValidObjectId(id) {
  return typeof id === "string" && ObjectId.isValid(id);
}

function handleDuplicateKey(error, res) {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";

    return res.status(409).json({
      success: false,
      message: `A product with this ${field} already exists.`,
    });
  }

  return null;
}

// ========================================
// CREATE PRODUCT (ADMIN)
// POST /api/v1/products
// ========================================

export async function createProduct(req, res, next) {
  try {
    // ========================================
    // 1. Parse Product Payload
    // ========================================

    let payload = req.body;

    // Frontend multipart/form-data পাঠালে
    // Product JSON "product" field-এর ভিতরে থাকবে
    if (typeof req.body.product === "string") {
      try {
        payload = JSON.parse(req.body.product);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid product JSON data.",
        });
      }
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product data.",
      });
    }

    // ========================================
    // 2. Normalize Numeric Fields
    // ========================================

    // Blank price যেন 0 হিসেবে valid না হয়ে যায়
    if (
      payload.price === "" ||
      payload.price === null ||
      payload.price === undefined
    ) {
      payload.price = NaN;
    } else {
      payload.price = Number(payload.price);
    }

    // Blank Sale Price = null
    if (
      payload.salePrice === "" ||
      payload.salePrice === null ||
      payload.salePrice === undefined
    ) {
      payload.salePrice = null;
    } else {
      payload.salePrice = Number(payload.salePrice);
    }

    // Stock
    if (
      payload.stock === "" ||
      payload.stock === null ||
      payload.stock === undefined
    ) {
      payload.stock = 0;
    } else {
      payload.stock = Number(payload.stock);
    }

    // ========================================
    // 3. Product Validation
    // ========================================

    const validation = validateProduct(payload);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Product validation failed.",
        errors: validation.errors,
      });
    }

    // ========================================
    // 4. MongoDB
    // ========================================

    const db = getDB();
    const products = db.collection("products");

    // SKU normalize
    const sku = payload.sku.trim().toUpperCase();

    // Check duplicate SKU
    const existingSKU = await products.findOne({ sku });

    if (existingSKU) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
    }

    // ========================================
    // 5. Generate Product Slug
    // ========================================

    const baseSlug = generateSlug(payload.name);
    const slug = `${baseSlug}-${generateSlug(sku)}`;

    // Check duplicate Slug
    const existingSlug = await products.findOne({ slug });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "A product with this slug already exists.",
      });
    }

    // ========================================
    // 6. Upload Images to ImgBB
    // ========================================

    const files = req.files || [];

    let uploadedImages = [];

    if (files.length > 0) {
      uploadedImages = await uploadImagesToImgBB(files);
    }

    // Existing image URLs (if any)
    const existingImages = Array.isArray(payload.images)
      ? payload.images
      : [];

    // Uploaded ImgBB images + existing image URLs
    const images = [
      ...existingImages,
      ...uploadedImages,
    ];

    // ========================================
    // 7. Create Product Document
    // ========================================

    const product = {
      name: payload.name.trim(),
      slug,
      sku,

      description: payload.description || "",
      category: payload.category.trim(),
      brand: payload.brand || "VELOR OUTFITS",

      price: payload.price,
      salePrice: payload.salePrice,

      images,

      sizes: payload.sizes || [],
      colors: payload.colors || [],
      variants: payload.variants || [],

      stock: payload.stock ?? 0,

      status: payload.status || "draft",
      featured: payload.featured ?? false,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ========================================
    // 8. Save to MongoDB
    // ========================================

    const result = await products.insertOne(product);

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: {
        ...product,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    // Duplicate SKU / Slug
    const duplicateResponse = handleDuplicateKey(error, res);

    if (duplicateResponse) {
      return duplicateResponse;
    }

    next(error);
  }
}

// ========================================
// GET ALL PUBLIC PRODUCTS
// GET /api/v1/products
// ========================================

export async function getAllProducts(req, res, next) {
  try {
    const db = getDB();
    const products = db.collection("products");

    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 12, 100);
    const skip = (page - 1) * limit;

    const filter = {
      status: "active",
    };

    // Category Filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Featured Filter
    if (req.query.featured === "true") {
      filter.featured = true;
    }

    // Search
    if (req.query.search?.trim()) {
      const search = req.query.search.trim();

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // Price Filter
    if (
      req.query.minPrice !== undefined ||
      req.query.maxPrice !== undefined
    ) {
      filter.price = {};

      if (req.query.minPrice !== undefined) {
        const minPrice = Number(req.query.minPrice);

        if (!Number.isFinite(minPrice) || minPrice < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid minPrice.",
          });
        }

        filter.price.$gte = minPrice;
      }

      if (req.query.maxPrice !== undefined) {
        const maxPrice = Number(req.query.maxPrice);

        if (!Number.isFinite(maxPrice) || maxPrice < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid maxPrice.",
          });
        }

        filter.price.$lte = maxPrice;
      }
    }

    // Sorting
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      priceLow: { price: 1 },
      priceHigh: { price: -1 },
      name: { name: 1 },
    };

    const sort = sortOptions[req.query.sort] || sortOptions.newest;

    const [data, total] = await Promise.all([
      products
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),

      products.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully.",
      products: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ========================================
// GET ALL PRODUCTS FOR ADMIN
// GET /api/v1/products/admin/all
// ========================================

export async function getAdminProducts(req, res, next) {
  try {
    const db = getDB();
    const products = db.collection("products");

    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    // Status Filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Category Filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Search
    if (req.query.search?.trim()) {
      const search = req.query.search.trim();

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      products
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      products.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin products fetched successfully.",
      products: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ========================================
// GET SINGLE PRODUCT
// GET /api/v1/products/:id
// ========================================

export async function getSingleProduct(req, res, next) {
  try {
    const db = getDB();
    const products = db.collection("products");

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await products.findOne({
      _id: new ObjectId(id),
      status: "active",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
}

// ========================================
// UPDATE PRODUCT (ADMIN)
// PATCH /api/v1/products/:id
// ========================================

export async function updateProduct(req, res, next) {
  try {
    const db = getDB();
    const products = db.collection("products");

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const productId = new ObjectId(id);

    const existingProduct = await products.findOne({
      _id: productId,
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const allowedFields = [
      "name",
      "sku",
      "description",
      "category",
      "brand",
      "price",
      "salePrice",
      "images",
      "sizes",
      "colors",
      "variants",
      "stock",
      "status",
      "featured",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    // Normalize numeric fields
    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
    }

    if (
      updates.salePrice !== undefined &&
      updates.salePrice !== null &&
      updates.salePrice !== ""
    ) {
      updates.salePrice = Number(updates.salePrice);
    } else if (updates.salePrice === "") {
      updates.salePrice = null;
    }

    if (updates.stock !== undefined) {
      updates.stock = Number(updates.stock);
    }

    // Merge with existing data
    const mergedProduct = {
      ...existingProduct,
      ...updates,
    };

    // Validate full product
    const validation = validateProduct(mergedProduct);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Product validation failed.",
        errors: validation.errors,
      });
    }

    // Normalize SKU
    if (updates.sku) {
      updates.sku = updates.sku.trim().toUpperCase();

      const duplicateSKU = await products.findOne({
        sku: updates.sku,
        _id: { $ne: productId },
      });

      if (duplicateSKU) {
        return res.status(409).json({
          success: false,
          message: "Product SKU already exists.",
        });
      }
    }

    // Update slug when name changes
    if (updates.name) {
      const name = updates.name.trim();
      const slugBase = generateSlug(name);
      const skuForSlug = updates.sku || existingProduct.sku;

      updates.slug = `${slugBase}-${generateSlug(skuForSlug)}`;

      const duplicateSlug = await products.findOne({
        slug: updates.slug,
        _id: { $ne: productId },
      });

      if (duplicateSlug) {
        return res.status(409).json({
          success: false,
          message: "Product slug already exists.",
        });
      }

      updates.name = name;
    }

    updates.updatedAt = new Date();

    await products.updateOne(
      { _id: productId },
      { $set: updates }
    );

    const updatedProduct = await products.findOne({
      _id: productId,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    const duplicateResponse = handleDuplicateKey(error, res);

    if (duplicateResponse) {
      return duplicateResponse;
    }

    next(error);
  }
}

// ========================================
// DELETE PRODUCT (ADMIN)
// DELETE /api/v1/products/:id
// ========================================

export async function deleteProduct(req, res, next) {
  try {
    const db = getDB();
    const products = db.collection("products");

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const result = await products.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

// ========================================
// GET SINGLE PRODUCT FOR ADMIN
// GET /api/v1/products/admin/:id
// ========================================

export async function getAdminSingleProduct(req, res, next) {
  try {
    const db = getDB();
    const products = db.collection("products");

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await products.findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin product fetched successfully.",
      product,
    });
  } catch (error) {
    next(error);
  }
}

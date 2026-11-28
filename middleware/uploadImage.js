
import multer from "multer";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 5, // Maximum 5 images
  },

  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only JPEG, PNG, WebP and GIF images are allowed."
        )
      );
    }

    cb(null, true);
  },
});

export const uploadProductImages = upload.array("images", 5);

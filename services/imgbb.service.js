
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

export async function uploadImageToImgBB(file) {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error("IMGBB_API_KEY is missing from backend .env");
  }

  if (!file?.buffer) {
    throw new Error("Image file buffer is missing.");
  }

  const formData = new FormData();

  const imageBlob = new Blob([file.buffer], {
    type: file.mimetype,
  });

  formData.append("image", imageBlob, file.originalname);
  formData.append("name", file.originalname);

  const uploadUrl = new URL(IMGBB_UPLOAD_URL);
  uploadUrl.searchParams.set("key", apiKey);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success || !result?.data?.url) {
    console.error("ImgBB upload failed:", {
      status: response.status,
      message: result?.error?.message,
    });

    throw new Error(
      result?.error?.message || "Failed to upload image to ImgBB."
    );
  }

  return {
    url: result.data.url,
    publicId: result.data.id || null,
    deleteUrl: result.data.delete_url || null,
    viewerUrl: result.data.url_viewer || null,
    thumbnailUrl: result.data.thumb?.url || null,
  };
}

export async function uploadImagesToImgBB(files = []) {
  const uploadedImages = [];

  for (const file of files) {
    const uploadedImage = await uploadImageToImgBB(file);
    uploadedImages.push(uploadedImage);
  }

  return uploadedImages;
}

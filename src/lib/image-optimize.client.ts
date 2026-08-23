/**
 * Browser-side image normalization before uploading to R2.
 * Large photos are resized and recompressed to WebP so uploads are smaller,
 * while the original visual aspect ratio is preserved.
 */
export async function optimizeImageFile(file: File, options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  const maxWidth = options.maxWidth ?? 2400;
  const maxHeight = options.maxHeight ?? 2000;
  const quality = options.quality ?? 0.80;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  // If the image is already a compact WebP/AVIF, keep it as-is to avoid needless work.
  if (scale === 1 && (file.type === "image/webp" || file.type === "image/avif") && file.size < 900 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) return file;
  const stem = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "image";
  const optimized = new File([blob], `${stem}.webp`, { type: "image/webp", lastModified: Date.now() });
  // Never make the upload larger than the original.
  return optimized.size < file.size ? optimized : file;
}

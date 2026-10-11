// Client-only image utilities: validation + downscale/compress to keep uploads small.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(f: File): string | null {
  if (!f.type.startsWith("image/")) return "Please pick an image file";
  if (!ALLOWED_MIMES.includes(f.type)) return "Only JPG, PNG or WebP images are supported";
  if (f.size > MAX_UPLOAD_BYTES) return "Image is larger than 8MB";
  if (f.size < 500) return "Image is empty or corrupt";
  return null;
}

export async function createRasterPreview(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the image preview");
    context.drawImage(bitmap, 0, 0, width, height);

    const blob =
      "convertToBlob" in canvas
        ? await canvas.convertToBlob({ type: "image/png" })
        : await new Promise<Blob>((resolve, reject) => {
            (canvas as HTMLCanvasElement).toBlob(
              (result) =>
                result ? resolve(result) : reject(new Error("Could not prepare the image preview")),
              "image/png",
            );
          });
    return URL.createObjectURL(blob);
  } finally {
    bitmap.close();
  }
}

/**
 * Downscale to at most `maxEdge` px on the longest side and re-encode as JPEG.
 * Skips work when the file is already small enough.
 */
export async function compressImage(
  file: File,
  { maxEdge = 1600, quality = 0.85 }: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  if (file.size < 400_000) return file; // already tiny — skip.
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d");
  if (!ctx) return file;
  (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, w, h);

  const blob: Blob | null =
    "convertToBlob" in canvas
      ? await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality })
      : await new Promise((resolve) =>
          (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", quality),
        );
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

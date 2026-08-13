export const MAX_LISTING_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_LISTING_IMAGE_CHARS = 85_000;

const ACCEPTED_LISTING_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the selected image."));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected file is not a valid image."));
    image.src = source;
  });
}

export async function prepareListingImage(file: File): Promise<string> {
  if (!ACCEPTED_LISTING_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > MAX_LISTING_UPLOAD_BYTES) {
    throw new Error("Choose an image smaller than 10 MB.");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is not available in this browser.");

  let maxSide = 1_200;
  let quality = 0.84;
  let output = source;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    output = canvas.toDataURL("image/jpeg", quality);
    if (output.length <= MAX_LISTING_IMAGE_CHARS) return output;
    maxSide = Math.max(320, Math.round(maxSide * 0.82));
    quality = Math.max(0.45, quality - 0.06);
  }

  if (output.length > MAX_LISTING_IMAGE_CHARS) {
    throw new Error("This image could not be compressed enough. Choose a simpler or smaller photo.");
  }
  return output;
}

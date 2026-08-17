export const MAX_AVATAR_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_IMAGE_CHARS = 85_000;

const ACCEPTED_AVATAR_IMAGE_TYPES = new Set([
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
        : reject(new Error("Could not read the selected photo."));
    reader.onerror = () => reject(new Error("Could not read the selected photo."));
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

export async function prepareAvatarImage(file: File): Promise<string> {
  if (!ACCEPTED_AVATAR_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP photo.");
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw new Error("Choose a photo smaller than 10 MB.");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo processing is not available in this browser.");

  const sourceSide = Math.min(image.naturalWidth, image.naturalHeight);
  if (!Number.isFinite(sourceSide) || sourceSide <= 0) {
    throw new Error("The selected file is not a valid image.");
  }

  const sourceX = Math.max(0, (image.naturalWidth - sourceSide) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSide) / 2);
  let outputSide = Math.min(512, sourceSide);
  let quality = 0.86;
  let output = source;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    canvas.width = Math.max(1, Math.round(outputSide));
    canvas.height = canvas.width;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSide,
      sourceSide,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    output = canvas.toDataURL("image/jpeg", quality);
    if (output.length <= MAX_AVATAR_IMAGE_CHARS) return output;
    outputSide = Math.max(192, Math.round(outputSide * 0.84));
    quality = Math.max(0.45, quality - 0.06);
  }

  throw new Error("This photo could not be compressed enough. Choose a simpler or smaller photo.");
}

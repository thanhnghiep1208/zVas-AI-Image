export const ACCEPTED_IMAGE_TYPES = 'image/png, image/jpeg, image/webp';

const ACCEPTED_IMAGE_MIME_TYPES = new Set(
  ACCEPTED_IMAGE_TYPES.split(',').map((type) => type.trim())
);

export function isAcceptedImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_MIME_TYPES.has(file.type);
}

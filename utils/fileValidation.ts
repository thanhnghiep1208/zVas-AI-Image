export const ACCEPTED_IMAGE_TYPES = 'image/png, image/jpeg, image/webp';

export function isAcceptedImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

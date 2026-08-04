import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import heic2any from "heic2any"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isHeicImage = (file: File): boolean => {
  return /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
}

export async function normalizeImageFile(file: File): Promise<File> {
  if (!isHeicImage(file)) return file;

  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  if (!(blob instanceof Blob)) {
    throw new Error('No se pudo convertir HEIC/HEIF a JPEG');
  }

  const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], fileName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

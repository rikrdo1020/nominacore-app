// Vision API token cost scales with image pixel area, so shrinking the
// image before it ever leaves the app cuts both the request payload and
// the per-image AI cost — not just upload time.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export interface CompressedImage {
  fileName: string;
  mimeType: string;
  base64: string;
}

export function compressImageFile(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({ fileName: file.name, mimeType: 'image/jpeg', base64 });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`No se pudo leer la imagen: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

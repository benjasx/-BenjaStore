import type { ImageMap } from "@/hooks/useImages";

export const MAX_SIZE = 320;
const MAX_BYTES = 200_000;

export const fitSize = (width: number, height: number, max = MAX_SIZE) => {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(Math.round(width * scale), 1),
    height: Math.max(Math.round(height * scale), 1),
  };
};

const encode = (canvas: HTMLCanvasElement, quality: number) => {
  const webp = canvas.toDataURL("image/webp", quality);
  return webp.startsWith("data:image/webp")
    ? webp
    : canvas.toDataURL("image/jpeg", quality);
};

export const readImage = async (file: Blob): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const data = encode(canvas, 0.8);
  return data.length > MAX_BYTES ? encode(canvas, 0.6) : data;
};

export const reencode = async (dataUrl: string): Promise<string> =>
  readImage(await (await fetch(dataUrl)).blob());

export const pickImage = (
  id: string,
  images: ImageMap,
  legacy: string | undefined,
): string | undefined => images[id] ?? legacy;

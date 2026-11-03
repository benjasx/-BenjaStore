import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { bannerFileName } from "@/lib/advertising";
import { loadPdfMake } from "@/lib/reportPdf";

export type BannerTemplate = "promo" | "menu" | "product";

// A4 en puntos.
const A4 = { width: 595.28, height: 841.89 } as const;

const PIXEL_RATIO = 2;

const settled = (img: HTMLImageElement) =>
  img.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });

// Sin esperar la carga, html-to-image puede devolver un PNG sin fotos.
export const waitForImages = (node: HTMLElement) =>
  Promise.all([...node.querySelectorAll("img")].map(settled));

export const renderBannerPng = async (node: HTMLElement): Promise<string> => {
  const { toPng } = await import("html-to-image");
  await waitForImages(node);
  return toPng(node, {
    pixelRatio: PIXEL_RATIO,
    width: node.offsetWidth,
    height: node.offsetHeight,
  });
};

export const downloadBannerPng = async (
  node: HTMLElement,
  template: BannerTemplate,
) => {
  const link = document.createElement("a");
  link.href = await renderBannerPng(node);
  link.download = bannerFileName(template, new Date(), "png");
  link.click();
};

// Una página sin márgenes: A4 vertical para Promo y horizontal para Menú.
export const buildBannerPdfDefinition = (
  png: string,
  template: BannerTemplate,
): TDocumentDefinitions => {
  const landscape = template === "menu";
  return {
    pageSize: "A4",
    pageOrientation: landscape ? "landscape" : "portrait",
    pageMargins: 0,
    content: [
      {
        image: png,
        fit: landscape ? [A4.height, A4.width] : [A4.width, A4.height],
      },
    ],
  };
};

export const downloadBannerPdf = async (
  node: HTMLElement,
  template: BannerTemplate,
) => {
  const png = await renderBannerPng(node);
  const pdfMake = await loadPdfMake();
  await pdfMake
    .createPdf(buildBannerPdfDefinition(png, template))
    .download(bannerFileName(template, new Date(), "pdf"));
};

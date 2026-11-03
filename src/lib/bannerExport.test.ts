import {
  buildBannerPdfDefinition,
  downloadBannerPdf,
  downloadBannerPng,
  waitForImages,
} from "@/lib/bannerExport";

const html = vi.hoisted(() => ({ toPng: vi.fn() }));
const pdf = vi.hoisted(() => ({ download: vi.fn(), createPdf: vi.fn() }));
vi.mock("html-to-image", () => ({ toPng: html.toPng }));
vi.mock("@/lib/reportPdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/reportPdf")>()),
  loadPdfMake: async () => ({ createPdf: pdf.createPdf }),
}));

beforeEach(() => {
  html.toPng.mockReset().mockResolvedValue("data:image/png;base64,AAA");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3));
});
afterEach(() => vi.useRealTimers());

describe("waitForImages", () => {
  it("espera a que las imágenes pendientes terminen de cargar", async () => {
    const node = document.createElement("div");
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { value: false });
    node.append(img);
    let done = false;
    const pending = waitForImages(node).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    img.dispatchEvent(new Event("load"));
    await pending;
    expect(done).toBe(true);
  });

  it("no se bloquea con una imagen que falla", async () => {
    const node = document.createElement("div");
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { value: false });
    node.append(img);
    const pending = waitForImages(node);
    img.dispatchEvent(new Event("error"));
    await expect(pending).resolves.toBeDefined();
  });
});

describe("downloadBannerPng", () => {
  it("renderiza a 2× y descarga con el nombre de la plantilla", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("publicidad-promo-2026-11-03.png");
        expect(this.href).toBe("data:image/png;base64,AAA");
      });
    const node = document.createElement("div");
    await downloadBannerPng(node, "promo");
    expect(html.toPng).toHaveBeenCalledWith(
      node,
      expect.objectContaining({ pixelRatio: 2 }),
    );
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it("propaga el fallo de render sin descargar", async () => {
    html.toPng.mockRejectedValue(new Error("boom"));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    await expect(
      downloadBannerPng(document.createElement("div"), "menu"),
    ).rejects.toThrow("boom");
    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });
});

describe("buildBannerPdfDefinition", () => {
  it("Promo va en A4 vertical sin márgenes, con la imagen ajustada", () => {
    const def = buildBannerPdfDefinition("data:image/png;base64,AAA", "promo");
    expect(def.pageSize).toBe("A4");
    expect(def.pageOrientation).toBe("portrait");
    expect(def.pageMargins).toBe(0);
    expect(def.content).toEqual([
      { image: "data:image/png;base64,AAA", fit: [595.28, 841.89] },
    ]);
  });

  it("Producto va en A4 vertical", () => {
    const def = buildBannerPdfDefinition(
      "data:image/png;base64,AAA",
      "product",
    );
    expect(def.pageOrientation).toBe("portrait");
  });

  it("Menú va en A4 horizontal", () => {
    const def = buildBannerPdfDefinition("data:image/png;base64,AAA", "menu");
    expect(def.pageOrientation).toBe("landscape");
    expect(def.content).toEqual([
      { image: "data:image/png;base64,AAA", fit: [841.89, 595.28] },
    ]);
  });
});

describe("downloadBannerPdf", () => {
  beforeEach(() => {
    pdf.download.mockReset().mockResolvedValue(undefined);
    pdf.createPdf.mockReset().mockReturnValue({ download: pdf.download });
  });

  it("incrusta el PNG y descarga con el nombre de la plantilla", async () => {
    await downloadBannerPdf(document.createElement("div"), "menu");
    expect(pdf.createPdf).toHaveBeenCalledWith(
      buildBannerPdfDefinition("data:image/png;base64,AAA", "menu"),
    );
    expect(pdf.download).toHaveBeenCalledWith("publicidad-menu-2026-11-03.pdf");
  });

  it("propaga el fallo de render sin generar el PDF", async () => {
    html.toPng.mockRejectedValue(new Error("boom"));
    await expect(
      downloadBannerPdf(document.createElement("div"), "promo"),
    ).rejects.toThrow("boom");
    expect(pdf.createPdf).not.toHaveBeenCalled();
  });
});

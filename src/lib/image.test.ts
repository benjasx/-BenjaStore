import { fitSize, pickImage } from "@/lib/image";

describe("fitSize", () => {
  it("reduce una imagen horizontal conservando la proporción", () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 320, height: 240 });
  });

  it("reduce una imagen vertical conservando la proporción", () => {
    expect(fitSize(3000, 4000)).toEqual({ width: 240, height: 320 });
  });

  it("reduce una imagen cuadrada", () => {
    expect(fitSize(1200, 1200)).toEqual({ width: 320, height: 320 });
  });

  it("no amplía imágenes menores al máximo", () => {
    expect(fitSize(200, 100)).toEqual({ width: 200, height: 100 });
    expect(fitSize(320, 320)).toEqual({ width: 320, height: 320 });
  });

  it("nunca devuelve una dimensión en cero", () => {
    expect(fitSize(10000, 1).height).toBe(1);
  });
});

describe("pickImage", () => {
  it("prefiere la imagen de la colección images", () => {
    expect(pickImage("a", { a: "nueva" }, "vieja")).toBe("nueva");
  });

  it("usa la imagen vieja si no hay en images", () => {
    expect(pickImage("a", {}, "vieja")).toBe("vieja");
  });

  it("devuelve undefined si no hay ninguna", () => {
    expect(pickImage("a", { b: "x" }, undefined)).toBeUndefined();
  });
});

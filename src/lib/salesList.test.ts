import { paginate } from "@/lib/salesList";

const list = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("paginate", () => {
  it("devuelve la primera página de 20", () => {
    const r = paginate(list(45), 1);
    expect(r.items).toHaveLength(20);
    expect(r.items[0]).toBe(1);
    expect(r.pages).toBe(3);
  });

  it("la última página es parcial", () => {
    const r = paginate(list(45), 3);
    expect(r.items).toEqual([41, 42, 43, 44, 45]);
  });

  it("acota páginas fuera de rango", () => {
    expect(paginate(list(45), 9).page).toBe(3);
    expect(paginate(list(45), 0).page).toBe(1);
  });

  it("lista vacía tiene 1 página", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pages: 1 });
  });
});

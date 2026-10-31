import { normalizeName } from "@/lib/text";

describe("normalizeName", () => {
  it("trims and lowercases", () => {
    expect(normalizeName("  TaCos ")).toBe("tacos");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeName("   ")).toBe("");
  });
});

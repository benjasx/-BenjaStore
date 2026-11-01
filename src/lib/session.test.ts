import { clearSession, loadSession, saveSession } from "@/lib/session";

beforeEach(() => {
  localStorage.clear();
});

describe("session", () => {
  it("saves and loads a session", () => {
    saveSession({ v: 1, userId: "lu", mode: "pin" });
    expect(loadSession()).toEqual({ v: 1, userId: "lu", mode: "pin" });
  });

  it("clears the session", () => {
    saveSession({ v: 1, userId: "ro", mode: "admin" });
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("ignores corrupt, empty or other-version data", () => {
    expect(loadSession()).toBeNull();
    for (const raw of [
      "{no json",
      "null",
      "[]",
      JSON.stringify({ v: 2, userId: "lu", mode: "pin" }),
      JSON.stringify({ v: 1, userId: "", mode: "pin" }),
      JSON.stringify({ v: 1, userId: "lu", mode: "root" }),
      JSON.stringify({ v: 1, mode: "pin" }),
    ]) {
      localStorage.setItem("benjastore.session", raw);
      expect(loadSession()).toBeNull();
    }
  });

  it("never stores secrets: only version, user and mode", () => {
    saveSession({ v: 1, userId: "lu", mode: "pin" });
    expect(
      Object.keys(JSON.parse(localStorage.getItem("benjastore.session")!)),
    ).toEqual(["v", "userId", "mode"]);
  });
});

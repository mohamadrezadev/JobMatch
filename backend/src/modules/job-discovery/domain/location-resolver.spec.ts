import {
  locationsMatch,
  resolveAgainstCatalog,
  resolveLocation,
} from "./location-resolver";

describe("resolveLocation", () => {
  it.each([
    ["Isfahan", "Esfahan", "اصفهان"],
    ["Tehran", "تهران"],
    ["Shiraz", "شیراز"],
    ["Mashhad", "مشهد"],
  ])(
    "resolves every spelling of a city to the same canonicalId: %s",
    (...spellings) => {
      const ids = spellings.map(
        (spelling) => resolveLocation(spelling).canonicalId,
      );
      expect(new Set(ids).size).toBe(1);
      expect(ids[0]).toBeDefined();
      for (const spelling of spellings)
        expect(resolveLocation(spelling).status).toBe("resolved");
    },
  );

  it("resolves distinct cities to distinct canonicalIds", () => {
    const isfahan = resolveLocation("Isfahan").canonicalId;
    const shiraz = resolveLocation("Shiraz").canonicalId;
    const mashhad = resolveLocation("Mashhad").canonicalId;
    const tehran = resolveLocation("Tehran").canonicalId;
    expect(new Set([isfahan, shiraz, mashhad, tehran]).size).toBe(4);
  });

  it("does not guess an uncatalogued place", () => {
    const result = resolveLocation("Atlantis");
    expect(result.status).toBe("unresolved");
    expect(result.canonicalId).toBeUndefined();
  });

  it("returns unresolved for empty input", () => {
    expect(resolveLocation("   ").status).toBe("unresolved");
  });
});

describe("resolveAgainstCatalog (ambiguous path)", () => {
  // A synthetic two-place catalog constructed only to exercise the ambiguous
  // branch deterministically, without fabricating a fake collision in real
  // Iranian geographic data.
  const synthetic = [
    { id: "place-a", alias: "Shared City", terms: ["shared", "city"] },
    { id: "place-b", alias: "Shared City", terms: ["shared", "city"] },
    { id: "place-a", alias: "Place A", terms: ["place", "a"] },
  ];

  it("flags equally-specific matches across different places as ambiguous", () => {
    const result = resolveAgainstCatalog("Shared City", synthetic);
    expect(result.status).toBe("ambiguous");
    expect(result.candidateIds).toEqual(
      expect.arrayContaining(["place-a", "place-b"]),
    );
    expect(result.canonicalId).toBeUndefined();
  });

  it("still resolves unambiguous input in the same synthetic catalog", () => {
    const result = resolveAgainstCatalog("Place A", synthetic);
    expect(result.status).toBe("resolved");
    expect(result.canonicalId).toBe("place-a");
  });
});

describe("locationsMatch", () => {
  const has = (text: string, term: string) =>
    text.toLowerCase().includes(term.toLowerCase());

  it("matches cross-script spellings via canonical identity", () => {
    expect(locationsMatch("Isfahan", "اصفهان", has)).toBe(true);
    expect(locationsMatch("Tehran", "تهران", has)).toBe(true);
  });

  it("does not match two different resolved places", () => {
    expect(locationsMatch("Isfahan", "تهران", has)).toBe(false);
  });

  it("falls back to the provided substring matcher for uncatalogued places", () => {
    expect(locationsMatch("Smalltown", "Smalltown Industrial Area", has)).toBe(
      true,
    );
    expect(locationsMatch("Smalltown", "Somewhere Else", has)).toBe(false);
  });

  it("falls back to substring matching when only one side resolves", () => {
    // "Isfahan Province" resolves (contains the catalogued word "Isfahan"
    // among its tokens isn't exact-match here); use a clearly uncatalogued
    // job location paired with a resolvable requested city to hit the
    // mixed-resolution fallback path explicitly.
    expect(locationsMatch("Isfahan", "Remote - Worldwide", has)).toBe(false);
  });
});

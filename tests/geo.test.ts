import { describe, expect, it } from "vitest";
import { classify, countryByCode, parseGeo } from "@/lib/geo";

const NG = { country: "NG", city: "" };
const DE = { country: "DE", city: "Berlin" };

describe("parseGeo", () => {
  it("reads country lists", () => {
    const g = parseGeo("USA, Canada, Ireland or UK only");
    expect(g.countries.sort()).toEqual(["CA", "GB", "IE", "US"]);
    expect(g.worldwide).toBe(false);
  });
  it("recognises worldwide wording", () => {
    expect(parseGeo("Worldwide").worldwide).toBe(true);
    expect(parseGeo("Anywhere").worldwide).toBe(true);
    expect(parseGeo("").worldwide).toBe(true);
  });
  it("reads regions and cities", () => {
    expect(parseGeo("Europe").regions).toContain("europe");
    expect(parseGeo("EMEA").regions).toContain("emea");
    expect(parseGeo("Hamburg, Germany").countries).toContain("DE");
    expect(parseGeo("Lagos").countries).toContain("NG");
  });
  it("does not mistake words inside other words for countries", () => {
    expect(parseGeo("Join us in building").countries).toEqual([]);
  });
});

describe("classify", () => {
  const job = (location: string, remote: boolean) => ({ remote, location, geo: parseGeo(location) });

  it("shows everything when no location is set", () => {
    expect(classify(job("Berlin, Germany", false), { country: "", city: "" })).toBe("remote");
  });
  it("a worldwide remote job is open to anyone", () => {
    expect(classify(job("Worldwide", true), NG)).toBe("remote");
  });
  it("a remote job restricted to other countries is abroad", () => {
    expect(classify(job("USA, Canada only", true), NG)).toBe("abroad");
  });
  it("regional remote jobs match the user's region", () => {
    expect(classify(job("Africa", true), NG)).toBe("remote");
    expect(classify(job("EMEA", true), NG)).toBe("remote");
    expect(classify(job("Europe", true), NG)).toBe("abroad");
    expect(classify(job("Europe", true), DE)).toBe("remote");
  });
  it("on-site jobs in the user's country or city are local", () => {
    expect(classify(job("Berlin, Germany", false), DE)).toBe("local");
    expect(classify(job("Munich, Germany", false), DE)).toBe("local");
    expect(classify(job("Lagos, Nigeria", false), NG)).toBe("local");
  });
  it("on-site jobs elsewhere are abroad", () => {
    expect(classify(job("Berlin, Germany", false), NG)).toBe("abroad");
  });
  it("remote jobs restricted to the user's own country are local", () => {
    expect(classify(job("Nigeria", true), NG)).toBe("local");
  });
});

describe("countries", () => {
  it("has unique codes", () => {
    const codes = ["NG", "US", "DE", "GB", "IN"].map((c) => countryByCode(c)?.name);
    expect(codes).toEqual(["Nigeria", "United States", "Germany", "United Kingdom", "India"]);
  });
});

import { describe, expect, it } from "vitest";
import { haystack, isEmptyQuery, matches, parseQuery, queryText } from "@/lib/search";
import { normText } from "@/lib/text";

describe("normText", () => {
  it("treats spelling variants as equal", () => {
    expect(normText("Front-End Developer")).toBe(normText("frontend engineer"));
    expect(normText("Full Stack Programmer")).toBe(normText("fullstack developer"));
    expect(normText("Back end SWE")).toBe("backend engineer");
  });
  it("strips accents and punctuation", () => {
    expect(normText("Développeur")).toBe("developpeur");
    expect(normText("CI/CD engineer")).toBe("ci cd engineer");
  });
});

describe("search query syntax", () => {
  it("requires every plain term", () => {
    const q = parseQuery("react developer");
    expect(matches(normText("Senior React Engineer"), q)).toBe(true);
    expect(matches(normText("Senior Vue Engineer"), q)).toBe(false);
  });
  it("supports exact phrases", () => {
    const q = parseQuery('"product manager"');
    expect(matches(normText("Senior Product Manager"), q)).toBe(true);
    expect(matches(normText("Manager of product design"), q)).toBe(false);
  });
  it("supports exclusions", () => {
    const q = parseQuery("react -senior");
    expect(matches(normText("Senior React Engineer"), q)).toBe(false);
    expect(matches(normText("React Engineer"), q)).toBe(true);
  });
  it("knows when a query is empty and builds plain text for the job boards", () => {
    expect(isEmptyQuery(parseQuery("   "))).toBe(true);
    expect(queryText(parseQuery('"data analyst" sql -junior'))).toBe("data analyst sql");
  });
  it("searches title, company, tags and the description excerpt", () => {
    const h = haystack({ title: "Engineer", company: "Globex", location: "Remote", tags: ["fintech"], skills: ["React"], description: "Build things" });
    expect(h).toContain("globex");
    expect(h).toContain("fintech");
    expect(h).toContain("react");
  });
});

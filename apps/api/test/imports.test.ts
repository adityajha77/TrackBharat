import { describe, expect, it } from "vitest";
import { CONSTITUENCY_FIXES } from "../src/imports/corrections";
import { canonicalState } from "../src/imports/constituencies";
import { looseName, normalizeName, parseCsvLine, slugify } from "../src/imports/lib/text";
import { parseMlaCsv } from "../src/imports/mlas";

// Pure functions from the data pipeline: fast, no DB, and they encode the
// tricky real-world cases we hit while importing.

describe("name matching across government datasets", () => {
  it("treats punctuation, case and & consistently", () => {
    expect(normalizeName("Darrang-Udalguri")).toBe(normalizeName("Darrang Udalguri"));
    expect(normalizeName("Jammu & Kashmir")).toBe(normalizeName("Jammu and Kashmir"));
  });

  it.each([
    ["Mahbubnagar", "Mahabubnagar"],
    ["Hardwar", "Haridwar"],
    ["Thoothukkudi", "Thoothukudi"],
  ])("loosely matches transliteration variants %s ≈ %s", (a, b) => {
    expect(looseName(a)).toBe(looseName(b));
  });

  it("does not loosely merge genuinely different seats", () => {
    expect(looseName("Mumbai South")).not.toBe(looseName("Mumbai South Central"));
  });

  it("maps old/alternate state names to current official names", () => {
    expect(canonicalState("Orissa")).toBe("Odisha");
    expect(canonicalState("Delhi")).toBe("NCT of Delhi");
    expect(canonicalState("Daman & Diu")).toBe("Dadra and Nagar Haveli and Daman and Diu");
    expect(canonicalState("Tamil Nadu")).toBe("Tamil Nadu");
  });
});

describe("corrections file", () => {
  it("has at most one fix per seat, each with a reason", () => {
    const keys = CONSTITUENCY_FIXES.map((f) => `${f.state}#${f.number}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const f of CONSTITUENCY_FIXES) expect(f.reason.length).toBeGreaterThan(10);
  });
});

describe("MLA CSV format", () => {
  const header = "state,ac_number,ac_name,mla_name,party,election_year,source_url,source_title,source_publisher";

  it("parses a valid, sourced row (and ignores # comments)", () => {
    const rows = parseMlaCsv(`# comment\n${header}\nKarnataka,174,Seat,Full Name,Some Party,2023,https://example.org/r,Results,ECI\n`);
    expect(rows[0]).toMatchObject({ state: "Karnataka", ac_number: 174, election_year: 2023 });
  });

  it("rejects a row without an https source, naming the row", () => {
    expect(() => parseMlaCsv(`${header}\nKarnataka,174,Seat,Full Name,Party,2023,http://example.org/r,Results,ECI`, "ka.csv")).toThrow(/ka\.csv, data row 1: source_url/);
  });
});

describe("helpers", () => {
  it("slugifies names for URLs", () => {
    expect(slugify("Bangalore South")).toBe("bangalore-south");
    expect(slugify("Hamirpur Uttar Pradesh")).toBe("hamirpur-uttar-pradesh");
  });

  it("parses quoted CSV fields with commas and escaped quotes", () => {
    expect(parseCsvLine('"A, B","1","say ""hi"""')).toEqual(["A, B", "1", 'say "hi"']);
  });
});

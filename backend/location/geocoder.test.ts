import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNominatimSearchUrl,
  normalizeLocationQuery,
} from "./geocoder";

test("normalizes a City, Country query", () => {
  assert.equal(normalizeLocationQuery("  Mumbai  ,   India "), "Mumbai, India");
});

test("constrains Nominatim lookup to the supplied country", () => {
  const url = buildNominatimSearchUrl("Mumbai, India", "https://nominatim.example");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("q"), "Mumbai, India");
  assert.equal(url.searchParams.get("countrycodes"), "in");
  assert.equal(url.searchParams.get("limit"), "5");
});

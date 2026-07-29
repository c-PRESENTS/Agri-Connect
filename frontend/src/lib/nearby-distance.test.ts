import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, isWithinRadius } from "./nearby-distance";

test("calculates nearby distance consistently", () => {
  const mumbaiToNaviMumbai = distanceKm([19.076, 72.8777], [19.033, 73.0297]);
  assert.ok(mumbaiToNaviMumbai > 10);
  assert.ok(mumbaiToNaviMumbai < 20);
});

test("supports fixed and unbounded nearby radii", () => {
  assert.equal(isWithinRadius(24.9, 25), true);
  assert.equal(isWithinRadius(25.1, 25), false);
  assert.equal(isWithinRadius(10_000, "all"), true);
});

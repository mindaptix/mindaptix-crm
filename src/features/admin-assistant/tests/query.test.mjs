import test from "node:test";
import assert from "node:assert/strict";
import { inferDsrDateRange, findMentionedEmployee } from "../query.ts";

test("DSR assistant resolves today, weekly and monthly scopes without model-selected queries", () => {
  assert.deepEqual(inferDsrDateRange("Aaj Gaurav ne kya kiya?", "2026-09-22"), { start: "2026-09-22", end: "2026-09-22", label: "today" });
  assert.deepEqual(inferDsrDateRange("Give this week's team summary", "2026-09-22"), { start: "2026-09-21", end: "2026-09-22", label: "this week" });
  assert.deepEqual(inferDsrDateRange("Is mahine ka summary", "2026-09-22"), { start: "2026-09-01", end: "2026-09-22", label: "this month" });
});

test("DSR assistant resolves a unique employee mention but avoids ambiguous names", () => {
  const employees = [{ id: "1", fullName: "Gaurav Chauhan" }, { id: "2", fullName: "Jyoti Jaswal" }, { id: "3", fullName: "Gaurav Singh" }];
  assert.equal(findMentionedEmployee("Aaj Gaurav Chauhan ne kya kiya?", employees)?.id, "1");
  assert.equal(findMentionedEmployee("Aaj Jyoti ne kya kiya?", employees)?.id, "2");
  assert.equal(findMentionedEmployee("Aaj Gaurav ne kya kiya?", employees), null);
});

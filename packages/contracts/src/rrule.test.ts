import { describe, expect, it } from "vitest";
import { parseRRule, expandRRule } from "./rrule";

describe("parseRRule", () => {
  it("parses basic daily rule", () => {
    const r = parseRRule("FREQ=DAILY;INTERVAL=2");
    expect(r.freq).toBe("DAILY");
    expect(r.interval).toBe(2);
  });

  it("parses weekly with BYDAY", () => {
    const r = parseRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(r.freq).toBe("WEEKLY");
    expect(r.byday).toEqual(["MO", "WE", "FR"]);
    expect(r.interval).toBe(1);
  });

  it("parses COUNT and UNTIL", () => {
    expect(parseRRule("FREQ=DAILY;COUNT=5").count).toBe(5);
    expect(parseRRule("FREQ=DAILY;UNTIL=20260401").until).toBe("20260401");
  });

  it("parses BYMONTHDAY and BYMONTH", () => {
    const r = parseRRule("FREQ=MONTHLY;BYMONTHDAY=15;BYMONTH=1,6");
    expect(r.bymonthday).toEqual([15]);
    expect(r.bymonth).toEqual([1, 6]);
  });
});

describe("expandRRule — all-day", () => {
  it("daily with interval=2, count=3", () => {
    const results = expandRRule(
      "2026-03-20",
      "FREQ=DAILY;INTERVAL=2;COUNT=3",
      "2026-03-01",
      "2026-04-30",
      undefined,
      true,
    );
    expect(results).toEqual(["2026-03-20", "2026-03-22", "2026-03-24"]);
  });

  it("daily with UNTIL", () => {
    const results = expandRRule(
      "2026-03-20",
      "FREQ=DAILY;UNTIL=20260323",
      "2026-03-01",
      "2026-04-30",
      undefined,
      true,
    );
    expect(results).toEqual(["2026-03-20", "2026-03-21", "2026-03-22", "2026-03-23"]);
  });

  it("weekly with BYDAY=MO,WE,FR", () => {
    // 2026-03-16 is Monday
    const results = expandRRule(
      "2026-03-16",
      "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      "2026-03-16",
      "2026-03-22",
      undefined,
      true,
    );
    // Mon 16, Wed 18, Fri 20
    expect(results).toEqual(["2026-03-16", "2026-03-18", "2026-03-20"]);
  });

  it("monthly", () => {
    const results = expandRRule(
      "2026-01-15",
      "FREQ=MONTHLY;COUNT=4",
      "2026-01-01",
      "2026-12-31",
      undefined,
      true,
    );
    expect(results).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
    ]);
  });

  it("yearly", () => {
    const results = expandRRule(
      "2026-06-01",
      "FREQ=YEARLY;COUNT=3",
      "2026-01-01",
      "2030-12-31",
      undefined,
      true,
    );
    expect(results).toEqual(["2026-06-01", "2027-06-01", "2028-06-01"]);
  });

  it("bounds results to range", () => {
    const results = expandRRule(
      "2026-03-01",
      "FREQ=DAILY",
      "2026-03-10",
      "2026-03-12",
      undefined,
      true,
    );
    expect(results).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"]);
  });
});

describe("expandRRule — timed", () => {
  const start = new Date("2026-03-20T10:00:00Z").getTime();
  const rangeStart = new Date("2026-03-20T00:00:00Z").getTime();
  const rangeEnd = new Date("2026-03-27T00:00:00Z").getTime();

  it("daily with count", () => {
    const results = expandRRule(start, "FREQ=DAILY;COUNT=3", rangeStart, rangeEnd, "UTC");
    expect(results).toHaveLength(3);
    expect(new Date(results[0] as number).toISOString()).toBe("2026-03-20T10:00:00.000Z");
    expect(new Date(results[1] as number).toISOString()).toBe("2026-03-21T10:00:00.000Z");
    expect(new Date(results[2] as number).toISOString()).toBe("2026-03-22T10:00:00.000Z");
  });

  it("weekly with BYDAY", () => {
    // 2026-03-16 is a Monday
    const monStart = new Date("2026-03-16T09:00:00Z").getTime();
    const rStart = new Date("2026-03-16T00:00:00Z").getTime();
    const rEnd = new Date("2026-03-23T00:00:00Z").getTime();

    const results = expandRRule(
      monStart,
      "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      rStart,
      rEnd,
      "UTC",
    );
    expect(results).toHaveLength(3);
    // Mon, Wed, Fri
    expect(new Date(results[0] as number).getUTCDay()).toBe(1); // Mon
    expect(new Date(results[1] as number).getUTCDay()).toBe(3); // Wed
    expect(new Date(results[2] as number).getUTCDay()).toBe(5); // Fri
  });
});

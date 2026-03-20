import { describe, expect, it } from "vitest";
import { serializeCalendar, type IcsCalendar, type IcsEvent } from "./serializer";

const CRLF = "\r\n";

function makeEvent(overrides: Partial<IcsEvent> = {}): IcsEvent {
  return {
    uid: "test-uid-1",
    summary: "Test Event",
    isAllDay: true,
    startDate: "2026-03-20",
    endDateExclusive: "2026-03-21",
    status: "confirmed",
    createdAt: 1742472000000,
    updatedAt: 1742472000000,
    ...overrides,
  };
}

function makeCal(events: IcsEvent[]): IcsCalendar {
  return { name: "Test", events };
}

/** Extract all lines between a matching BEGIN/END pair from ICS output. */
function extractBlocks(ics: string, component: string): string[][] {
  const lines = ics.split(CRLF);
  const blocks: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (line === `BEGIN:${component}`) {
      current = [line];
    } else if (line === `END:${component}` && current) {
      current.push(line);
      blocks.push(current);
      current = null;
    } else if (current) {
      current.push(line);
    }
  }
  return blocks;
}

function findLine(ics: string, prefix: string): string | undefined {
  return ics
    .split(CRLF)
    .find((l) => l.startsWith(prefix));
}

describe("formatDuration via VALARM TRIGGER", () => {
  const cases: [number, string][] = [
    [15, "TRIGGER:-PT15M"],
    [60, "TRIGGER:-PT1H"],
    [90, "TRIGGER:-PT1H30M"],
    [1440, "TRIGGER:-P1D"],
    [0, "TRIGGER:PT0S"],
  ];

  for (const [minutes, expected] of cases) {
    it(`${minutes} minutes → ${expected}`, () => {
      const ics = serializeCalendar(
        makeCal([makeEvent({ alarms: [{ minutes }] })]),
      );
      expect(findLine(ics, "TRIGGER:")).toBe(expected);
    });
  }
});

describe("VALARM blocks", () => {
  it("emits multiple VALARM blocks for multiple alarms", () => {
    const ics = serializeCalendar(
      makeCal([makeEvent({ alarms: [{ minutes: 15 }, { minutes: 60 }] })]),
    );
    const valarms = extractBlocks(ics, "VALARM");
    expect(valarms).toHaveLength(2);

    for (const block of valarms) {
      expect(block).toContain("ACTION:DISPLAY");
      expect(block.some((l) => l.startsWith("DESCRIPTION:"))).toBe(true);
      expect(block.some((l) => l.startsWith("TRIGGER:"))).toBe(true);
    }

    expect(valarms[0].find((l) => l.startsWith("TRIGGER:"))).toBe(
      "TRIGGER:-PT15M",
    );
    expect(valarms[1].find((l) => l.startsWith("TRIGGER:"))).toBe(
      "TRIGGER:-PT1H",
    );
  });

  it("emits no VALARM when alarms is empty", () => {
    const ics = serializeCalendar(makeCal([makeEvent({ alarms: [] })]));
    expect(ics).not.toContain("BEGIN:VALARM");
  });

  it("emits no VALARM when alarms is undefined", () => {
    const ics = serializeCalendar(makeCal([makeEvent()]));
    expect(ics).not.toContain("BEGIN:VALARM");
  });

  it("nests VALARM inside VEVENT (before END:VEVENT)", () => {
    const ics = serializeCalendar(
      makeCal([makeEvent({ alarms: [{ minutes: 10 }] })]),
    );
    const lines = ics.split(CRLF);
    const endVevent = lines.indexOf("END:VEVENT");
    const endValarm = lines.indexOf("END:VALARM");
    expect(endValarm).toBeGreaterThan(-1);
    expect(endVevent).toBeGreaterThan(endValarm);
  });
});

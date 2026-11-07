import { describe, expect, it } from "vitest";
import { makeSpokenSummary, safeFilename } from "../src/lib/format";
describe("meeting formatting", () => {
  it("creates a spoken recap with decisions and action items", () => {
    const text = makeSpokenSummary({ summary: "The launch moves to Friday.", decisions: ["Ship the revised page"], actionItems: [{ task: "Send final copy", owner: "Mia", due: "Friday" }] });
    expect(text).toContain("The launch moves to Friday.");
    expect(text).toContain("Decisions: Ship the revised page.");
    expect(text).toContain("Send final copy, due Friday");
  });
  it("handles missing decisions and actions without inventing them", () => {
    expect(makeSpokenSummary({ summary: "A short update.", decisions: [], actionItems: [] })).toContain("No firm decisions");
  });
  it("creates safe filenames", () => {
    expect(safeFilename("Q4 / Launch: Review!")).toBe("q4-launch-review");
    expect(safeFilename("✨")).toBe("meeting");
  });
});

import { describe, expect, it } from "vitest";
import { analyzeSchema } from "../src/lib/validation";
describe("analysis request validation", () => {
  it("accepts a usable transcript and style", () => {
    const result = analyzeSchema.safeParse({ transcript: "We agreed to move the launch to Friday and Alex will send the revised copy tomorrow.", style: "direct", title: "Launch" });
    expect(result.success).toBe(true);
  });
  it("rejects a transcript too short to analyze", () => {
    const result = analyzeSchema.safeParse({ transcript: "hi", style: "direct", title: "Call" });
    expect(result.success).toBe(false);
  });
  it("rejects an unsupported style", () => {
    const result = analyzeSchema.safeParse({ transcript: "This is a sufficiently long transcript to meet the minimum input length.", style: "clone", title: "Call" });
    expect(result.success).toBe(false);
  });
});

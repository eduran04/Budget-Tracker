import { describe, expect, it } from "vitest";
import { err, ok } from "./result";

describe("result", () => {
  it("ok wraps a success value", () => {
    expect(ok(42)).toEqual({ success: true, value: 42 });
  });

  it("err wraps an error value", () => {
    expect(err("Import failed")).toEqual({ success: false, error: "Import failed" });
  });
});

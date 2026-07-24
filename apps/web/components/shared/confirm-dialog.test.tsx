import { describe, expect, it } from "vitest";
import { canCloseConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("blocks every close request while an action is loading", () => {
    expect(canCloseConfirmDialog(true, false)).toBe(false);
    expect(canCloseConfirmDialog(true, true)).toBe(true);
    expect(canCloseConfirmDialog(false, false)).toBe(true);
  });
});

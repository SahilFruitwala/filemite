import { describe, expect, test } from "vitest";
import {
  initialSlots,
  isUnchanged,
  movedCount,
  moveSlot,
  reverseSlots,
  rotateAll,
  rotatedCount,
  rotateSlot,
  turn,
} from "./page-order";

const pages = (slots: { page: number }[]) => slots.map((slot) => slot.page);

describe("turn", () => {
  test.each([
    [0, 90, 90],
    [270, 90, 0],
    [0, -90, 270],
    [90, -90, 0],
    [90, 180, 270],
    [270, 180, 90],
  ] as const)("%i° + %i° = %i°", (from, by, expected) => {
    expect(turn(from, by)).toBe(expected);
  });
});

describe("slots", () => {
  test("start in order with no rotation", () => {
    const slots = initialSlots(3);
    expect(pages(slots)).toEqual([1, 2, 3]);
    expect(isUnchanged(slots)).toBe(true);
  });

  test("rotateSlot only affects the chosen page and does not mutate", () => {
    const original = initialSlots(3);
    const next = rotateSlot(original, 2, 90);
    expect(next.map((slot) => slot.rotate)).toEqual([0, 90, 0]);
    expect(original.map((slot) => slot.rotate)).toEqual([0, 0, 0]);
    expect(rotatedCount(next)).toBe(1);
  });

  test("rotating four times returns to the start", () => {
    let slots = initialSlots(2);
    for (let i = 0; i < 4; i++) slots = rotateSlot(slots, 1, 90);
    expect(isUnchanged(slots)).toBe(true);
  });

  test("rotateAll turns every page", () => {
    expect(rotateAll(initialSlots(3), -90).map((slot) => slot.rotate)).toEqual([270, 270, 270]);
  });

  test("reverseSlots reverses order but keeps rotations attached to their pages", () => {
    const slots = reverseSlots(rotateSlot(initialSlots(3), 1, 90));
    expect(pages(slots)).toEqual([3, 2, 1]);
    expect(slots[2]).toEqual({ page: 1, rotate: 90 });
  });

  test("moveSlot places a page where another sits, in both directions", () => {
    expect(pages(moveSlot(initialSlots(4), 1, 3))).toEqual([2, 3, 1, 4]);
    expect(pages(moveSlot(initialSlots(4), 4, 2))).toEqual([1, 4, 2, 3]);
  });

  test("moveSlot ignores unknown pages and no-op moves", () => {
    const slots = initialSlots(3);
    expect(moveSlot(slots, 1, 1)).toBe(slots);
    expect(moveSlot(slots, 9, 1)).toBe(slots);
    expect(moveSlot(slots, 1, 9)).toBe(slots);
  });

  test("counts moved and rotated pages", () => {
    const slots = rotateSlot(moveSlot(initialSlots(4), 1, 2), 4, 180);
    expect(movedCount(slots)).toBe(2);
    expect(rotatedCount(slots)).toBe(1);
    expect(isUnchanged(slots)).toBe(false);
  });

  test("moving a page and moving it back counts as unchanged", () => {
    const moved = moveSlot(initialSlots(3), 1, 3); // 2, 3, 1
    expect(isUnchanged(moveSlot(moved, 1, 2))).toBe(true); // back to 1, 2, 3
  });
});

/**
 * Order and rotation state for the Organize Pages tool. Kept free of React so
 * it can be tested on its own. Page numbers are 1-based, as users see them.
 */

export type Rotation = 0 | 90 | 180 | 270;

/** One page in the new document: where it came from and how far it's turned. */
export type PageSlot = { page: number; rotate: Rotation };

export function initialSlots(pageCount: number): PageSlot[] {
  return Array.from({ length: pageCount }, (_, index) => ({ page: index + 1, rotate: 0 }));
}

/** Adds clockwise `degrees` (negative turns counter-clockwise), wrapping at 360. */
export function turn(rotate: Rotation, degrees: 90 | -90 | 180): Rotation {
  return ((((rotate + degrees) % 360) + 360) % 360) as Rotation;
}

export function rotateSlot(slots: PageSlot[], page: number, degrees: 90 | -90 | 180): PageSlot[] {
  return slots.map((slot) =>
    slot.page === page ? { ...slot, rotate: turn(slot.rotate, degrees) } : slot,
  );
}

export function rotateAll(slots: PageSlot[], degrees: 90 | -90 | 180): PageSlot[] {
  return slots.map((slot) => ({ ...slot, rotate: turn(slot.rotate, degrees) }));
}

export function reverseSlots(slots: PageSlot[]): PageSlot[] {
  return [...slots].reverse();
}

/** Moves the slot for `page` to the position currently held by `overPage`. */
export function moveSlot(slots: PageSlot[], page: number, overPage: number): PageSlot[] {
  const from = slots.findIndex((slot) => slot.page === page);
  const to = slots.findIndex((slot) => slot.page === overPage);
  if (from === -1 || to === -1 || from === to) return slots;
  const next = [...slots];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function movedCount(slots: PageSlot[]): number {
  return slots.filter((slot, index) => slot.page !== index + 1).length;
}

export function rotatedCount(slots: PageSlot[]): number {
  return slots.filter((slot) => slot.rotate !== 0).length;
}

export function isUnchanged(slots: PageSlot[]): boolean {
  return movedCount(slots) === 0 && rotatedCount(slots) === 0;
}

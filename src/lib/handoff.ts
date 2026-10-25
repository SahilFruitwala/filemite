/**
 * Carries files picked on the home page over to the tool the visitor chooses.
 * It lives in memory only: the files are passed between pages of the same tab
 * and nothing is uploaded until the tool itself runs.
 */
let pending: File[] | null = null;

export function handOff(files: File[]) {
  pending = files;
}

/** Returns the waiting files once, then forgets them. */
export function takeHandoff(): File[] | null {
  const files = pending;
  pending = null;
  return files;
}

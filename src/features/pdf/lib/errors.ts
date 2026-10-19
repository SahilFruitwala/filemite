// Kept free of MuPDF imports so the worker can use it before the engine loads.

export function isOutOfMemory(error: unknown) {
  return error instanceof Error && /malloc|out of memory|allocat|\bOOM\b|enlarge memory|memory size exceeded|Memory\.grow/i.test(error.message);
}

export const TOO_LARGE_MESSAGE = "This file is too large to process in your browser.";

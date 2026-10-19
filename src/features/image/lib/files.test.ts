import { describe, expect, it } from "vitest";

import { imageProblem, isLargeImage } from "@/features/image/lib/files";
import { MAX_BROWSER_IMAGE_BYTES, MAX_IMAGE_BYTES } from "@/lib/limits";

function fakeFile(name: string, type: string, size: number) {
  const file = new File([""], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("imageProblem", () => {
  const big = MAX_IMAGE_BYTES + 1;

  it("rejects files over the upload limit unless large files are allowed", () => {
    const file = fakeFile("a.jpg", "image/jpeg", big);
    expect(imageProblem(file, "server")).toMatch(/is over/);
    expect(imageProblem(file, "server", { large: true })).toBeNull();
    expect(isLargeImage(file)).toBe(true);
  });

  it("caps large files at the browser limit", () => {
    const file = fakeFile("a.png", "image/png", MAX_BROWSER_IMAGE_BYTES + 1);
    expect(imageProblem(file, "server", { large: true })).toMatch(/is over/);
  });

  it("rejects HEIC over the upload limit, since browsers cannot decode it", () => {
    const file = fakeFile("a.heic", "image/heic", big);
    expect(imageProblem(file, "server", { large: true })).toMatch(/HEIC/);
    expect(
      imageProblem(fakeFile("a.heic", "image/heic", 1000), "server", {
        large: true,
      }),
    ).toBeNull();
  });
});

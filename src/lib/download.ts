export type OutputFile = {
  name: string;
  bytes: Uint8Array;
};

export function pdfBlob(bytes: Uint8Array) {
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadFile(file: OutputFile) {
  downloadBlob(pdfBlob(file.bytes), file.name);
}

/** Bundles files into a ZIP (stored, since PDFs and images are already compressed). */
export async function downloadZip(files: OutputFile[], zipName: string) {
  const { zip } = await import('fflate');
  const used = new Set<string>();
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const file of files) {
    entries[uniqueName(file.name, used)] = [file.bytes, { level: 0 }];
  }
  const data = await new Promise<Uint8Array>((resolve, reject) =>
    zip(entries, (error, result) => (error ? reject(error) : resolve(result))),
  );
  downloadBlob(new Blob([data as BlobPart], { type: 'application/zip' }), zipName);
}

/** Zips blobs (e.g. API results) without the caller converting them first. */
export async function downloadBlobsAsZip(files: { name: string; blob: Blob }[], zipName: string) {
  const outputs = await Promise.all(
    files.map(async ({ name, blob }) => ({
      name,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    })),
  );
  await downloadZip(outputs, zipName);
}

/** ZIP entries must be unique; "a.png" twice becomes "a.png" and "a (2).png". */
function uniqueName(name: string, used: Set<string>) {
  let candidate = name;
  for (let n = 2; used.has(candidate); n++) {
    candidate = name.replace(/(\.[^.]*)?$/, (ext) => ` (${n})${ext}`);
  }
  used.add(candidate);
  return candidate;
}

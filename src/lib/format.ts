export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 10 ? 2 : 1).replace(/\.0+$/, '')} MB`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** File name without a trailing `.pdf`, safe to reuse in output names. */
export function baseName(fileName: string) {
  return fileName.replace(/\.pdf$/i, '').trim() || 'document';
}

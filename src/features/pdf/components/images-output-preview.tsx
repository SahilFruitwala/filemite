import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { PageGrid } from "@/features/pdf/components/single-document";
import { Button } from "@/components/ui/button";
import type { OutputFile } from "@/lib/download";

/** Grid of the rendered page images, shown before the user downloads them. */
export function ImagesOutputPreview({
  files,
  mime,
  onEdit,
}: {
  files: OutputFile[];
  mime: string;
  onEdit?: () => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const made = files.map((file) =>
      URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: mime }))
    );
    // Object URLs are an external resource: create and revoke them alongside the files.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(made);
    return () => made.forEach((url) => URL.revokeObjectURL(url));
  }, [files, mime]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <p className="mr-auto text-sm font-medium">Preview of your images</p>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            Back to settings
          </Button>
        )}
      </div>
      <PageGrid>
        {files.map((file, index) => (
          <figure key={file.name} className="space-y-1.5">
            <div className="bg-checker aspect-[3/4] overflow-hidden rounded-lg border border-border">
              {urls[index] && (
                <img src={urls[index]} alt={file.name} className="size-full object-contain" />
              )}
            </div>
            <figcaption className="truncate font-mono text-[11px] text-muted-foreground" title={file.name}>
              {file.name}
            </figcaption>
          </figure>
        ))}
      </PageGrid>
    </div>
  );
}

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, RotateCcw, RotateCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useObjectUrl } from '@/features/image/lib/files';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

export type SortableImage = { id: string; file: File; turn?: 0 | 90 | 180 | 270 };

/**
 * A grid of image cards the user can drag into order. Each card shows a
 * thumbnail, the file name and a remove button; pass `onTurn` to add rotate buttons.
 */
export function ImageSortGrid({
  items,
  onReorder,
  onRemove,
  onTurn,
  noun = 'Image',
}: {
  items: SortableImage[];
  onReorder: (items: SortableImage[]) => void;
  onRemove: (id: string) => void;
  onTurn?: (id: string, degrees: 90 | -90) => void;
  noun?: string;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch screens a swipe should still scroll the page: press and hold to pick a card up.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
          {items.map((item, index) => (
            <Card
              key={item.id}
              item={item}
              position={index + 1}
              noun={noun}
              onRemove={() => onRemove(item.id)}
              onTurn={onTurn ? (degrees) => onTurn(item.id, degrees) : undefined}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function Card({
  item,
  position,
  noun,
  onRemove,
  onTurn,
}: {
  item: SortableImage;
  position: number;
  noun: string;
  onRemove: () => void;
  onTurn?: (degrees: 90 | -90) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const url = useObjectUrl(item.file);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        isDragging && 'z-10 rotate-1 shadow-lg ring-2 ring-primary/40',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`${noun} ${position}, ${item.file.name}. Press space to move.`}
        className="cursor-grab touch-manipulation outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-[11px] font-medium text-primary-foreground">
            {position}
          </span>
        </div>
        <div className="bg-checker flex aspect-square items-center justify-center overflow-hidden p-1.5">
          {url && (
            <img
              src={url}
              alt=""
              draggable={false}
              className="max-h-full max-w-full object-contain transition-transform duration-200"
              style={{ transform: item.turn ? `rotate(${item.turn}deg)` : undefined }}
            />
          )}
        </div>
      </div>
      <div className="border-t border-border p-1.5">
        <div className="px-1">
          <p className="truncate text-xs font-medium" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground tabular">{formatBytes(item.file.size)}</p>
        </div>
        <div className="mt-1 flex items-center justify-end gap-0.5">
          {onTurn && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Rotate ${item.file.name} left`}
                onClick={() => onTurn(-90)}
              >
                <RotateCcw />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Rotate ${item.file.name} right`}
                onClick={() => onTurn(90)}
              >
                <RotateCw />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" aria-label={`Remove ${item.file.name}`} onClick={onRemove}>
            <X />
          </Button>
        </div>
      </div>
    </li>
  );
}

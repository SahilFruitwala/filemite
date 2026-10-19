import { useCallback, useState } from "react";

import type { EditorItem } from "@/features/pdf/lib/editor-items";

type History = { items: EditorItem[]; past: EditorItem[][] };

const MAX_UNDO = 100;

/**
 * The marks a person has placed on a document, with undo. Gestures that
 * change an item many times (dragging) call `begin` once, then `patch`
 * with `record: false`, so one drag is one undo step.
 */
export function useEditorItems() {
  const [state, setState] = useState<History>({ items: [], past: [] });

  const remember = (current: History, items: EditorItem[]): History => ({
    items,
    past: [...current.past, current.items].slice(-MAX_UNDO),
  });

  const add = useCallback((item: EditorItem) => {
    setState((current) => remember(current, [...current.items, item]));
  }, []);

  /** Starts a multi-step change: the next undo returns to the items as they are now. */
  const begin = useCallback(() => {
    setState((current) => remember(current, current.items));
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<EditorItem> | ((item: EditorItem) => Partial<EditorItem>), record = true) => {
      setState((current) => {
        const items = current.items.map((item) =>
          item.id === id
            ? ({
                ...item,
                ...(typeof changes === "function" ? changes(item) : changes),
              } as EditorItem)
            : item
        );
        return record ? remember(current, items) : { ...current, items };
      });
    },
    []
  );

  const remove = useCallback((id: string) => {
    setState((current) =>
      remember(
        current,
        current.items.filter((item) => item.id !== id)
      )
    );
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.past[current.past.length - 1];
      return previous ? { items: previous, past: current.past.slice(0, -1) } : current;
    });
  }, []);

  const clear = useCallback(() => setState({ items: [], past: [] }), []);

  return {
    items: state.items,
    canUndo: state.past.length > 0,
    add,
    begin,
    patch,
    remove,
    undo,
    clear,
  };
}

export type EditorItems = ReturnType<typeof useEditorItems>;

/**
 * Where the server-backed image tools do their work: on the server (Sharp)
 * or on this device (browser-image.ts). One setting shared by every tool and
 * remembered between visits.
 */
import { useCallback, useSyncExternalStore } from 'react';

import { Field, Segmented } from '@/components/tool/tool-ui';
import { formatBytes } from '@/lib/format';
import { ACCEPTED_IMAGE_TYPES, MAX_BROWSER_IMAGE_BYTES } from '@/lib/limits';
import {
  BROWSER_IMAGE_HINT,
  BROWSER_IMAGE_TYPES,
  SERVER_IMAGE_HINT,
  imageProblem,
  partitionImages,
} from './files';

export type ProcessingMode = 'server' | 'browser';

const STORAGE_KEY = 'filemite:image-processing';
const DEFAULT_MODE: ProcessingMode = 'server';

const listeners = new Set<() => void>();

function read(): ProcessingMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'server' || stored === 'browser' ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE; // storage blocked
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other open tabs in step.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function useProcessingMode() {
  const mode = useSyncExternalStore(subscribe, read, () => DEFAULT_MODE);
  const setMode = useCallback((next: ProcessingMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked — the choice won't be remembered
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [mode, setMode] as const;
}

const HEIC = /hei[cf]/i;

/** Like partitionImages, with the limits of whichever mode is active. */
export function partitionForMode(
  files: File[],
  mode: ProcessingMode,
  options?: { large?: boolean },
) {
  if (mode === 'server') return partitionImages(files, 'server', options);
  const accepted: File[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const problem = HEIC.test(`${file.type} ${file.name}`)
      ? `“${file.name}” is HEIC, which browsers can’t open. Switch to server processing for it.`
      : file.size > MAX_BROWSER_IMAGE_BYTES
        ? `“${file.name}” is over ${formatBytes(MAX_BROWSER_IMAGE_BYTES)}.`
        : imageProblem(file, 'browser');
    if (problem) problems.push(problem);
    else accepted.push(file);
  }
  return { accepted, notice: problems.length ? problems.join(' ') : null };
}

export const acceptFor = (mode: ProcessingMode) =>
  mode === 'server' ? ACCEPTED_IMAGE_TYPES : BROWSER_IMAGE_TYPES;

export const hintFor = (mode: ProcessingMode) =>
  mode === 'server'
    ? SERVER_IMAGE_HINT
    : `${BROWSER_IMAGE_HINT} · up to ${formatBytes(MAX_BROWSER_IMAGE_BYTES)}`;

const MODE_HINT: Record<ProcessingMode, string> = {
  server: 'Processed in memory on our server and discarded. Handles HEIC.',
  browser: 'Never uploaded — runs on your device. No HEIC, and PNGs can come out larger.',
};

export function ProcessingModeField({
  mode,
  onChange,
  disabled,
}: {
  mode: ProcessingMode;
  onChange: (mode: ProcessingMode) => void;
  disabled?: boolean;
}) {
  return (
    <Field label="Processing" hint={MODE_HINT[mode]}>
      <Segmented
        label="Processing"
        value={mode}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: 'server', label: 'Server' },
          { value: 'browser', label: 'This device' },
        ]}
      />
    </Field>
  );
}

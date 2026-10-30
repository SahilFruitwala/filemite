import { capture } from '@/lib/capture';
import { useCallback, useRef, useState } from 'react';

export type JobState<T> =
  | { status: 'idle' }
  | { status: 'running'; progress: number | null }
  | { status: 'done'; result: T }
  | { status: 'error'; error: string };

export type ReportProgress = (done: number, total: number) => void;

/**
 * Runs one engine job at a time and tracks its progress and outcome. With a `tool`
 * name it also sends `<tool>_started`, `_completed` and `_failed` analytics events
 * (duration only, never file names or error text).
 */
export function useJob<T>(tool?: string) {
  const [state, setState] = useState<JobState<T>>({ status: 'idle' });
  const runId = useRef(0);

  const run = useCallback(async (job: (progress: ReportProgress) => Promise<T>) => {
    const id = ++runId.current;
    setState({ status: 'running', progress: null });
    const startedAt = performance.now();
    if (tool) capture(`${tool}_started`);
    try {
      const result = await job((done, total) => {
        if (id === runId.current && total > 0) {
          setState({ status: 'running', progress: done / total });
        }
      });
      if (tool) capture(`${tool}_completed`, { time_ms: Math.round(performance.now() - startedAt) });
      if (id === runId.current) setState({ status: 'done', result });
    } catch (error) {
      if (tool) capture(`${tool}_failed`, { time_ms: Math.round(performance.now() - startedAt) });
      if (id === runId.current) {
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Something went wrong.',
        });
      }
    }
  }, [tool]);

  /** Clears the result; a job still running is ignored when it finishes. */
  const reset = useCallback(() => {
    runId.current++;
    setState({ status: 'idle' });
  }, []);

  return { state, run, reset };
}

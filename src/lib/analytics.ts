type EventLike = { event: string; properties?: Record<string, unknown> } | null;

const EXCEPTION_FREE_TEXT = ['$exception_message', '$exception_values', '$exception_source', '$exception_steps'];

/**
 * `before_send` hook: error reports keep only the exception type and the stack
 * (which function failed), never the message, which can contain file names or
 * other user data.
 */
export function sanitizeEvent<T extends EventLike>(event: T): T {
  if (!event || event.event !== '$exception' || !event.properties) return event;
  const properties = { ...event.properties };
  for (const key of EXCEPTION_FREE_TEXT) delete properties[key];

  const list = properties['$exception_list'];
  if (Array.isArray(list)) {
    properties['$exception_list'] = list.map((entry: Record<string, unknown>) => {
      const frames = (entry.stacktrace as { frames?: Record<string, unknown>[] } | undefined)?.frames;
      return {
        type: entry.type,
        value: 'An error occurred',
        mechanism: entry.mechanism,
        stacktrace: frames && {
          type: 'raw',
          frames: frames.map(({ filename, function: fn, lineno, colno, in_app, module }) => ({
            filename, function: fn, lineno, colno, in_app, module,
          })),
        },
      };
    });
  }
  return { ...event, properties };
}

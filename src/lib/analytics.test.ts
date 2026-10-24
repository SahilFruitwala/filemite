import { describe, expect, it } from 'vitest';

import { sanitizeEvent } from './analytics';

describe('sanitizeEvent', () => {
  it('keeps the failing function but drops the error message', () => {
    const event = sanitizeEvent({
      event: '$exception',
      properties: {
        $exception_message: 'cannot read holiday-photo.jpg',
        $exception_values: ['cannot read holiday-photo.jpg'],
        $exception_list: [
          {
            type: 'Error',
            value: 'cannot read holiday-photo.jpg',
            stacktrace: {
              type: 'raw',
              frames: [{ filename: '/assets/app.js', function: 'compressImage', lineno: 3, context_line: 'secret' }],
            },
          },
        ],
      },
    });
    const text = JSON.stringify(event);
    expect(text).not.toContain('holiday-photo');
    expect(text).not.toContain('secret');
    expect(text).toContain('compressImage');
    expect(text).toContain('An error occurred');
  });

  it('leaves other events alone', () => {
    const event = { event: 'pdf_merge_started', properties: { a: 1 } };
    expect(sanitizeEvent(event)).toBe(event);
  });
});

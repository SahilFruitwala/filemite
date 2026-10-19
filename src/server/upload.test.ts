import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { binaryResponse, intField, processingError, readImageUpload } from './upload';
import { ImageInputError } from './image';

async function png() {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: '#123' } })
    .png()
    .toBuffer();
}

function request(form: FormData) {
  return new Request('http://localhost/api/image/compress', { method: 'POST', body: form });
}

describe('readImageUpload', () => {
  test('returns the parsed file with its sniffed format', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array(await png())], 'a.png', { type: 'image/png' }));
    const result = await readImageUpload(request(form));
    expect(result).not.toBeInstanceOf(Response);
    if (result instanceof Response) return;
    expect(result.format).toBe('png');
    expect(result.file.name).toBe('a.png');
  });

  test('400s when the body is not multipart', async () => {
    const result = await readImageUpload(
      new Request('http://x', { method: 'POST', body: 'plain', headers: { 'content-type': 'text/plain' } }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('400s when there is no file field', async () => {
    const form = new FormData();
    form.set('file', 'a string, not a file');
    const result = (await readImageUpload(request(form))) as Response;
    expect(result.status).toBe(400);
  });

  test('413s a file over the limit even if Content-Length lied', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    expect(((await readImageUpload(request(form))) as Response).status).toBe(413);
  });

  test('415s an unsupported format', async () => {
    const form = new FormData();
    form.set('file', new File([new Uint8Array(64)], 'a.gif', { type: 'image/gif' }));
    expect(((await readImageUpload(request(form))) as Response).status).toBe(415);
  });
});

describe('intField', () => {
  const form = (value?: string) => {
    const data = new FormData();
    if (value !== undefined) data.set('n', value);
    return data;
  };

  test('returns undefined when absent or empty', () => {
    expect(intField(form(), 'n', 10)).toBeUndefined();
    expect(intField(form(''), 'n', 10)).toBeUndefined();
  });

  test('accepts integers in range', () => {
    expect(intField(form('0'), 'n', 10)).toBe(0);
    expect(intField(form('10'), 'n', 10)).toBe(10);
  });

  test.each(['11', '-1', '1.5', 'abc', 'Infinity', 'NaN'])('rejects %s', (value) => {
    expect(intField(form(value), 'n', 10)).toBeNull();
  });
});

describe('processingError', () => {
  test('maps known input errors to 422', async () => {
    const response = processingError(new ImageInputError('bad image'), 'Compression');
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'bad image' });
  });

  test('hides unexpected error details behind a 500', async () => {
    const response = processingError(new Error('secret internals'), 'Compression');
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('secret internals');
  });
});

describe('binaryResponse', () => {
  test('sets download headers and never caches', () => {
    const response = binaryResponse(new Uint8Array([1, 2, 3]), 'image/png', 'out.png');
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Content-Length')).toBe('3');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="out.png"');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  test('strips characters that could break the header', () => {
    const response = binaryResponse(new Uint8Array(1), 'image/png', 'a"b\r\nSet-Cookie: x.png');
    const disposition = response.headers.get('Content-Disposition') ?? '';
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition.match(/"/g)).toHaveLength(2);
  });
});

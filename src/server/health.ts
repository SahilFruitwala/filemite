/**
 * Liveness check for uptime monitors. Loading Sharp here means a broken native
 * binary (the usual way this app fails after a deploy) shows up as a failed check
 * instead of as user-facing image errors.
 */
import sharp from 'sharp';

export type Health = { status: 'ok'; vips: string } | { status: 'error'; error: string };

export function getHealth(): Health {
  try {
    const vips = sharp.versions.vips;
    if (!vips) throw new Error('libvips is not available');
    return { status: 'ok', vips };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : 'unknown error' };
  }
}

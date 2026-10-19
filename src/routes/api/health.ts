import { createFileRoute } from '@tanstack/react-router';
import { getHealth } from '@/server/health';

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => {
        const health = getHealth();
        return new Response(JSON.stringify(health), {
          status: health.status === 'ok' ? 200 : 503,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      },
    },
  },
});

import { HEALTH_PATH, type HealthResponse } from '../src/shared/health'

export const app = {
  fetch(request: Request): Response {
    if (
      request.method === 'GET' &&
      new URL(request.url).pathname === HEALTH_PATH
    ) {
      return Response.json({ status: 'ok' } satisfies HealthResponse)
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

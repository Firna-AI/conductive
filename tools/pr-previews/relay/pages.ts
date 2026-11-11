import { escapeHtml } from '../html.ts'
import type { RelayEnv } from './env.ts'
import { previewNumbers } from './previews.ts'

export async function listPage(
  request: Request,
  env: RelayEnv,
): Promise<Response> {
  const numbers = await previewNumbers(env.PREVIEWS)
  const items = numbers
    .map((number) => {
      const label = escapeHtml(String(number))
      const app = escapeHtml(`https://pr-${number}-app.${env.PREVIEW_ZONE}`)
      const marketing = escapeHtml(`https://pr-${number}.${env.PREVIEW_ZONE}`)
      return `<li>PR ${label}: <a href="${app}">App</a> · <a href="${marketing}">Marketing</a></li>`
    })
    .join('\n')
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pull request previews</title></head><body><h1>Pull request previews</h1><p>${escapeHtml(env.PREVIEW_ZONE)}</p>${items ? `<ul>${items}</ul>` : '<p>No live previews.</p>'}</body></html>`
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'",
    },
  })
}

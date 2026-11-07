import type { createPreviewHandler } from './handler'

type Handler = ReturnType<typeof createPreviewHandler>
type AppRequest = (path: string, init?: RequestInit) => Request

/** Reads the public launch form without copying its private route or field. */
export function launchForm(html: string) {
  const action = /<form[^>]*action="([^"]+)"/.exec(html)?.[1]
  const fields = [
    ...html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]+)"/g),
  ]
  if (!action || fields.length !== 2)
    throw new Error('Missing preview launch form')
  return {
    action,
    body: new URLSearchParams(fields.map((field) => [field[1], field[2]])),
  }
}

export function handoffRequest(
  form: ReturnType<typeof launchForm>,
  origin: string,
): Request {
  return new Request(form.action, {
    method: 'POST',
    headers: { Origin: origin },
    body: form.body,
  })
}

/** Performs the same two navigations as an iframe or a new browser tab. */
export async function launchPreview(
  handler: Handler,
  appRequest: AppRequest,
  launchUrl: string,
) {
  const url = new URL(launchUrl)
  const page = await handler.fetch(appRequest(url.pathname))
  if (page.status !== 200) throw new Error(`Launch failed: ${page.status}`)
  const form = launchForm(await page.text())
  const response = await handler.proxy(handoffRequest(form, url.origin))
  const cookie = response.headers.getSetCookie()[0]?.split(';')[0]
  const location = response.headers.get('Location')
  if (response.status !== 303 || !cookie || !location)
    throw new Error(`Handoff failed: ${response.status}`)
  const previewUrl = new URL(location, form.action).origin
  return {
    cookie,
    previewUrl,
    request: (input = previewUrl, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      const application = headers.get('Cookie')
      headers.set('Cookie', application ? `${cookie}; ${application}` : cookie)
      return new Request(input, { ...init, headers })
    },
  }
}

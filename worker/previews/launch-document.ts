import { previewOpeningPage, previewOpeningStyleSource } from './opening-page'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;')
}

/** Trusted app launcher markup. Its form posts only to the dedicated authorizer. */
export function previewLaunchDocument(input: {
  action: string
  hostname: string
  grant: string
  nonce: string
  appOrigin: string
  desktopOrigin: string
  path?: string
}) {
  const preview = new URL(input.action)
  preview.hostname = input.hostname
  const path =
    input.path === undefined
      ? ''
      : `<input type="hidden" name="path" value="${escapeHtml(input.path)}">`
  return {
    html: previewOpeningPage({
      nonce: input.nonce,
      extra: `<form action="${input.action}" method="post"><input type="hidden" name="hostname" value="${input.hostname}"><input type="hidden" name="grant" value="${input.grant}">${path}</form>`,
      script: 'document.forms[0].submit()',
    }),
    policy: `default-src 'none'; script-src 'nonce-${input.nonce}'; ${previewOpeningStyleSource(input.nonce)}; form-action ${new URL(input.action).origin} ${preview.origin}; frame-ancestors ${input.appOrigin} ${input.desktopOrigin}; base-uri 'none'`,
  }
}

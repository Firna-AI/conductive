import { previewOpeningPage, previewOpeningStyleSource } from './opening-page'

/** Trusted app launcher markup. Its form posts only to the dedicated authorizer. */
export function previewLaunchDocument(input: {
  action: string
  hostname: string
  grant: string
  nonce: string
  appOrigin: string
  desktopOrigin: string
}) {
  const preview = new URL(input.action)
  preview.hostname = input.hostname
  return {
    html: previewOpeningPage({
      nonce: input.nonce,
      extra: `<form action="${input.action}" method="post"><input type="hidden" name="hostname" value="${input.hostname}"><input type="hidden" name="grant" value="${input.grant}"></form>`,
      script: 'document.forms[0].submit()',
    }),
    policy: `default-src 'none'; script-src 'nonce-${input.nonce}'; ${previewOpeningStyleSource(input.nonce)}; form-action ${new URL(input.action).origin} ${preview.origin}; frame-ancestors ${input.appOrigin} ${input.desktopOrigin}; base-uri 'none'`,
  }
}

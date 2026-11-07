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
    html: `<!doctype html><html><head><meta charset="utf-8"></head><body><form action="${input.action}" method="post"><input type="hidden" name="hostname" value="${input.hostname}"><input type="hidden" name="grant" value="${input.grant}"></form><script nonce="${input.nonce}">document.forms[0].submit()</script></body></html>`,
    policy: `default-src 'none'; script-src 'nonce-${input.nonce}'; form-action ${new URL(input.action).origin} ${preview.origin}; frame-ancestors ${input.appOrigin} ${input.desktopOrigin}; base-uri 'none'`,
  }
}

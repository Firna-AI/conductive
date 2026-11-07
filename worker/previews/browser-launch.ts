/** Trusted authorizer markup. No sandbox-controlled script can run on this origin. */
export function previewBrowserDocument(nonce: string) {
  const script = `
const fragment = location.hash
history.replaceState(null, '', location.pathname)
const failed = () => {
  document.getElementById('status').textContent = 'The preview is not available. Open it again from the workspace.'
}
const fields = new URLSearchParams(fragment.slice(1))
const grant = fields.get('grant')
const hostname = fields.get('hostname')
async function launch() {
  const url = new URL(location.href)
  url.searchParams.set('hostname', hostname)
  const response = await fetch(url, {
    method: 'POST', credentials: 'include',
    headers: { Authorization: 'Bearer ' + grant, Accept: 'application/json' },
  })
  if (!response.ok) throw new Error()
  const value = await response.json()
  const target = new URL(value.url)
  if (target.protocol !== 'https:' || target.hostname !== hostname ||
      target.port !== location.port || target.username || target.password ||
      target.pathname !== '/' || target.search || target.hash) throw new Error()
  location.replace(target.href)
}
if (fields.getAll('grant').length !== 1 || fields.getAll('hostname').length !== 1 || !grant || !hostname) {
  failed()
} else {
  launch().catch(failed)
}`
  return {
    html: `<!doctype html><html><head><meta charset="utf-8"></head><body><p id="status" role="status">Opening preview.</p><script nonce="${nonce}">${script}</script></body></html>`,
    policy: `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'`,
  }
}

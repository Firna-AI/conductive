import {
  failPreviewScript,
  previewOpeningPage,
  previewOpeningStyleSource,
} from './opening-page'

/** Trusted authorizer markup. No sandbox-controlled script can run on this origin. */
export function previewBrowserDocument(nonce: string) {
  const script = `${failPreviewScript}
const fragment = location.hash
history.replaceState(null, '', location.pathname)
const fields = new URLSearchParams(fragment.slice(1))
const grant = fields.get('grant')
const hostname = fields.get('hostname')
const path = fields.get('path')
const pathname = path === null ? '/' : '/' + path.split('/').map(encodeURIComponent).join('/')
async function launch() {
  const url = new URL(location.href)
  url.searchParams.set('hostname', hostname)
  if (path !== null) url.searchParams.set('path', path)
  const response = await fetch(url, {
    method: 'POST', credentials: 'include',
    headers: { Authorization: 'Bearer ' + grant, Accept: 'application/json' },
  })
  if (!response.ok) throw new Error()
  const value = await response.json()
  const target = new URL(value.url)
  if (target.protocol !== 'https:' || target.hostname !== hostname ||
      target.port !== location.port || target.username || target.password ||
      target.pathname !== pathname || target.search || target.hash) throw new Error()
  location.replace(target.href)
}
if (fields.getAll('grant').length !== 1 || fields.getAll('hostname').length !== 1 || fields.getAll('path').length > 1 || !grant || !hostname) {
  failPreview()
} else {
  launch().catch(failPreview)
}`
  return {
    html: previewOpeningPage({ nonce, script }),
    policy: `default-src 'none'; script-src 'nonce-${nonce}'; ${previewOpeningStyleSource(nonce)}; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'`,
  }
}

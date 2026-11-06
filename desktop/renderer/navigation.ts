import { navigationTarget } from '../src/navigation.js'

/** Handle the trusted document's app popups before the source-less native callback. */
export function installAppPopups(appOrigin: string): void {
  if (window !== window.top) return
  const navigate = (address: string | URL): boolean => {
    let url: URL
    try {
      url = new URL(String(address), window.location.href)
    } catch {
      return false
    }
    const result = navigationTarget(url.href, appOrigin, 'trusted-main', true)
    if (result.action === 'load') window.location.assign(result.url)
    else if (result.action === 'sign-in') window.location.assign(url.href)
    else return false
    return true
  }
  const open = window.open.bind(window)
  window.open = (address, target, features) => {
    if (address !== undefined && navigate(address)) return null
    return open(address, target, features)
  }
  const follow = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button > 1) return
    const anchor = event
      .composedPath()
      .find((target) => target instanceof HTMLAnchorElement)
    if (!(anchor instanceof HTMLAnchorElement)) return
    const popup =
      anchor.target === '_blank' ||
      event.button === 1 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey
    if (popup && navigate(anchor.href)) event.preventDefault()
  }
  document.addEventListener('click', follow)
  document.addEventListener('auxclick', follow)
}

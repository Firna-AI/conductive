declare const __CONDUCTIVE_RELEASE__: string | undefined

export const ERROR_TRACKING_RELEASE =
  typeof __CONDUCTIVE_RELEASE__ === 'string'
    ? __CONDUCTIVE_RELEASE__
    : undefined

export const BROWSER_ERROR_TRACKING_DSN: string = ''
export const BROWSER_ERROR_TRACKING_ORIGIN = errorTrackingDsnOrigin(
  BROWSER_ERROR_TRACKING_DSN,
)

export function errorTrackingDsnOrigin(value: string): string | undefined {
  if (/\s/.test(value)) return undefined
  const match = value.match(
    /^https:\/\/[A-Za-z0-9]+@s([1-9][0-9]*)\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)\.betterstackdata\.com\/([1-9][0-9]*)$/,
  )
  if (!match || match[1] !== match[3]) return undefined
  return `https://s${match[1]}.${match[2]}.betterstackdata.com`
}

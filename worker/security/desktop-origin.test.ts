import { expect, it } from 'vitest'

import { DESKTOP_ORIGIN } from './desktop-contract'
import { desktopCors, desktopPreflight, trustedOrigin } from './desktop-origin'

it('admits exact desktop API origins and preflights without admitting untrusted origins or headers', () => {
  expect(
    trustedOrigin(DESKTOP_ORIGIN, { APP_ORIGIN: 'https://app.test' }),
  ).toBe(true)
  const request = new Request('https://app.test/api/session', {
    method: 'OPTIONS',
    headers: {
      Origin: DESKTOP_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  })
  const response = desktopPreflight(request)
  expect(response?.status).toBe(204)
  expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(response?.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  const foreign = new Request(request.url, {
    headers: { Origin: 'conducting-app://other' },
  })
  expect(
    trustedOrigin('conducting-app://other', { APP_ORIGIN: 'https://app.test' }),
  ).toBe(false)
  expect(
    desktopCors(foreign, new Response()).headers.get(
      'Access-Control-Allow-Origin',
    ),
  ).toBeNull()
  request.headers.set('Access-Control-Request-Headers', 'Authorization')
  expect(() => desktopPreflight(request)).toThrow('Open the app to continue.')
})

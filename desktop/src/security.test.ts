import { expect, it } from 'vitest'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import { navigationTarget } from './navigation.js'
import { permissionAllowed } from './permissions.js'

it('keeps privileged schemes and remote pages out of the bundled main frame', () => {
  expect(
    navigationTarget('https://example.com/path', 'https://app.conducting.test'),
  ).toEqual({
    action: 'external',
    url: 'https://example.com/path',
  })
  expect(
    navigationTarget(
      'https://app.conducting.test/org/one?q=two#chat',
      'https://app.conducting.test',
    ),
  ).toEqual({
    action: 'load',
    url: `${DESKTOP_ORIGIN}/org/one?q=two#chat`,
  })
  expect(
    navigationTarget(
      `${DESKTOP_ORIGIN}/api/auth/github`,
      'https://app.conducting.test',
    ),
  ).toEqual({ action: 'sign-in' })
  for (const address of [
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://user:pass@example.com/',
    'conducting-app://other/',
  ]) {
    expect(
      navigationTarget(address, 'https://app.conducting.test'),
      address,
    ).toEqual({ action: 'drop' })
  }
})

it('allows sanitized clipboard writes only in the bundled main frame', () => {
  expect(
    permissionAllowed('clipboard-sanitized-write', true, `${DESKTOP_ORIGIN}/`),
  ).toBe(true)
  for (const [permission, main, address] of [
    ['clipboard-read', true, DESKTOP_ORIGIN],
    ['clipboard-sanitized-write', false, DESKTOP_ORIGIN],
    ['clipboard-sanitized-write', true, 'https://untrusted.test'],
    ['media', true, DESKTOP_ORIGIN],
  ] as const)
    expect(permissionAllowed(permission, main, address)).toBe(false)
})

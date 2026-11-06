import { expect, it } from 'vitest'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import { navigationTarget } from './navigation.js'
import { permissionAllowed } from './permissions.js'

it('keeps privileged schemes and remote pages out of the bundled main frame', () => {
  expect(
    navigationTarget(
      'https://example.com/path',
      'https://app.conducting.test',
      'trusted-main',
    ),
  ).toEqual({
    action: 'external',
    url: 'https://example.com/path',
  })
  expect(
    navigationTarget(
      'https://app.conducting.test/org/one?q=two#chat',
      'https://app.conducting.test',
      'trusted-main',
    ),
  ).toEqual({
    action: 'load',
    url: `${DESKTOP_ORIGIN}/org/one?q=two#chat`,
  })
  expect(
    navigationTarget(
      `${DESKTOP_ORIGIN}/api/auth/github`,
      'https://app.conducting.test',
      'trusted-main',
    ),
  ).toEqual({ action: 'sign-in' })
  for (const address of [
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://user:pass@example.com/',
    'conducting-app://other/',
  ]) {
    expect(
      navigationTarget(address, 'https://app.conducting.test', 'trusted-main'),
      address,
    ).toEqual({ action: 'drop' })
  }
})

it('refuses app navigation and sign-in from child or unknown popup sources', () => {
  for (const address of [
    `${DESKTOP_ORIGIN}/frame-takeover`,
    'https://app.conducting.test/frame-takeover',
    `${DESKTOP_ORIGIN}/api/auth/github`,
    'https://app.conducting.test/api/auth/github',
  ]) {
    expect(
      navigationTarget(
        address,
        'https://app.conducting.test',
        'untrusted',
        true,
      ),
      address,
    ).toEqual({ action: 'drop' })
  }
  expect(
    navigationTarget(
      'https://example.com/review',
      'https://app.conducting.test',
      'untrusted',
      true,
    ),
  ).toEqual({ action: 'external', url: 'https://example.com/review' })
  expect(
    navigationTarget(
      `${DESKTOP_ORIGIN}/trusted-popup`,
      'https://app.conducting.test',
      'trusted-main',
      true,
    ),
  ).toEqual({ action: 'load', url: `${DESKTOP_ORIGIN}/trusted-popup` })
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

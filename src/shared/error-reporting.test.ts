import { expect, it } from 'vitest'
import { errorTrackingDsnOrigin } from './error-reporting.ts'

it('returns only the origin of a valid Better Stack DSN', () => {
  expect(
    errorTrackingDsnOrigin(
      'https://AbC123@s123.eu-nbg-2.betterstackdata.com/123',
    ),
  ).toBe('https://s123.eu-nbg-2.betterstackdata.com')
  expect(
    errorTrackingDsnOrigin(
      'https://AbC123@s123.eu.nbg-2.betterstackdata.com/123',
    ),
  ).toBe('https://s123.eu.nbg-2.betterstackdata.com')
})

it('gives no allowed origin to a DSN outside the approved form', () => {
  const invalid = [
    '',
    'http://key@s123.eu-nbg-2.betterstackdata.com/123',
    'https://key:password@s123.eu-nbg-2.betterstackdata.com/123',
    'https://key@s123.eu-nbg-2.betterstackdata.com:443/123',
    'https://key@s123.eu-nbg-2.betterstackdata.com/123?secret=token',
    'https://key@s123.eu-nbg-2.betterstackdata.com/123#token',
    'https://key@s123.eu-nbg-2.betterstackdata.com/123\n',
    'https://key_name@s123.eu-nbg-2.betterstackdata.com/123',
    'https://key@s0.eu-nbg-2.betterstackdata.com/0',
    'https://key@s123.eu-nbg-2.betterstackdata.com/456',
    'https://key@s123.EU-nbg-2.betterstackdata.com/123',
    'https://key@s123.-eu-nbg-2.betterstackdata.com/123',
    'https://key@s123.eu-nbg-2.betterstackdata.com.attacker.test/123',
  ]

  for (const dsn of invalid) {
    expect(errorTrackingDsnOrigin(dsn), dsn).toBeUndefined()
  }
})

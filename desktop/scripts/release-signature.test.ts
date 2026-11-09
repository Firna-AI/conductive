import { expect, it } from 'vitest'

import { assertReleaseSignature } from './release-signature.ts'

const team = 'UV85J3PKBX'
const valid = {
  verifyStatus: 0,
  displayStatus: 0,
  ticketStatus: 0,
  assessmentStatus: 0,
  signatureDisplay: [
    'CodeDirectory v=20500 flags=0x10000(runtime)',
    `Authority=Developer ID Application: Test (${team})`,
    `TeamIdentifier=${team}`,
    'Timestamp=8 Nov 2026 at 19:00:00',
  ].join('\n'),
  assessmentOutput: 'accepted\nsource=Notarized Developer ID\n',
}

it('accepts a verified, notarized Developer ID app from the expected team', () => {
  expect(() => assertReleaseSignature(valid, team)).not.toThrow()
})

it.each(['verifyStatus', 'displayStatus', 'ticketStatus', 'assessmentStatus'])(
  'rejects a failed %s',
  (field) => {
    expect(() =>
      assertReleaseSignature({ ...valid, [field]: 1 }, team),
    ).toThrow()
  },
)

it('rejects an ad-hoc signature', () => {
  expect(() =>
    assertReleaseSignature(
      { ...valid, signatureDisplay: 'Signature=adhoc' },
      team,
    ),
  ).toThrow()
})

it('rejects another Apple team', () => {
  expect(() => assertReleaseSignature(valid, 'OTHERTEAM1')).toThrow()
})

it.each(['flags=0x10000(runtime)', 'Authority=', 'Timestamp='])(
  'rejects missing signing evidence: %s',
  (field) => {
    const signatureDisplay = valid.signatureDisplay
      .split('\n')
      .filter((line) => !line.includes(field))
      .join('\n')
    expect(() =>
      assertReleaseSignature({ ...valid, signatureDisplay }, team),
    ).toThrow()
  },
)

it('rejects a Gatekeeper result without notarization', () => {
  expect(() =>
    assertReleaseSignature({ ...valid, assessmentOutput: 'accepted' }, team),
  ).toThrow()
})

import { expect, it } from 'vitest'
import { fenceLabel } from './fence-label'

it('reads the first fence label in lower case before whitespace or a comma', () => {
  expect(
    [
      '  RUST,ignore',
      'rust title="x"',
      '\tTypeScript\tmeta',
      '{.RUST}',
      '',
      ' \t',
    ].map(fenceLabel),
  ).toEqual(['rust', 'rust', 'typescript', '{.rust}', null, null])
})

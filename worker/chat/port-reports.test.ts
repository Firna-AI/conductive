import { expect, it } from 'vitest'

import { numberedRunnerInput } from './runner-fixtures.test-support'
import { parseRunnerEnvelope } from './runner-input'

const port = { port: 3000, name: 'vite dev', folder: 'apps/web' }
const envelope = (ports: unknown) => ({
  type: 'event',
  streamId: 'ports-stream',
  eventNumber: 1,
  occurredAt: 25,
  event: { type: 'ports.updated', ports },
})

it('accepts bounded sorted unique port reports and refuses malformed runner lists', () => {
  const lists = [
    [],
    [
      { port: 1, name: null, folder: null },
      { port: 65535, name: '🦊'.repeat(40), folder: '🦊'.repeat(120) },
    ],
    Array.from({ length: 64 }, (_, index) => ({ ...port, port: index + 1 })),
  ]
  for (const ports of lists)
    expect(parseRunnerEnvelope(numberedRunnerInput(envelope(ports)))).toEqual(
      envelope(ports),
    )
  const invalid = [
    null,
    {},
    [{ ...port, port: 0 }],
    [{ ...port, port: 65536 }],
    [{ ...port, port: 3000.5 }],
    [{ ...port, port: '3000' }],
    [{ ...port, name: undefined }],
    [{ ...port, name: 1 }],
    [{ ...port, folder: undefined }],
    [{ ...port, folder: 1 }],
    [{ ...port, name: '🦊'.repeat(41) }],
    [{ ...port, folder: '🦊'.repeat(121) }],
    [port, port],
    [{ ...port, port: 4000 }, port],
    Array.from({ length: 65 }, (_, index) => ({ ...port, port: index + 1 })),
  ]
  for (const ports of invalid)
    expect(() =>
      parseRunnerEnvelope(numberedRunnerInput(envelope(ports))),
    ).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_input' }),
    )
})

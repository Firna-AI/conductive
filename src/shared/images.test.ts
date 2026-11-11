import { expect, it } from 'vitest'

import { readImage } from './images'

it('identifies the four screenshot formats from bytes and refuses other or incomplete signatures', () => {
  const cases = [
    { kind: 'png', bytes: [137, 80, 78, 71, 13, 10, 26, 10] },
    { kind: 'jpeg', bytes: [255, 216, 255] },
    { kind: 'gif', bytes: [71, 73, 70, 56, 55, 97] },
    { kind: 'gif', bytes: [71, 73, 70, 56, 57, 97] },
    { kind: 'webp', bytes: [82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80] },
  ]
  for (const { kind, bytes } of cases) {
    const data = new Uint8Array(bytes)
    expect(readImage(data), kind).toMatchObject({ kind, bytes: data })
    expect(readImage(data.subarray(0, data.length - 1)), kind).toBeNull()
  }
  for (const content of [
    '',
    '<svg/>',
    '<html>image</html>',
    'MZprogram',
    'RIFF0000WAVE',
    'GIF88a',
  ]) {
    expect(readImage(new TextEncoder().encode(content)), content).toBeNull()
  }
})

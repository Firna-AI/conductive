import { expect, it } from 'vitest'

import { readNativeReply } from './native-protocol'

it('reports the native call, HTTP status, and text of a non-JSON reply', async () => {
  const response = new Response(
    'Error: The native test fixture requested an object reset.',
    { status: 500 },
  )

  await expect(
    readNativeReply(response, {
      reference: {
        type: 'reference',
        owner: 'worker',
        id: 'root',
        path: ['controls', 'setTime'],
      },
      arguments: [0],
    }),
  ).rejects.toThrow(
    'Native call root.controls.setTime returned non-JSON (HTTP 500):\n' +
      'Error: The native test fixture requested an object reset.',
  )
})

import { expect, it } from 'vitest'
import { AttachmentMissing } from './attachment-missing'

it('names one, two, or three missing files in the accepted order', () => {
  for (const [names, message] of [
    [
      ['z.txt'],
      'z.txt is no longer in the cloud computer. Attach it again in a new message.',
    ],
    [
      ['z.txt', 'a.txt'],
      'z.txt and a.txt are no longer in the cloud computer. Attach them again in a new message.',
    ],
    [
      ['z.txt', 'a.txt', 'c.txt'],
      'z.txt, a.txt, and c.txt are no longer in the cloud computer. Attach them again in a new message.',
    ],
  ] as const)
    expect(new AttachmentMissing(names)).toMatchObject({
      code: 'attachment_missing',
      message,
    })
})

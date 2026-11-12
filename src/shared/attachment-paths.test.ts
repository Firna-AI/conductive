import { expect, it } from 'vitest'

import { attachmentPath } from './attachment-paths'

const record = { id: 'attached-file' }

it.each([
  ['Project plan.PDF', 'Project-plan.pdf'],
  ['仕様書.txt', '-.txt'],
  [
    'a'.repeat(110) + '.PNG',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
  ],
  ['.PNG', 'file.png'],
  ['', 'file'],
  ['..', 'file'],
  ['...', 'file'],
])('builds a safe relative attachment path for %j', async (name, safeName) => {
  expect(await attachmentPath({ ...record, name })).toBe(
    `.context/attachments/6c87f85b1e251351de7d4ef46b87f7c6/${safeName}`,
  )
})

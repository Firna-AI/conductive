import { expect, it } from 'vitest'

import { settleInOrder } from './access'

it('throws the error of the first failed check in the list, not the first in time', async () => {
  const first = new Error('first in the list')
  const second = new Error('first in time')
  let failFirst: (error: Error) => void = () => {}
  const late = new Promise<void>((_resolve, reject) => {
    failFirst = reject
  })
  const settled = settleInOrder([late, Promise.reject(second)])
  await Promise.resolve()
  failFirst(first)
  await expect(settled).rejects.toBe(first)
})

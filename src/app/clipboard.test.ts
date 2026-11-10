import { expect, it, vi } from 'vitest'
import { copyText } from './clipboard'
import { deferred, NoPromiseItem, TextItem } from './clipboard.test-support'

it('starts a pending ClipboardItem write during the press and supplies its resolved plain-text Blob', async () => {
  const pending = deferred<string>()
  const copied: { text: string; type: string }[] = []
  const write = vi.fn(async (items: ClipboardItem[]) => {
    const blob = await items[0].getType('text/plain')
    copied.push({ text: await blob.text(), type: blob.type })
  })
  const writeText = vi.fn(async () => {})
  const copying = copyText(
    { navigator: { clipboard: { write, writeText } }, ClipboardItem: TextItem },
    pending.promise,
  )
  expect(write).toHaveBeenCalledTimes(1)
  expect(writeText).not.toHaveBeenCalled()
  expect(copied).toEqual([])
  pending.resolve('# Full transcript\n')
  await copying
  expect(copied).toEqual([{ text: '# Full transcript\n', type: 'text/plain' }])
})

it('waits for text and uses writeText when pending clipboard items are unavailable or rejected by the constructor', async () => {
  for (const Item of [undefined, NoPromiseItem]) {
    const pending = deferred<string>()
    const values: string[] = []
    const writeText = async (value: string) => {
      values.push(value)
    }
    const write = vi.fn(async () => {})
    const copying = copyText(
      { navigator: { clipboard: { writeText, write } }, ClipboardItem: Item },
      pending.promise,
    )
    expect(values).toEqual([])
    pending.resolve('Copied after the reply')
    await copying
    expect(values).toEqual(['Copied after the reply'])
    expect(write).not.toHaveBeenCalled()
  }
})

it('preserves clipboard failures and observes rejected text even when the write fails before it arrives', async () => {
  const refused = new Error('The clipboard refused the text.')
  const unavailable = new Error('The request failed.')
  const pending = deferred<string>()
  const write = vi.fn(async () => {
    throw refused
  })
  const writeText = vi.fn(async () => {
    throw refused
  })
  const target = {
    navigator: { clipboard: { write, writeText } },
    ClipboardItem: TextItem,
  }
  await expect(copyText(target, pending.promise)).rejects.toBe(refused)
  pending.reject(unavailable)
  await expect(copyText(target, 'Known text')).rejects.toBe(refused)
  expect(writeText).toHaveBeenCalledWith('Known text')
})

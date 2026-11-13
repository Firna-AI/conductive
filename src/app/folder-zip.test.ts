import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, test } from 'vitest'
import { folderEntry } from '../test-support/folder-entries'
import { zipFolder, ZipStopped } from './folder-zip'

const text = (name: string, body: string, lastModified?: number) =>
  new File([body], name, { lastModified })

/** The zip of a folder, as the entries and the text of each file. */
async function unzipped(file: File): Promise<Record<string, string>> {
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  return Object.fromEntries(
    Object.entries(entries).map(([path, bytes]) => [path, strFromU8(bytes)]),
  )
}

/** A folder whose entries need two batches of its reader, and more. */
const screens = folderEntry({
  folder: 'checkout-screens',
  items: [
    text('notes.md', '# Overlap'),
    { folder: 'empty', items: [] },
    text('.hidden', 'kept'),
    {
      folder: 'mobile',
      items: [text('small.txt', 'small screen'), text('été.txt', 'unicode')],
    },
    // A file from before 1980, which a zip cannot date.
    text('old.txt', 'old', 0),
  ],
})

describe('zipFolder', () => {
  test('zips the folder itself, with each file and each folder in it in the order of their names, also hidden files, empty folders, and files from before 1980', async () => {
    const zip = await zipFolder(screens, new AbortController().signal)
    if (zip.state !== 'zipped') throw new Error(`The zip is ${zip.state}.`)
    expect({
      name: zip.file.name,
      type: zip.file.type,
      entries: await unzipped(zip.file),
    }).toEqual({
      name: 'checkout-screens.zip',
      type: 'application/zip',
      entries: {
        'checkout-screens/': '',
        'checkout-screens/.hidden': 'kept',
        'checkout-screens/empty/': '',
        'checkout-screens/mobile/': '',
        'checkout-screens/mobile/small.txt': 'small screen',
        'checkout-screens/mobile/été.txt': 'unicode',
        'checkout-screens/notes.md': '# Overlap',
        'checkout-screens/old.txt': 'old',
      },
    })
  })

  test('gives the name of the zip when the zip passes the size limit, and the name of the folder when a folder in it cannot be read', async () => {
    const signal = new AbortController().signal
    const large = await zipFolder(screens, signal, 100)
    const unreadable = await zipFolder(
      folderEntry({
        folder: 'design',
        items: [
          text('logo.svg', '<svg />'),
          { folder: 'private', unreadable: true },
        ],
      }),
      signal,
    )
    expect({ large, unreadable }).toEqual({
      large: { state: 'too-large', name: 'checkout-screens.zip' },
      unreadable: { state: 'unreadable', name: 'design' },
    })
  })

  test('a stopped drop stops the zip', async () => {
    const stop = new AbortController()
    stop.abort()
    await expect(zipFolder(screens, stop.signal)).rejects.toBeInstanceOf(
      ZipStopped,
    )
  })
})

import { describe, expect, test } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { filesFor } from '../files-test-kit'

describe('a folder that a chip reveals', () => {
  test('opens the folder and each folder that holds it, and each press counts, also on the same folder', () => {
    const files = filesFor(new FakeApiServer())
    files.setFolderOpen('src', false)
    files.revealFolder('src/app/api')
    const first = files.getSnapshot()
    files.revealFolder('src/app/api')
    expect({
      folders: Object.fromEntries(first.folders),
      first: first.revealed,
      second: files.getSnapshot().revealed,
    }).toEqual({
      folders: { src: true, 'src/app': true, 'src/app/api': true },
      first: { path: 'src/app/api', count: 1 },
      second: { path: 'src/app/api', count: 2 },
    })
  })
})

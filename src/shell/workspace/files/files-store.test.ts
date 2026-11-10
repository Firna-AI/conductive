import { describe, expect, test } from 'vitest'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import { startFiles } from './files-store'

/** A store that counts its starts and stops. */
function countingFiles() {
  const calls: string[] = []
  const files = {
    start: () => calls.push('start'),
    stop: () => calls.push('stop'),
  } as unknown as WorkspaceFiles
  return { files, calls }
}

describe('the connection of the kept files', () => {
  test('the Files part and the chat share one connection, which stops after the last part stops', () => {
    const { files, calls } = countingFiles()
    const stopFiles = startFiles(files)
    const stopChat = startFiles(files)
    stopFiles()
    stopFiles()
    const afterFiles = [...calls]
    stopChat()
    expect({ afterFiles, calls }).toEqual({
      afterFiles: ['start'],
      calls: ['start', 'stop'],
    })
  })
})

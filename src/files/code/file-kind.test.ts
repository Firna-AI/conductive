import { describe, expect, it } from 'vitest'
import { fileKind } from './file-kind'

describe('the kind of a file', () => {
  it('is code exactly for the names that the code view colours, and Markdown in any case', () => {
    const names = [
      'app.py',
      'styles.scss',
      'Dockerfile',
      'Makefile',
      '.env.local',
      '.gitignore',
      'README.MD',
      'guide.mdx',
      'notes.txt',
      'LICENSE',
      'photo.png',
      'constructor',
    ]
    expect(
      Object.fromEntries(names.map((name) => [name, fileKind(name)])),
    ).toEqual({
      'app.py': 'code',
      'styles.scss': 'code',
      Dockerfile: 'code',
      Makefile: 'code',
      '.env.local': 'code',
      '.gitignore': 'code',
      'README.MD': 'markdown',
      'guide.mdx': 'markdown',
      'notes.txt': 'file',
      LICENSE: 'file',
      'photo.png': 'file',
      constructor: 'file',
    })
  })
})

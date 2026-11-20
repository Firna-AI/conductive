import { describe, expect, it } from 'vitest'
import { fileKind, isHtml, showsAsPage } from './file-kind'

describe('an HTML file', () => {
  it('is a name that ends with .html or .htm in any case, and keeps the kind of code', () => {
    const names = [
      'report.html',
      'site/INDEX.HTM',
      'Page.Html',
      'page.xhtml',
      'notes.html.md',
      'html',
      'shtml',
    ]
    expect(
      Object.fromEntries(
        names.map((name) => [name, [isHtml(name), fileKind(name)]]),
      ),
    ).toEqual({
      'report.html': [true, 'code'],
      'site/INDEX.HTM': [true, 'code'],
      'Page.Html': [true, 'code'],
      'page.xhtml': [false, 'file'],
      'notes.html.md': [false, 'markdown'],
      html: [false, 'file'],
      shtml: [false, 'file'],
    })
  })
})

describe('the page of an HTML file', () => {
  it('shows for each HTML file except a dot file, which the files preview does not serve', () => {
    const names = [
      'report.html',
      '.context/report.html',
      '.draft.html',
      'site/.hidden.HTM',
      'notes.txt',
    ]
    expect(
      Object.fromEntries(names.map((name) => [name, showsAsPage(name)])),
    ).toEqual({
      'report.html': true,
      '.context/report.html': true,
      '.draft.html': false,
      'site/.hidden.HTM': false,
      'notes.txt': false,
    })
  })
})

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

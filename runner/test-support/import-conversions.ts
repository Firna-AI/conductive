import { readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { importRunnerFixture } from './import'

export async function importConversionFixture() {
  const files = {
    'converted.filter': 'raw filter bytes\n',
    'converted.eol': 'raw lines\n',
    'converted.encoding': 'raw encoding\n',
    'converted.ident': '$Id$\n',
  }
  const h = await importRunnerFixture(
    {},
    {
      ...files,
      '.gitattributes': [
        '*.filter filter=import-expander',
        '*.eol text eol=crlf',
        '*.encoding working-tree-encoding=UTF-16LE',
        '*.ident ident',
        '',
      ].join('\n'),
    },
  )
  const attributes = Buffer.from('*.filter filter=import-expander\n')
  const attributePath = join(h.cwd, '.git/info/attributes')
  await writeFile(attributePath, attributes, { mode: 0o640 })
  await h.git(
    'config',
    'filter.import-expander.smudge',
    "printf ran > conversion-ran; printf 'converted image bytes\\n'",
  )
  await h.git('config', 'filter.import-expander.required', 'true')
  await h.git(
    'config',
    'filter.import-expander.clean',
    "printf 'raw filter bytes\\n'",
  )
  await h.git('config', 'core.autocrlf', 'true')
  for (const path of Object.keys(files)) await rm(join(h.cwd, path))
  await h.git('checkout-index', '--all', '--force')
  await rm(join(h.cwd, 'conversion-ran'))
  const past = new Date('2020-01-01T00:00:00Z')
  for (const path of Object.keys(files))
    await utimes(join(h.cwd, path), past, past)
  await h.git('add', '--all')
  await h.git('update-index', '--refresh')
  const untrackedPath = 'untracked-keep'
  await writeFile(join(h.cwd, untrackedPath), 'Keep unrelated bytes.\n')
  const config = await readFile(join(h.cwd, '.git/config'))
  return { ...h, files, attributes, attributePath, config, untrackedPath }
}

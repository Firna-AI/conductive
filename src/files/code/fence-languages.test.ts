import { expect, it } from 'vitest'
import { languageOfLabel } from './fence-languages'
import { languageOf } from './languages'

it('maps fence names and aliases to the same families as file tabs', () => {
  const cases = [
    ['rust', 'lib.rs'],
    ['rs', 'lib.rs'],
    ['typescript', 'app.ts'],
    ['tsx', 'app.tsx'],
    ['javascript', 'app.js'],
    ['jsx', 'app.jsx'],
    ['jsonc', 'settings.json'],
    ['python', 'app.py'],
    ['shell', 'run.sh'],
    ['zsh', 'run.zsh'],
    ['yaml', 'config.yml'],
    ['toml', 'config.toml'],
    ['sql', 'query.sql'],
    ['scss', 'style.scss'],
    ['xml', 'doc.xml'],
    ['c++', 'app.cpp'],
    ['csharp', 'app.cs'],
    ['kotlin', 'app.kt'],
    ['ruby', 'app.rb'],
    ['dockerfile', 'Dockerfile'],
    ['makefile', 'Makefile'],
  ]
  for (const [label, file] of cases) {
    const language = languageOfLabel(label)
    expect(language, label).not.toBeNull()
    expect(language, label).toBe(languageOf(file))
  }
})

it('keeps plain, missing, and unknown fence labels plain', () => {
  for (const label of [
    null,
    'text',
    'txt',
    'plain',
    'plaintext',
    'console',
    'output',
    'log',
    'none',
    'diff',
    'patch',
    'unknown',
    'constructor',
    '__proto__',
    'example.ts',
    '{.rust}',
  ]) {
    expect(languageOfLabel(label), String(label)).toBeNull()
  }
})

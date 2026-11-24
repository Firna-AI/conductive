import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

test('writes a new output tree and protects files and nonempty folders', () => {
  const root = mkdtempSync(join(tmpdir(), 'style-converter-'))
  const command = fileURLToPath(new URL('./main.ts', import.meta.url))
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [command, ...args], {
      cwd: root,
      encoding: 'utf8',
    })
  const out = join(root, 'drafts')
  const guarded = join(root, 'guarded')
  try {
    mkdirSync(join(root, 'area', 'sub'), { recursive: true })
    writeFileSync(
      join(root, 'area', 'sub', 'StatusText.module.css'),
      '.row {\n  display: flex;\n  letter-spacing: var(--ui-tracking-label);\n}',
    )
    writeFileSync(
      join(root, 'area', 'sub', 'StatusText.tsx'),
      "import s from './StatusText.module.css'\nexport const view = <div className={`${s.row} active`} />",
    )
    writeFileSync(
      join(root, 'area', 'sub', 'getStatusClass.ts'),
      "import s from './StatusText.module.css'\nexport const getStatusClass = <T>(value: T) => cx(s.row, s.active, value)",
    )
    writeFileSync(
      join(root, 'area', 'sub', 'OtherView.vue'),
      "import s from './StatusText.module.css'",
    )
    writeFileSync(
      join(root, 'area', 'sub', 'Notes.md'),
      'See `StatusText.module.css` for the style rules.',
    )
    writeFileSync(
      join(root, 'area', 'sub', 'OtherView.tsx'),
      'export const view = <div className={buildClass()} />',
    )
    writeFileSync(
      join(root, 'area', 'sub', 'Broken.module.css'),
      '.a.b { composes: other; width: 3px }',
    )
    writeFileSync(
      join(root, 'area', 'sub', 'StatusText.test.tsx'),
      "import s from './StatusText.module.css'; cx(s.a, s.b)",
    )
    writeFileSync(
      join(root, 'area', 'sub', 'StatusText.spec.js'),
      "import s from './StatusText.module.css'; cx(s.a, s.b)",
    )
    mkdirSync(guarded)
    writeFileSync(join(guarded, 'keep'), 'keep this')

    const protectedRun = run('area', '--out', 'guarded')
    expect({
      status: protectedRun.status,
      message: protectedRun.stderr.trim(),
      files: readdirSync(guarded),
    }).toEqual({
      status: 1,
      message: 'Output folder guarded must be empty.',
      files: ['keep'],
    })
    const fileRun = run('area', '--out', 'guarded/keep')
    expect(fileRun.status).toBe(1)
    expect(fileRun.stderr.trim()).toBe(
      'Output path guarded/keep points to a file.',
    )
    expect(readFileSync(join(guarded, 'keep'), 'utf8')).toBe('keep this')
    expect(run('missing', '--out', 'drafts').status).toBe(1)
    expect(run('area').status).toBe(1)
    expect(existsSync(out)).toBe(false)

    const result = run('area', '--out', 'drafts')
    expect(result.status).toBe(0)
    expect(result.stdout).toBe(`CSS Modules 2
Drafts 1
Declarations converted 1
Declarations listed 3
Classes with the row default 1
Check by hand 0
Joins 2 in 2 files
Class values to check by hand 1
Unscanned files with CSS Module paths 1
Report drafts/report.md
`)
    expect(readdirSync(out).sort()).toEqual(['report.md', 'sub'])
    expect(readdirSync(join(out, 'sub'))).toEqual(['StatusText.styles.ts'])
    const draft = readFileSync(join(out, 'sub', 'StatusText.styles.ts'), 'utf8')
    expect(draft).toContain('export function statusTextStyles()')
    expect(draft).toContain("flexDirection: 'row'")
    const report = readFileSync(join(out, 'report.md'), 'utf8')
    expect(report).toContain('- Area `area`\n')
    expect(report).toContain('## `area/sub/StatusText.module.css`\n')
    expect(report).toContain('## `area/sub/Broken.module.css`\n')
    expect(report).toContain('- Line 1 · `Entire file` · Cannot read file')
    expect(report).toContain(
      '- Line 3 · `.row` · `letter-spacing: var(--ui-tracking-label)` · em unit\n',
    )
    expect(report).toContain(
      '- `area/sub/StatusText.tsx` · Line 2 · `s.row`, `active`\n',
    )
    expect(report).toContain(
      '- `area/sub/getStatusClass.ts` · Line 2 · `s.row`, `s.active`, `value`\n',
    )
    expect(report).toContain(
      '## Class values to check by hand\n\n- `area/sub/OtherView.tsx` · Line 1 · `buildClass()`\n',
    )
    expect(report).toContain(
      '## Unscanned files with CSS Module paths\n\n- `area/sub/OtherView.vue`\n',
    )
    expect(report).not.toContain('StatusText.test.tsx')
    expect(report).not.toContain('StatusText.spec.js')
    expect(report).not.toContain('Notes.md')
    const help = run('--help')
    expect(help.status).toBe(0)
    expect(help.stdout).toContain(
      'npm run styles:convert -- <area folder> --out <folder>',
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

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
      '.row { display: flex }',
    )
    writeFileSync(
      join(root, 'area', 'sub', 'StatusText.test.tsx'),
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
    expect(result.stdout).toContain('Report drafts/report.md')
    expect(readdirSync(out).sort()).toEqual(['report.md', 'sub'])
    const draft = readFileSync(join(out, 'sub', 'StatusText.styles.ts'), 'utf8')
    expect(draft).toContain('export function statusTextStyles()')
    expect(draft).toContain("flexDirection: 'row'")
    expect(readFileSync(join(out, 'report.md'), 'utf8')).toContain(
      '- Joins 0 in 0 files',
    )
    const help = run('--help')
    expect(help.status).toBe(0)
    expect(help.stdout).toContain(
      'npm run styles:convert -- <area folder> --out <folder>',
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

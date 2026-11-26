import { expect, it } from 'vitest'
import { changedLines, deletesFile, parsePatch } from './parse-patch'

// The patches of the type change and of the markers in a file are the
// output of Git 2.43 with the flags of the runner's diff read, as the
// runner reads it: each invalid UTF-8 byte of a file becomes U+FFFD.

/** A patch of these lines, each ended by LF, as Git writes them. */
function patchOf(lines: readonly string[]): string {
  return lines.map((line) => `${line}\n`).join('')
}

it('numbers the old and the new lines from each hunk header', () => {
  const patch = [
    'diff --git a/form.tsx b/form.tsx',
    '--- a/form.tsx',
    '+++ b/form.tsx',
    '@@ -1,2 +1,2 @@',
    ' keep',
    '-old',
    '+new',
    '\\ No newline at end of file',
    '@@ -18,1 +18,2 @@ export function Form()',
    ' same',
    '+added',
    '',
  ].join('\n')
  expect(parsePatch(patch)).toEqual([
    { kind: 'hunk', text: '@@ -1,2 +1,2 @@' },
    { kind: 'context', text: 'keep', oldLine: 1, newLine: 1 },
    { kind: 'removed', text: 'old', oldLine: 2, newLine: null },
    { kind: 'added', text: 'new', oldLine: null, newLine: 2 },
    { kind: 'note', text: '\\ No newline at end of file' },
    { kind: 'hunk', text: '@@ -18,1 +18,2 @@ export function Form()' },
    { kind: 'context', text: 'same', oldLine: 18, newLine: 18 },
    { kind: 'added', text: 'added', oldLine: null, newLine: 19 },
  ])
})

it('reads each section of a text file that became a symbolic link, so its rows and its counts are those of Git', () => {
  const rows = parsePatch(
    patchOf([
      'diff --git a/config/settings.txt b/config/settings.txt',
      'deleted file mode 100644',
      'index 20aeba2..0000000',
      '--- a/config/settings.txt',
      '+++ /dev/null',
      '@@ -1,3 +0,0 @@',
      '-first line',
      '-second line',
      '-third line',
      'diff --git a/config/settings.txt b/config/settings.txt',
      'new file mode 120000',
      'index 0000000..fdf2d29',
      '--- /dev/null',
      '+++ b/config/settings.txt',
      '@@ -0,0 +1 @@',
      '+../shared/settings.txt',
      '\\ No newline at end of file',
    ]),
  )
  // Git counts the change as 1 line added and 3 removed.
  expect({ rows, lines: changedLines(rows) }).toEqual({
    rows: [
      { kind: 'hunk', text: '@@ -1,3 +0,0 @@' },
      { kind: 'removed', text: 'first line', oldLine: 1, newLine: null },
      { kind: 'removed', text: 'second line', oldLine: 2, newLine: null },
      { kind: 'removed', text: 'third line', oldLine: 3, newLine: null },
      { kind: 'hunk', text: '@@ -0,0 +1 @@' },
      {
        kind: 'added',
        text: '../shared/settings.txt',
        oldLine: null,
        newLine: 1,
      },
      { kind: 'note', text: '\\ No newline at end of file' },
    ],
    lines: { added: 1, removed: 3 },
  })
})

/** The patch of a deleted file whose second line is `text`. */
function deletion(index: string, text: string): string {
  return patchOf([
    'diff --git a/data/export.csv b/data/export.csv',
    'deleted file mode 100644',
    `index ${index}..0000000`,
    '--- a/data/export.csv',
    '+++ /dev/null',
    '@@ -1,2 +0,0 @@',
    '-caf\uFFFD',
    `-${text}`,
  ])
}

/** The patch of a file whose second line becomes `text`. */
function edit(index: string, text: string): string {
  return patchOf([
    'diff --git a/data/export.csv b/data/export.csv',
    `index b39e56c..${index} 100644`,
    '--- a/data/export.csv',
    '+++ b/data/export.csv',
    '@@ -1,2 +1,2 @@',
    ' caf\uFFFD',
    '-row',
    `+${text}`,
  ])
}

// Each file holds invalid UTF-8, so the runner marks its diff binary, and
// the diff page reads a deletion from the patch.
it.each([
  {
    file: 'a deleted file with U+2028 before "new file mode"',
    patch: deletion('4258ec5', 'row\u2028new file mode 100644'),
    deletes: true,
  },
  {
    file: 'a deleted file with U+2029 before "new file mode"',
    patch: deletion('ff877ee', 'row\u2029new file mode 100644'),
    deletes: true,
  },
  {
    file: 'a deleted file with CR before "new file mode"',
    patch: deletion('f304881', 'row\rnew file mode 100644'),
    deletes: true,
  },
  {
    file: 'a deleted file with invalid UTF-8 before "new file mode"',
    patch: deletion('8e23342', 'row\uFFFDnew file mode 100644'),
    deletes: true,
  },
  {
    file: 'a changed file with U+2028 before "deleted file mode"',
    patch: edit('02422cb', 'row\u2028deleted file mode 100644'),
    deletes: false,
  },
  {
    file: 'a changed file with U+2029 before "deleted file mode"',
    patch: edit('ffc756b', 'row\u2029deleted file mode 100644'),
    deletes: false,
  },
  {
    file: 'a changed file with CR before "deleted file mode"',
    patch: edit('86ac5e8', 'row\rdeleted file mode 100644'),
    deletes: false,
  },
  {
    file: 'a changed file with invalid UTF-8 before "deleted file mode"',
    patch: edit('fb094df', 'row\uFFFDdeleted file mode 100644'),
    deletes: false,
  },
])(
  'reads a marker only on a whole header line, so $file reads as $deletes',
  ({ patch, deletes }) => {
    expect(deletesFile(patch)).toBe(deletes)
  },
)

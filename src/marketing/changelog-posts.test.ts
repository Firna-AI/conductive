import { expect, it } from 'vitest'

import { changelogPosts } from './changelog-posts'

/** Reads the post files, and gives the posts and each warning of the build. */
function read(files: readonly { id: string; data: unknown; body?: string }[]) {
  const warnings: string[] = []
  const posts = changelogPosts(files, (message) => warnings.push(message))
  return { posts, warnings }
}

it('reads a post as plain text, with its sections in any order and no warning', () => {
  const body = [
    'Diffs show the **colours** of your code, as the',
    '[guide](https://example.com/guide) shows. <!-- A note for the review. -->',
    '',
    '## Fixed',
    '',
    '- A workspace that *resumes* shows Starting, not a Resume bar.',
    '',
    'Improved',
    '--------',
    '',
    '* Long chats open faster, because the newest',
    '  messages load first.',
    '',
    '  The message box clears at once.',
    '',
    '## New',
    '',
    '- Run `npm run dev` to see \\*stars\\*, _italic_, and ~~struck~~ words.',
    '- Visit <https://conductive.build/docs> or the ![diagram](diagram.png) of a',
    'snake_case_name.',
    '  - A nested change shows as its own line.',
    '1. A numbered change.',
    '',
    '[guide]: https://example.com/guide',
    '',
    '***',
  ].join('\n')
  const { posts, warnings } = read([
    {
      id: '2026-11-12',
      data: {
        title: 'Syntax colours in diffs',
        date: '2026-11-12',
        versions: ['0.13.0', '0.14.0', '0.15.0'],
      },
      body,
    },
  ])
  expect(posts).toEqual([
    {
      date: '2026-11-12',
      title: 'Syntax colours in diffs',
      versions: ['0.13.0', '0.14.0', '0.15.0'],
      lead: 'Diffs show the colours of your code, as the guide shows.',
      sections: {
        new: [
          'Run npm run dev to see *stars*, italic, and struck words.',
          'Visit https://conductive.build/docs or the diagram of a snake_case_name.',
          'A nested change shows as its own line.',
          'A numbered change.',
        ],
        improved: [
          'Long chats open faster, because the newest messages load first. The message box clears at once.',
        ],
        fixed: ['A workspace that resumes shows Starting, not a Resume bar.'],
      },
    },
  ])
  expect(warnings).toEqual([])
})

it('gives each field without a valid value its default, with a warning', () => {
  const warning = (problem: string) =>
    `Changelog post 2026-11-12.md: ${problem}`
  const noDate = warning(
    'the date is missing or not a real day as "YYYY-MM-DD", so the post takes the day of its file name, 2026-11-12.',
  )
  const noTitle = warning(
    'the title is missing, empty, or not text, so the post shows its day in words.',
  )
  const noVersions = warning(
    'the versions are missing or not a list, so the post shows no versions.',
  )
  const defaults = {
    date: '2026-11-12',
    title: '12 November 2026',
    versions: [],
    sections: {},
  }
  const scenarios: readonly {
    name: string
    data: unknown
    post?: object
    warnings: readonly string[]
  }[] = [
    {
      name: 'no front matter',
      data: undefined,
      warnings: [noDate, noTitle, noVersions],
    },
    {
      name: 'null front matter',
      data: null,
      warnings: [noDate, noTitle, noVersions],
    },
    { name: 'no fields', data: {}, warnings: [noDate, noTitle, noVersions] },
    {
      name: 'fields of other types',
      data: { date: 20261112, title: 12, versions: '0.15.0' },
      warnings: [noDate, noTitle, noVersions],
    },
    {
      name: 'empty fields and versions that are not text',
      data: { date: ' ', title: ' ', versions: ['', '0.15.0', null, 7] },
      post: { versions: ['0.15.0'] },
      warnings: [
        noDate,
        noTitle,
        warning(
          'the version "" is empty or not text, so it stays off the page.',
        ),
        warning(
          'the version null is empty or not text, so it stays off the page.',
        ),
        warning(
          'the version 7 is empty or not text, so it stays off the page.',
        ),
      ],
    },
    {
      name: 'days that do not exist or have another form',
      data: { date: '2026-02-30', title: 'A title', versions: ['0.15.0'] },
      post: { title: 'A title', versions: ['0.15.0'] },
      warnings: [noDate],
    },
    {
      name: 'a day in words',
      data: { date: '11 November 2026', title: 'A title', versions: [] },
      post: { title: 'A title' },
      warnings: [noDate],
    },
    {
      name: 'a day that YAML read as a date, and spaces around the text',
      data: {
        date: new Date(Date.UTC(2026, 10, 11)),
        title: ' Spaced title ',
        versions: [' 0.14.0 ', '0.15.0'],
      },
      post: {
        date: '2026-11-11',
        title: 'Spaced title',
        versions: ['0.14.0', '0.15.0'],
      },
      warnings: [],
    },
  ]
  for (const { name, data, post, warnings } of scenarios) {
    const result = read([{ id: '2026-11-12', data }])
    expect(result.posts, name).toEqual([{ ...defaults, ...post }])
    expect(result.warnings, name).toEqual(warnings)
  }
})

it('keeps only the lead and the lists of the sections, with a warning for each other text', () => {
  const body = [
    '- A stray change before any heading.',
    '',
    '# A heading of the post',
    '',
    'The lead, under a heading that stays off the page.',
    '',
    'A second paragraph before the first section.',
    '',
    '## Highlights',
    '',
    '- A change under another heading.',
    '',
    '### New',
    '',
    '- A change under a heading of level three.',
    '',
    '## new',
    '',
    '- Copy a link to a workspace.',
    '',
    '```text',
    '## Fixed',
    '- Code, not a change.',
    '```',
    '',
    '## Fixed',
    '',
    '- A workspace that resumes shows Starting.',
    '',
    'A paragraph inside a section.',
    '',
    '> A quote inside a section,',
    '> on two lines.',
    '',
    '## Fixed',
    '',
    '- A file tab shows the name of its file.',
  ].join('\n')
  const { posts, warnings } = read([
    {
      id: '2026-11-12',
      data: { title: 'A title', date: '2026-11-12', versions: ['0.15.0'] },
      body,
    },
  ])
  expect(posts.map(({ lead, sections }) => ({ lead, sections }))).toEqual([
    {
      lead: 'The lead, under a heading that stays off the page.',
      sections: {
        new: ['Copy a link to a workspace.'],
        fixed: [
          'A workspace that resumes shows Starting.',
          'A file tab shows the name of its file.',
        ],
      },
    },
  ])
  const off = (words: string) =>
    `Changelog post 2026-11-12.md: the text "${words}" is outside the lead and the lists of the sections, so it stays off the page.`
  const heading = (words: string, level: number) =>
    `Changelog post 2026-11-12.md: the heading "${words}" at level ${level} is not New, Improved, or Fixed at level two, so it stays off the page with its list.`
  expect(warnings).toEqual([
    off('A stray change before any heading.'),
    heading('A heading of the post', 1),
    off('A second paragraph before the first section.'),
    heading('Highlights', 2),
    heading('New', 3),
    off('```text'),
    off('A paragraph inside a section.'),
    off('> A quote inside a section, > on two lines.'),
    'Changelog post 2026-11-12.md: the section "Fixed" comes more than once, so the page joins their lines.',
  ])
})

it('shows one post for each day, newest first, and leaves out a post without a real day', () => {
  const post = (id: string, date: string | undefined, title: string) => ({
    id,
    data: { date, title, versions: ['0.15.0'] },
  })
  const { posts, warnings } = read([
    post('notes', undefined, 'Notes for authors'),
    post('2026-11-12', '2026-11-12', 'Newest day'),
    post('2026-11-11', '2026-11-11', 'Second file of a day'),
    post('b-copy', '2026-11-12', 'A copy of a day'),
    post('2026-11-10', '2026-11-10', 'Oldest day'),
    post('2026-11-11-fix', '2026-11-11', 'First file of a day'),
  ])
  expect(posts.map(({ date, title }) => [date, title])).toEqual([
    ['2026-11-12', 'Newest day'],
    ['2026-11-11', 'First file of a day'],
    ['2026-11-10', 'Oldest day'],
  ])
  expect(warnings).toEqual([
    'Changelog post 2026-11-11.md: 2026-11-11-fix.md gives the same day, 2026-11-11, so this post stays off the page.',
    'Changelog post b-copy.md: 2026-11-12.md gives the same day, 2026-11-12, so this post stays off the page.',
    'Changelog post notes.md: the date is missing or not a real day as "YYYY-MM-DD", and the file name is not one either, so the post stays off the page.',
  ])
})

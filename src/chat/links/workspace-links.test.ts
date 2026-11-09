import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import type { Workspace } from '../../shared/workspaces'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { linkedParts, type LinkedPart } from './workspace-links'

const { org } = FAKE_IDS
const listed = workspaceFixtures().workspaces.workspaces
const first = listed[0] as Workspace
const second = { ...(listed[1] as Workspace), state: 'archived' as const }
const links = { orgId: org, workspaces: [first, second] }

/** The web address of a page of the app, as a person copies it. */
const address = (path: string) => `${FAKE_ORIGIN}${path}`

/** The parts in a short form: text, code, or the ID and page of a chip. */
function shapes(parts: readonly LinkedPart[]) {
  return parts.map((part) =>
    part.kind === 'chip'
      ? { chip: part.target.workspace.id, to: part.target.to }
      : { [part.kind]: part.text },
  )
}

describe('the workspace links of a text', () => {
  test('a link to a workspace, with or without a tab, becomes a chip that keeps the page', () => {
    const tab = routes.workspace(org, first.id, 'files', 'src/cart.ts')
    const text = `Read ${first.link} and ${address(`${tab}?line=2#diff`)}`
    expect(shapes(linkedParts(text, links, true))).toEqual([
      { text: 'Read ' },
      { chip: first.id, to: routes.workspace(org, first.id) },
      { text: ' and ' },
      { chip: first.id, to: `${tab}?line=2#diff` },
    ])
  })

  test('a Markdown link to a workspace is the chip alone, and other Markdown links stay as written', () => {
    const other = '[the docs](https://example.com/docs)'
    const text = `Done: [W-${first.number}](${first.link}) and <${second.link}>, see ${other}`
    const parts = linkedParts(text, links, true)
    expect(shapes(parts)).toEqual([
      { text: 'Done: ' },
      { chip: first.id, to: routes.workspace(org, first.id) },
      { text: ' and <' },
      { chip: second.id, to: routes.workspace(org, second.id) },
      { text: `>, see ${other}` },
    ])
    expect(parts[1]).toMatchObject({
      source: `[W-${first.number}](${first.link})`,
    })
  })

  test('a link in code stays code in a message, and a message field reads no code', () => {
    const text = `Run \`open ${first.link}\` now`
    expect(shapes(linkedParts(text, links, true))).toEqual([
      { text: 'Run ' },
      { code: `open ${first.link}` },
      { text: ' now' },
    ])
    expect(shapes(linkedParts(text, links, false))).toEqual([
      { text: 'Run `open ' },
      { chip: first.id, to: routes.workspace(org, first.id) },
      { text: '` now' },
    ])
  })

  test('a link with `..` shows the workspace whose page it opens', () => {
    const odd = address(`${routes.workspace(org, first.id)}/../${second.id}`)
    expect(shapes(linkedParts(odd, links, true))).toEqual([
      { chip: second.id, to: routes.workspace(org, second.id) },
    ])
  })

  test('a link of another origin or org, an unknown workspace, or a list that still loads stays text', () => {
    const path = routes.workspace(org, first.id)
    const others = [
      `https://elsewhere.example${path}`,
      address(routes.workspace('globex', first.id)),
      address(routes.workspace(org, 'not-in-the-list')),
      address(routes.org(org)),
    ]
    for (const link of others) {
      expect(shapes(linkedParts(`See ${link}`, links, true))).toEqual([
        { text: `See ${link}` },
      ])
    }
    const loading = { orgId: org, workspaces: null }
    expect(shapes(linkedParts(first.link, loading, true))).toEqual([
      { text: first.link },
    ])
  })

  test('punctuation next to a link stays text', () => {
    const text = `(${first.link}), ${second.link}. "${first.link}"!`
    expect(shapes(linkedParts(text, links, true))).toEqual([
      { text: '(' },
      { chip: first.id, to: routes.workspace(org, first.id) },
      { text: '), ' },
      { chip: second.id, to: routes.workspace(org, second.id) },
      { text: '. "' },
      { chip: first.id, to: routes.workspace(org, first.id) },
      { text: '"!' },
    ])
  })
})

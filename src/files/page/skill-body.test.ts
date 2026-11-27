import { expect, test } from 'vitest'
import { skillBody, skillViewText } from './skill-body'

test('the body of a skill text starts after its front matter, also with line feeds of Windows, and a text without a closed front matter stays whole', () => {
  const unclosed = '---\nname: plans\n# Plans'
  expect({
    body: skillBody('---\nname: plans\ndescription: Plan.\n---\n\n# Plans\n'),
    windows: skillBody('---\r\nname: plans\r\n---\r\n# Plans'),
    empty: skillBody('---\n---\n# Plans'),
    none: skillBody('# Plans\n---\nname: plans\n---\n'),
    unclosed: skillBody(unclosed),
    mark: skillViewText('\uFEFF---\nname: plans\n---\n# Plans'),
  }).toEqual({
    body: '\n# Plans\n',
    windows: '# Plans',
    empty: '# Plans',
    none: '# Plans\n---\nname: plans\n---\n',
    unclosed,
    mark: '---\nname: plans\n---\n# Plans',
  })
})

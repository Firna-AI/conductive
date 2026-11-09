import type {
  OperatorAccessCode,
  OperatorCodesResponse,
} from '../../shared/operator-waitlist'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { textOf } from '../test-render'

/** The text of the box of the codes: the box after the Sign-ups box. */
export function codesBox(view: HTMLElement): string {
  const boxes = view.querySelectorAll('main section')
  return textOf(boxes[boxes.length - 1]?.innerHTML ?? '')
}

/** A whole list of codes in one page. */
export function codesPage(
  codes: readonly OperatorAccessCode[],
): OperatorCodesResponse {
  return { codes, total: codes.length, nextCursor: null }
}

/** The code of the samples with this text. */
export function codeOf(codes: readonly OperatorAccessCode[], text: string) {
  const code = codes.find((item) => item.code === text)
  if (!code) throw new Error(`The samples have no code ${text}.`)
  return code
}

/** The invite code that New code makes: Meetup Porto, for 40 people. */
export const madeCode: OperatorAccessCode = {
  code: '3VKRD-6PXQA',
  kind: 'invite',
  label: 'Meetup Porto',
  owner: null,
  createdBy: sampleOperator,
  createdAt: FAKE_TIME,
  useLimit: 40,
  uses: 0,
  state: 'active',
  disabledAt: null,
  disabledBy: null,
}

export const codesHeader = 'Label Code State Uses'

/** The rows of the invite codes of the samples, newest first. */
export const codeRows = [
  'Launch week by @calummoore · 6 Jan V7MKC-2QDXH Active 12 of 50',
  'Meetup Lisbon by @ellie-w · 5 Jan TQ8WN-2HKXP Active 7 of 30',
  'Design partners by @calummoore · 4 Jan 9PTXC-4WHMN Used up 5 of 5',
  'Hacker News by @calummoore · 3 Jan HM3PE-7KWQT Disabled 18 of 100',
  'Friends by @calummoore · 2 Jan 6FJDA-9RCVY Active 3 of 10',
  'Beta testers by @calummoore · 1 Jan X2NRT-5GJHD Active 24 of 25',
]

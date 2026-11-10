import { describe, expect, test } from 'vitest'
import { matchRank, rankRows, searchWords } from './matcher'

describe('the search of the palette', () => {
  test('each word must match one of the texts, in any order and any case, also inside a word', () => {
    const texts = [
      'Checkout address autocomplete',
      'calummoore/checkout-autocomplete',
      'acme/storefront',
    ]
    const rank = (query: string) => matchRank(searchWords(query), texts)
    expect({
      upperCase: rank('CHECKOUT'),
      anyOrder: rank('storefront acme'),
      afterDash: rank('auto'),
      insideWord: rank('heck'),
      oneWordInside: rank('checkout front'),
      oneWordMissing: rank('checkout billing'),
      wordsInTwoTexts: rank('complete acme/store'),
      spacesOnly: rank('   '),
    }).toEqual({
      upperCase: 0,
      anyOrder: 0,
      afterDash: 0,
      insideWord: 1,
      oneWordInside: 1,
      oneWordMissing: null,
      wordsInTwoTexts: 1,
      spacesOnly: 0,
    })
  })

  test('a match at the start of a word ranks first, and rows of one rank keep their order', () => {
    const rows = [
      'Paycheck totals',
      'Checks of the pull request',
      'Recheck the flaky test',
      'Retry failed webhooks',
      'Go to Checks',
    ]
    const found = rankRows(rows, searchWords('check'), (row) => [row])
    expect(found).toEqual([
      'Checks of the pull request',
      'Go to Checks',
      'Paycheck totals',
      'Recheck the flaky test',
    ])
  })
})

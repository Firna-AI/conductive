import { describe, expect, it } from 'vitest'
import {
  initialPreviews,
  previewsReducer,
  selectedPreview,
  visiblePreviews,
  type PreviewsAction,
} from './previewsState'

const first = {
  id: 'preview-1',
  port: 3000,
  url: 'https://a4826b97d1c04f15802c7e9bb2546d30.conducting-previews.test',
  expiresAt: 1_800_086_400_000,
}
const second = {
  id: 'preview-2',
  port: 4000,
  url: 'https://k7q2m9x4p8w3zr5t.conducting-previews.test',
  expiresAt: 1_800_086_400_000,
}

function reduce(...actions: PreviewsAction[]) {
  return actions.reduce(previewsReducer, initialPreviews)
}

describe('preview list', () => {
  it('keeps a revoked preview hidden when a later list still has it', () => {
    const state = reduce(
      { type: 'revoked', previewId: 'preview-1' },
      { type: 'loaded', previews: [first, second] },
    )

    expect(visiblePreviews(state)).toEqual([second])
  })

  it('shows the first tab when the address names a closed preview', () => {
    const state = reduce(
      { type: 'loaded', previews: [first, second] },
      { type: 'close', previewId: 'preview-1' },
      { type: 'closed', previewId: 'preview-1' },
    )

    expect(selectedPreview(visiblePreviews(state), 'preview-1')).toEqual(second)
    expect(state.closing.size).toBe(0)
  })
})

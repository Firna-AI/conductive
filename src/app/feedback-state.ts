import type { FeedbackContext, FeedbackResponse } from '../shared/feedback'
import type { ApiError } from './api/client'
import type { Loadable } from './store'

export type FeedbackLocation = Omit<FeedbackContext, 'appVersion'>

export interface FeedbackScreenshotInput {
  name: string
  sizeBytes: number
  content: string
}

export interface FeedbackDraftScreenshot extends FeedbackScreenshotInput {
  id: string
}

export interface FeedbackDraft {
  id: string | null
  text: string
  screenshots: readonly FeedbackDraftScreenshot[]
}

export interface FeedbackState {
  open: boolean
  reply: Loadable<FeedbackResponse> | null
  draft: FeedbackDraft
  send:
    | { state: 'idle' }
    | { state: 'sending' }
    | { state: 'failed'; error: ApiError }
}

export function emptyFeedback(): FeedbackState {
  return {
    open: false,
    reply: null,
    draft: { id: null, text: '', screenshots: [] },
    send: { state: 'idle' },
  }
}

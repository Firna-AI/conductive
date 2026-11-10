export const FEEDBACK_PATH = '/api/feedback'
export const FEEDBACK_BODY_MAX_BYTES = 10_000_000
export const FEEDBACK_SCREENSHOTS_MAX_BYTES = 7_000_000

export interface FeedbackResponse {
  replyEmail: string | null
}

export interface FeedbackContext {
  orgId: string | null
  workspaceId: string | null
  appVersion: string
  desktop: boolean
}

export interface FeedbackScreenshot {
  content: string
}

export interface SendFeedbackRequest {
  draftId: string
  text: string
  context: FeedbackContext
  screenshots: FeedbackScreenshot[]
}

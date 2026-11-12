import { FEEDBACK_PATH, type SendFeedbackRequest } from '../shared/feedback'
import { ignore } from './api/parse'
import { readFeedback } from './api/read-feedback'
import type { AppModel } from './app-model'
import {
  emptyFeedback,
  type FeedbackDraft,
  type FeedbackLocation,
  type FeedbackScreenshotInput,
  type FeedbackState,
} from './feedback-state'
import { asApiError, Store, type Readable } from './store'
import { APP_VERSION } from './version'

export class FeedbackModel {
  private readonly shown = new Store(emptyFeedback())
  readonly state: Readable<FeedbackState> = this.shown
  private readonly app: AppModel
  private person: string | null = null
  private generation = 0
  private location: FeedbackLocation | null = null
  private snapshot: SendFeedbackRequest | null = null
  private reading: Promise<void> | null = null
  private sending: Promise<boolean> | null = null

  constructor(app: AppModel) {
    this.app = app
    app.boot.subscribe(() => this.followPerson())
  }

  private followPerson(): void {
    const boot = this.app.boot.get()
    if (boot.state === 'loading' || boot.state === 'failed') return
    const person = boot.state === 'ready' ? boot.user.id : null
    if (person === this.person) return
    this.person = person
    this.generation += 1
    this.location = null
    this.snapshot = null
    this.reading = null
    this.sending = null
    this.shown.set(emptyFeedback())
  }

  private available(): boolean {
    const boot = this.app.boot.get()
    return boot.state === 'ready' && boot.user.id === this.person
  }

  get canSend(): boolean {
    const { draft, reply, send } = this.shown.get()
    return (
      this.available() &&
      this.location !== null &&
      draft.id !== null &&
      draft.text.trim() !== '' &&
      reply?.state === 'ready' &&
      send.state !== 'sending'
    )
  }

  open(context: FeedbackLocation): Promise<void> {
    if (!this.available()) return Promise.resolve()
    this.location = { ...context }
    this.update({ open: true })
    return this.readReply()
  }

  close(): void {
    if (this.sending) return
    this.update({ open: false })
  }

  setText(text: string): void {
    if (text === this.shown.get().draft.text) return
    this.edit((draft) => ({ ...draft, text }))
  }

  addScreenshot(screenshot: FeedbackScreenshotInput): void {
    this.edit((draft) => ({
      ...draft,
      screenshots: [
        ...draft.screenshots,
        { ...screenshot, id: this.app.services.newId() },
      ],
    }))
  }

  removeScreenshot(id: string): void {
    if (!this.shown.get().draft.screenshots.some((image) => image.id === id))
      return
    this.edit((draft) => ({
      ...draft,
      screenshots: draft.screenshots.filter((image) => image.id !== id),
    }))
  }

  private edit(change: (draft: FeedbackDraft) => FeedbackDraft): void {
    if (!this.available() || this.sending) return
    const draft = change(this.shown.get().draft)
    this.snapshot = null
    this.update({
      draft: { ...draft, id: draft.id ?? this.app.services.newId() },
      send: { state: 'idle' },
    })
  }

  readReply(): Promise<void> {
    if (!this.available()) return Promise.resolve()
    if (this.reading) return this.reading
    const run = this.generation
    this.update({ reply: { state: 'loading' } })
    const reading = this.app.services.api
      .get(FEEDBACK_PATH, readFeedback)
      .then(
        (value) => {
          if (run === this.generation)
            this.update({ reply: { state: 'ready', value } })
        },
        (error: unknown) => {
          if (run === this.generation)
            this.update({
              reply: { state: 'failed', error: asApiError(error) },
            })
        },
      )
      .finally(() => {
        if (this.reading === reading) this.reading = null
      })
    this.reading = reading
    return reading
  }

  send(): Promise<boolean> {
    if (this.sending) return this.sending
    const { draft } = this.shown.get()
    if (!this.canSend || !this.location || !draft.id)
      return Promise.resolve(false)
    this.snapshot ??= {
      draftId: draft.id,
      text: draft.text,
      context: {
        ...this.location,
        appVersion: this.app.services.appVersion ?? APP_VERSION,
      },
      screenshots: draft.screenshots.map(({ content }) => ({ content })),
    }
    const run = this.generation
    this.update({ send: { state: 'sending' } })
    const sending = this.app.services.api
      .send('POST', FEEDBACK_PATH, this.snapshot, ignore)
      .then(
        () => {
          if (run !== this.generation) return false
          this.snapshot = null
          this.update({
            open: false,
            draft: emptyFeedback().draft,
            send: { state: 'idle' },
          })
          return true
        },
        (error: unknown) => {
          if (run === this.generation)
            this.update({ send: { state: 'failed', error: asApiError(error) } })
          return false
        },
      )
      .finally(() => {
        if (this.sending === sending) this.sending = null
      })
    this.sending = sending
    return sending
  }

  private update(change: Partial<FeedbackState>): void {
    this.shown.change((state) => ({ ...state, ...change }))
  }
}

import { FEEDBACK_SCREENSHOTS_MAX_BYTES } from '../../shared/feedback'
import { readImage, type ImageKind } from '../../shared/images'
import type { AppModel } from '../app-model'
import { Store, type Readable } from '../store'
import { stripMetadata, toBase64 } from './strip-metadata'

/** The longest signature of the four types: WebP names itself in bytes 8 to 11. */
const signatureLength = 12

/** The name of a screenshot whose file has none, such as some pastes. */
const fallbackNames: Readonly<Record<ImageKind, string>> = {
  png: 'screenshot.png',
  jpeg: 'screenshot.jpg',
  gif: 'screenshot.gif',
  webp: 'screenshot.webp',
}

/** A file that the dialog did not add, and why. */
export interface RefusedScreenshot {
  readonly name: string
  readonly reason: 'too-large' | 'other-type'
}

/** What the intake shows to the Feedback dialog. */
export interface IntakeState {
  /** The files that wait or that the intake reads now. Send waits for them. */
  readonly pending: number
  /** The files of the last pick, paste, or drop that the dialog did not add. */
  readonly refused: readonly RefusedScreenshot[]
}

const idle: IntakeState = { pending: 0, refused: [] }

/** The bytes of a file without metadata, or null when it is no image of the four types. */
async function prepare(
  file: File,
): Promise<{ bytes: Uint8Array; kind: ImageKind } | null> {
  const head = await file.slice(0, signatureLength).arrayBuffer()
  if (readImage(new Uint8Array(head)) === null) return null
  const image = readImage(new Uint8Array(await file.arrayBuffer()))
  if (image === null) return null
  return { bytes: stripMetadata(image), kind: image.kind }
}

/**
 * Turns the files of a pick, a paste, or a drop into screenshots of the
 * feedback draft, one file at a time, in their order. So the 7 MB limit
 * counts each screenshot that came before. A file that is not a PNG, JPEG,
 * GIF, or WebP image, that breaks, or that cannot be read is refused, and
 * the next file goes on, so the text and the other screenshots stay. Only
 * the first bytes of a file of another type are read. The intake belongs
 * to the app, not to the dialog, so a file that it reads still joins the
 * draft after the dialog closes. A change of the person drops the files
 * that wait, as the model drops the draft.
 */
export class ScreenshotIntake {
  private readonly shown = new Store<IntakeState>(idle)
  readonly state: Readable<IntakeState> = this.shown
  private readonly app: AppModel
  private person: string | null = null
  private generation = 0
  private queue: Promise<void> = Promise.resolve()

  constructor(app: AppModel) {
    this.app = app
    app.boot.subscribe(() => this.followPerson())
    this.followPerson()
  }

  private followPerson(): void {
    const boot = this.app.boot.get()
    if (boot.state === 'loading' || boot.state === 'failed') return
    const person = boot.state === 'ready' ? boot.user.id : null
    if (person === this.person) return
    this.person = person
    this.generation += 1
    this.queue = Promise.resolve()
    this.shown.set(idle)
  }

  /**
   * Takes the files of one pick, paste, or drop, after those that wait.
   * Their refusals replace those of the last pick, paste, or drop.
   */
  add(files: readonly File[]): Promise<void> {
    if (files.length === 0) return this.queue
    const run = this.generation
    this.shown.change((state) => ({
      pending: state.pending + files.length,
      refused: [],
    }))
    for (const file of files) {
      this.queue = this.queue.then(() => this.take(file, run))
    }
    return this.queue
  }

  /** Clears the refusals, as a send of the draft does. */
  clearRefused(): void {
    this.shown.change((state) => ({ ...state, refused: [] }))
  }

  private async take(file: File, run: number): Promise<void> {
    let refusal: RefusedScreenshot['reason'] | null
    try {
      const image = await prepare(file)
      if (run !== this.generation) return
      refusal = image === null ? 'other-type' : this.join(file.name, image)
    } catch {
      refusal = 'other-type'
    }
    if (run !== this.generation) return
    const refused =
      refusal === null ? [] : [{ name: file.name, reason: refusal }]
    this.shown.change((state) => ({
      pending: state.pending - 1,
      refused: [...state.refused, ...refused],
    }))
  }

  /**
   * Adds a prepared screenshot to the draft when the screenshots stay
   * within 7,000,000 bytes in all, as the Worker counts them. Says why it
   * did not, or null.
   */
  private join(
    name: string,
    image: { bytes: Uint8Array; kind: ImageKind },
  ): 'too-large' | null {
    const { feedback } = this.app
    const total = feedback.state
      .get()
      .draft.screenshots.reduce((sum, item) => sum + item.sizeBytes, 0)
    if (total + image.bytes.length > FEEDBACK_SCREENSHOTS_MAX_BYTES) {
      return 'too-large'
    }
    feedback.addScreenshot({
      name: name === '' ? fallbackNames[image.kind] : name,
      sizeBytes: image.bytes.length,
      content: toBase64(image.bytes),
    })
    return null
  }
}

const intakes = new WeakMap<AppModel, ScreenshotIntake>()

/** The one screenshot intake of the app, which outlives each open of the dialog. */
export function screenshotIntake(app: AppModel): ScreenshotIntake {
  let intake = intakes.get(app)
  if (!intake) {
    intake = new ScreenshotIntake(app)
    intakes.set(app, intake)
  }
  return intake
}

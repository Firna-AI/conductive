import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../app/api/client'
import { uploadingFile, type DraftFile } from '../../app/draft-files'
import type { Attachment } from '../../shared/messages'
import { DraftFiles, OversizeNotice, SentFiles } from './AttachmentChips'
import { textOf } from './render-kit'

const screenshot: Attachment = {
  id: 'attachment-1',
  name: 'overlap.png',
  kind: 'image',
  mediaType: 'image/png',
  sizeBytes: 290_816,
}

/** The accessible names of the buttons in rendered HTML, in their order. */
function buttonNames(html: string): string[] {
  return [...html.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(
    ([, name]) => name,
  )
}

describe('the attached files', () => {
  it('shows each upload state of a draft file: the measured percent, Uploading before a measurement, and Try again only on a failed one', () => {
    const files: DraftFile[] = [
      {
        state: 'uploading',
        id: 'file-0',
        file: new File(['png'], 'sketch.png'),
        sentBytes: 2,
      },
      uploadingFile('file-1', new File(['notes'], 'notes.txt')),
      {
        state: 'ready',
        id: 'file-2',
        file: new File(['png'], 'overlap.png'),
        attachment: screenshot,
      },
      {
        state: 'failed',
        id: 'file-3',
        file: new File(['log'], 'console.log'),
        error: new ApiError(502, 'upload_failed', 'The upload failed.'),
      },
    ]
    const html = renderToStaticMarkup(
      <DraftFiles files={files} onRemove={() => {}} onRetry={() => {}} />,
    )
    expect({
      text: textOf(html).trim(),
      buttons: buttonNames(html),
      progress: [...html.matchAll(/<[^>]*role="progressbar"[^>]*>/g)].map(
        ([tag]) => ({
          value: tag.match(/aria-valuenow="([^"]*)"/)?.[1] ?? null,
          busy: tag.match(/aria-busy="([^"]*)"/)?.[1] ?? null,
        }),
      ),
    }).toEqual({
      text: 'sketch.png 66% notes.txt Uploading overlap.png 284 KB console.log Failed Try again',
      buttons: [
        'Remove sketch.png',
        'Remove notes.txt',
        'Remove overlap.png',
        'Upload console.log again',
        'Remove console.log',
      ],
      progress: [
        { value: '67', busy: null },
        { value: null, busy: 'true' },
      ],
    })
  })

  it('names one refused file or the count, and the limit, but no size of the file', () => {
    const notice = (refused: readonly string[]) =>
      textOf(
        renderToStaticMarkup(
          <OversizeNotice onAttach={() => {}} refused={refused} />,
        ),
      ).trim()
    expect({
      none: notice([]),
      one: notice(['recording.mov']),
      two: notice(['recording.mov', 'trace.zip']),
    }).toEqual({
      none: '',
      one: "recording.mov wasn't attached Each file can be up to 25 MB. Attach a smaller file",
      two: "2 files weren't attached Each file can be up to 25 MB. Attach a smaller file",
    })
  })

  it('shows the files of a sent message with their sizes and no Remove', () => {
    const html = renderToStaticMarkup(<SentFiles attachments={[screenshot]} />)
    expect({
      text: textOf(html).trim(),
      buttons: buttonNames(html),
    }).toEqual({ text: 'overlap.png 284 KB', buttons: [] })
  })
})

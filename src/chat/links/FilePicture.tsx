import { useRef } from 'react'
import {
  AnswerPicture,
  type PictureOpener,
  type PictureState,
} from '../../../docs/mockups/src/components/chat/AnswerPicture'
import { ChipCopyText } from '../../../docs/mockups/src/components/chat/ChipCopyText'
import { useChatMentions } from '../mentions/MentionsContext'
import { useNearView } from '../ui/near-view'
import type { FileLinkPart } from './chat-parts'
import { fileOpener, fileTitle } from './file-opener'
import { labelText } from './FileTextLink'
import { usePictureRead, type PictureOutcome } from './picture-read'

/**
 * Where chat text shows the Markdown image of a picture file as its
 * picture: in the text of the agent message with the ID `message`. The
 * reads of its pictures belong to that message, so a newer answer reads a
 * reused file name again. Text without it shows each image as its link.
 */
export interface AnswerPictures {
  message: string
}

/**
 * What the picture shows: the link while the chat reads no picture or the
 * read failed, the box of the label until the read and the decode end,
 * else the picture with the label as its alternative text.
 */
function stateOf(
  reads: boolean,
  outcome: PictureOutcome | null,
  label: string,
): PictureState {
  if (!reads || outcome?.kind === 'failed') return { kind: 'link' }
  if (!outcome) return { kind: 'loading' }
  const picture = <img alt={label} src={outcome.address} />
  return { kind: 'picture', size: outcome.size, picture }
}

/**
 * The Markdown image of a picture file in an answer, as the mockups'
 * `AnswerPicture` draws it (screenshot decision 2). The chat reads the file
 * only while the shell gives `ChatMentions.pictures`, which it does only
 * while the cloud computer runs. The read starts when the picture comes
 * near the view. Until the read and the decode end, the box of the label
 * shows. Without a reader, after a failed read, and for bytes that the
 * browser cannot draw, the image shows as its link.
 *
 * In each state, a press opens the file tab, as the link of a file does,
 * and a click with a modifier key stays with the browser. The title is the
 * path. The alternative text and the box show the label as plain text. The
 * link shows it with its code and bold, as the link of each other file. A
 * copy of the picture or of its box gives the Markdown image as the agent
 * wrote it, as a copy of a chip gives its text. A copy of the link gives
 * its label, as for each other link.
 */
export function FilePicture(props: { part: FileLinkPart; message: string }) {
  const mentions = useChatMentions()
  const reader = mentions?.pictures
  const { entry, lines, source } = props.part
  const label = props.part.label.map((word) => word.text).join('')
  const target = useRef<HTMLAnchorElement>(null)
  const near = useNearView(target, reader !== undefined)
  const outcome = usePictureRead(reader, entry.path, props.message, near)
  const state = stateOf(reader !== undefined, outcome, label)
  const opener = mentions
    ? (parts: PictureOpener) => {
        const opens = fileOpener(mentions, entry, lines)
        if (state.kind === 'link') {
          return (
            <a {...parts} {...opens} ref={target}>
              {labelText(props.part.label)}
            </a>
          )
        }
        const link = <a {...parts} {...opens} ref={target} />
        return (
          <span data-mention={source}>
            {link}
            <ChipCopyText text={source} />
          </span>
        )
      }
    : undefined
  return (
    <AnswerPicture
      label={label}
      opener={opener}
      state={state}
      title={fileTitle(entry, lines)}
    />
  )
}

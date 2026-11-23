import { useRef, type ReactNode } from 'react'
import {
  AnswerPicture,
  type PictureOpener,
  type PictureState,
} from '../../ui/components/chat/AnswerPicture'
import { ChipCopyText } from '../../ui/components/chat/ChipCopyText'
import { useChatMentions } from '../mentions/MentionsContext'
import { useNearView } from '../ui/near-view'
import { fileOpener, fileTitle } from './file-opener'
import type { FileTarget } from './file-targets'
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

/** The Markdown image of a picture file of the tree, in an agent message. */
interface FilePictureProps extends FileTarget {
  /** The image as the agent wrote it, which a copy of the picture gives. */
  source: string
  /** The label as plain text: the alternative text and the text of the box. */
  label: string
  /** The ID of the agent message that the reads of the picture belong to. */
  message: string
  /** The label of the link, with its code and its marks. */
  children: ReactNode
}

/**
 * The Markdown image of a picture file in an answer, as the shared
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
 * link shows it with its code and its marks, as the link of each other
 * file. A copy of the picture or of its box gives the Markdown image as the
 * agent wrote it, as a copy of a chip gives its text. A copy of the link
 * gives its label, as for each other link.
 */
export function FilePicture(props: FilePictureProps) {
  const mentions = useChatMentions()
  const reader = mentions?.pictures
  const { entry, lines, source, label } = props
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
              {props.children}
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

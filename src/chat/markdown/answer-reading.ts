import { useTextLinks } from '../../shell/ui/text-links'
import { useEntryLookup } from '../links/LinkedText'
import { useChatLinks } from '../links/LinksContext'
import { useRepositoryFolder } from '../mentions/MentionsContext'
import type { InlineText } from './agent-inline'
import {
  answerShowsWords,
  namesFiles,
  type AnswerReading,
} from './answer-parts'

/**
 * What the chat reads the text of an agent message with where the text
 * draws: the workspaces of the chat, the web links of the screen, and the
 * tree, while the chat has one. With `follows`, the reading follows each
 * change of the tree. Without it, the reading has no tree, as for a text
 * that can name no file, which then follows no change of the tree.
 */
export function useAnswerReading(follows: boolean): AnswerReading {
  const { links } = useChatLinks()
  const find = useEntryLookup(follows)
  const root = useRepositoryFolder()
  const { linkOf } = useTextLinks()
  return { links, web: linkOf, files: find ? { find, root } : undefined }
}

/**
 * Whether the inline text of a block shows words where it draws, as
 * `answerShowsWords` reads it with the reading of `AnswerText`. A text that
 * can name a file follows the tree, so the result changes with the tree,
 * also while the text stays the same.
 */
export function useShowsWords(text: InlineText): boolean {
  return answerShowsWords(text, useAnswerReading(namesFiles(text)))
}

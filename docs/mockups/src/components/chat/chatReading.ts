/**
 * What the mockups read chat text with, so that the readers of the app
 * read it by their own rules: the tree of Checkout address autocomplete and
 * the folder of its repository, the skills of its agents, the attached
 * files of a message, and the links of the rows of the chat.
 */

import type { SkillLookup } from '../../../../../src/chat/links/chat-tokens'
import type { EntryLookup } from '../../../../../src/chat/links/file-targets'
import type { AnswerReading } from '../../../../../src/chat/markdown/answer-parts'
import type { Attachment as AppAttachment } from '../../../../../src/shared/generated/Attachment'
import type { FileEntry } from '../../../../../src/shared/generated/FileEntry'
import type { Attachment } from '../../fixtures/attachments'
import { mentionEntries, repositoryFolder } from '../../fixtures/fileMentions'
import { plansAgent } from '../../fixtures/skillFiles'
import { type MentionEntry } from '../../../../../src/ui/components/chat/mentionEntry'
import { skills } from '../../fixtures/skills'
import { entryName } from '../../../../../src/ui/components/chat/entryPaths'
import { webLinkOf, type RowLinks } from './workspaceLinks'

/** The key of an entry of the tree: whether it is a folder, and its path. */
function keyOf(path: string, folder: boolean): string {
  return `${folder ? 'folder' : 'file'}:${path}`
}

/** Each entry of the tree of the mockups, as the app reads it, by its key. */
const tree: ReadonlyMap<string, { file: FileEntry; entry: MentionEntry }> =
  new Map(
    mentionEntries.map((entry) => [
      keyOf(entry.path, entry.folder),
      {
        entry,
        file: {
          path: entry.path,
          name: entryName(entry),
          kind: entry.folder ? 'directory' : 'file',
          change: null,
        },
      },
    ]),
  )

/** Finds the entry of the tree of the mockups at a path: a folder or a file. */
export const findEntry: EntryLookup = (path, folder) =>
  tree.get(keyOf(path, folder))?.file

/**
 * The entry of the mockups for an entry that a reader of the app found,
 * with the tab that a press on its chip shows. An entry outside the tree
 * shows no tab.
 */
export function mockupEntry(file: FileEntry): MentionEntry {
  const folder = file.kind === 'directory'
  return (
    tree.get(keyOf(file.path, folder))?.entry ?? { path: file.path, folder }
  )
}

/**
 * Finds the skill of the mockups that a skill text names, with its agent.
 * The skills of the mockups lie in the Claude skill folder, as the skill
 * tab of `plans` shows.
 */
export const findSkill: SkillLookup = (name) => {
  const skill = skills.find((each) => each.name === name)
  return skill ? { agent: plansAgent, skill } : undefined
}

/**
 * What the mockups read the text of an agent message with: the workspaces
 * of the rows of the chat, where each web address leads, and the tree with
 * the folder of its repository.
 */
export function answerReading(links: RowLinks): AnswerReading {
  return {
    links: links.links,
    web: webLinkOf,
    files: { find: findEntry, root: repositoryFolder },
  }
}

/**
 * The record of the app for an attached file of a sent message. The reader
 * of the app finds the file of a mention by its copy path. The fixtures
 * hold no media type, so each file has the type of a file of an unknown
 * type.
 */
export function appAttachment(file: Attachment): AppAttachment {
  const { id, name, path, kind, sizeBytes } = file
  return {
    id,
    name,
    path,
    kind,
    mediaType: 'application/octet-stream',
    sizeBytes,
  }
}

import type { ToolCall } from '../chat-events'
import type { DeviceCommandRecord } from '../device'
import type { ChangedFile } from '../files'
import {
  leftOutOfCall,
  leftOutOfRun,
  lostText,
  moreFiles,
  turnFilesUnavailable,
} from '../../../docs/mockups/src/components/chat/lostCopy'
import { continuedNote } from '../../../docs/mockups/src/components/workspace/barCopy'
import {
  commandCopy,
  commandRan,
  limitLabel,
  macName,
  outputOf,
  stateLabel,
  stateNote,
} from './command-words'
import { formatDuration } from './duration'
import { lostData } from './lost-data'
import { codeBlock, inlineCode, plainText } from './markdown-code'
import { foldLabel, foldSkillLabel, toolEnding, toolVerb } from './tool-words'
import type { Transcript, TranscriptItem } from './transcript'
import {
  continuedBy,
  filesUnread,
  omittedFiles,
  stoppedSummary,
  turnCopy,
  type ChatReaders,
} from './turn-words'

const note = (text: string) => `_${text}_`

export function toolMarkdown(call: ToolCall): string {
  return `- ${[
    `${toolVerb(call)} ${inlineCode(call.target.replace(/[\r\n]+/g, ' '))}`,
    ...(call.detail ? [plainText(call.detail)] : []),
    ...(call.omittedDetailBytes > 0
      ? [leftOutOfCall(call.omittedDetailBytes)]
      : []),
    ...(toolEnding(call) ? [toolEnding(call)] : []),
  ].join(' · ')}`
}

export function foldMarkdown(calls: readonly ToolCall[], messages = 0): string {
  const skills = foldSkillLabel(calls)
  const omitted = calls.reduce((sum, call) => sum + call.omittedDetailBytes, 0)
  return note(
    [
      foldLabel(calls.length, messages),
      ...(skills ? [plainText(skills)] : []),
      ...(omitted > 0 ? [leftOutOfRun(omitted)] : []),
    ].join(' · '),
  )
}

function changedFile(file: ChangedFile): string {
  const current = inlineCode(file.displayPath ?? file.path)
  return file.previousPath === undefined
    ? current
    : `${inlineCode(file.previousDisplayPath ?? file.previousPath)} → ${current}`
}

export function itemMarkdown(
  item: TranscriptItem,
  transcript: Transcript,
  readers: ChatReaders,
): string {
  switch (item.kind) {
    case 'user':
      return [
        item.message.text,
        ...(item.message.attachments.length > 0
          ? [
              `${turnCopy.attachments}: ${item.message.attachments.map((file) => plainText(file.name)).join(', ')}`,
            ]
          : []),
      ]
        .filter((part) => part.length > 0)
        .join('\n\n')
    case 'agent':
      return item.text
    case 'tool':
      return toolMarkdown(item.tool)
    case 'turn-end': {
      const omitted = omittedFiles(transcript, item.turnId)
      const files = [
        ...item.files.map(changedFile),
        ...(omitted > 0 ? [moreFiles(omitted)] : []),
      ]
      const unread =
        item.files.length === 0 && filesUnread(transcript, item.turnId)
      return note(
        `${turnCopy.finished} ${formatDuration(item.durationMs)}${files.length > 0 ? `. ${turnCopy.changedFiles}: ${files.join(' · ')}` : ''}${unread ? ` · ${turnFilesUnavailable}` : ''}`,
      )
    }
    case 'stopped':
      return note(
        plainText(stoppedSummary(transcript, item.turnId, item.by, readers)),
      )
    case 'failed':
      return note(`${turnCopy.failed}: ${plainText(item.error.message)}`)
    case 'lost':
      return note(
        lostText(lostData[item.marker.runnerEventType], item.marker.reason),
      )
    case 'continued': {
      // The words of the note of the chat, with each branch as code.
      const words = continuedNote(
        plainText(continuedBy(item.member, readers)),
        inlineCode(item.baseBranch),
      )
      return note(`${words.before}${inlineCode(item.branch)}${words.after}`)
    }
  }
}

export function commandMarkdown(request: DeviceCommandRecord): string {
  const output = outputOf(request)
  const state = stateNote(request, null)
  return [
    `Mac command · ${plainText(macName(request))} · ${stateLabel(request)}`,
    codeBlock(request.command, 'sh'),
    `${commandCopy.in} ${inlineCode(request.folder)} · ${commandCopy.upTo} ${limitLabel(request.timeoutSeconds)}`,
    ...(commandRan(request)
      ? [output === null ? commandCopy.empty : codeBlock(output)]
      : []),
    ...(request.result?.truncated ? [commandCopy.truncated] : []),
    ...(state ? [plainText(state)] : []),
  ].join('\n\n')
}

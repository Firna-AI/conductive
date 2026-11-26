import { productName } from '../shared/brand'
import { text, type Text } from './legal-text'

/**
 * The items about services and operational logs of the list "What the
 * product uses, and why" in the privacy notice. They live in their own
 * module to keep that section under the file length limit.
 */
export const privacyOperationItems: readonly Text[] = [
  text`Services: a service is a named program outside an agent turn.
      ${productName} keeps its filtered name, short program label, folder,
      state, times, exit result, ports, and originating session when it
      can match that session. Otherwise, the source shows Local command.
      This context does not prove which person started it. The list
      and control results let members follow and manage services.
      The saved full command, environment values, and raw logs stay in
      runtime storage on the cloud computer. ${productName} reads and
      filters recent output when a member opens or reloads its log.
      It sends that excerpt to the member to show the log.`,
  text`Operational logs: ${productName} records when the program that
      runs workspace agents connects to the service or disconnects.
      It also records turns that end without a Stop request, including
      whether they finished, stopped, or failed.
      It also records work on a message from that program when a restart
      of the service ends that work. That record holds the kind of the
      work, how far it got, the event type and number, and the size of the
      message. To find such work, ${productName} keeps a short note of
      the work that starts in the first 30 seconds after the program
      connects. It keeps the note while the work runs, and after a
      restart until the program connects again.
      When a member's app reads the sessions of a workspace,
      ${productName} also records each session whose active turn the service
      does not count as running. That record holds the stored state of the
      turn, the reason, and the start time of the turn.
      These records include the workspace ID and any available session,
      turn, connection, and event stream IDs, and communication protocol
      version. When available, they also include a random ID for each start
      of that program. The team uses these logs to investigate connection
      problems, program restarts, interrupted agent work, and turns that show
      as working after they end. These logs hold no tokens, secret values,
      message text, file contents, or connection close reasons.
      ${productName} also records when each step of a cloud computer
      build and of a workspace start begins and ends, with the IDs of the
      org, the workspace, and the build or the start, and the time of its calls to
      other services. The team uses these records to make builds and
      starts faster. They hold no names of repositories or branches, and
      no message text, file contents, or secret values.`,
]

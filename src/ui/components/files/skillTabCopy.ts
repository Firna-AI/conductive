import type { Agent } from '../../../shared/generated/Agent'

/**
 * The words of the tab of a skill: the agent of the skill in the header,
 * the line while the text loads, the notices in place of the text, and the
 * failure of the read with its button. The app and the mockups share them.
 */
export const skillTabCopy = {
  /**
   * The label after the name in the header: the agent whose skill the tab
   * shows. Two agents can hold skills with one name and different texts,
   * and the title of the tab is only the name.
   */
  agent: {
    claude: 'Claude skill',
    codex: 'Codex skill',
  } satisfies Readonly<Record<Agent, string>>,
  /** The line beside the spinner while the read of the text runs. */
  loading: 'Opening the skill',
  /**
   * The list of the agent no longer holds the skill, such as after a
   * rename, or after its folder or its org skill went away.
   */
  goneTitle: 'This skill was removed or renamed',
  goneBody: 'Type / in a message to see the current skills.',
  /** The `SKILL.md` of the skill passes the read limit of the skills. */
  tooLargeTitle: 'This skill is too large to show',
  tooLargeBody: 'Skills up to 1 MB show here.',
  /**
   * The software of the cloud computer cannot read a skill yet. Restart in
   * the workspace header installs the newest software, so the notice has no
   * button of its own, as for the preview of an HTML file.
   */
  olderSoftwareTitle: 'Restart to open this skill',
  olderSoftwareBody:
    'Opening a skill needs newer cloud computer software. Select Restart in the workspace header.',
  /**
   * The read failed for a cause without a notice of its own: the cloud
   * computer cannot read the file, its connection dropped, or the server
   * failed. The words follow the failure of a file tab, "This file didn't
   * open". The title names what failed and Try again repeats the read, so
   * the notice has no sentence under its title.
   */
  failedTitle: "This skill didn't open",
  /** The button of the failed read, which reads the text again. */
  tryAgain: 'Try again',
} as const

import type { ChangelogPost } from '../../../../src/marketing/changelog-model'

/**
 * Sample posts of the changelog page, newest first: a day with a lead and
 * all three sections, a day with six versions, and a day with fixes only.
 * Their changes follow real releases loosely. They are not the posts of the
 * site.
 */
export const changelogSamplePosts: readonly ChangelogPost[] = [
  {
    date: '2026-11-12',
    title: 'Syntax colours in diffs',
    versions: ['0.13.0', '0.14.0', '0.15.0'],
    lead: 'Diffs show the colours of your code, in light and dark, so each change is quicker to read.',
    sections: {
      new: [
        'Connect Claude and Codex through your own endpoint, such as a proxy of your company.',
        'Copy a link to a workspace or a session from its menu.',
        'Close a preview tab from the tab itself.',
      ],
      improved: [
        'Long chats open faster, because the newest messages load first.',
        'A sent message shows at once, and the message box clears.',
        'Drag the line between the files and the tools to give each more room.',
      ],
      fixed: [
        'A workspace that resumes shows Starting, not a Resume bar.',
        'A file tab always shows the name of its file.',
      ],
    },
  },
  {
    date: '2026-11-11',
    title: 'Drop files into your messages',
    versions: ['0.8.0', '0.9.0', '0.9.1', '0.10.0', '0.11.0', '0.12.0'],
    sections: {
      new: [
        'Drop files into the message box, where each file shows as a chip in your text.',
        'Keyboard shortcuts for common commands, with a tab in your account to change them.',
        'Workspace marks show the state of the pull request on GitHub.',
        'Send feedback from the command palette.',
      ],
      improved: [
        'Agent messages show their headings.',
        'Session history loads faster, and the chat shows while it loads.',
      ],
    },
  },
  {
    date: '2026-11-10',
    title: 'Fixes for files and commits',
    versions: ['0.7.0'],
    sections: {
      fixed: [
        'A file of a stopped workspace opens once its cloud computer starts.',
        'Commits made on a cloud computer name their author.',
        'The New workspace row has its usual look again.',
      ],
    },
  },
]

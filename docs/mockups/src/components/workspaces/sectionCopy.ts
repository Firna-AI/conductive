/**
 * The words of the New section dialog. This module imports no fixture, so
 * the app uses it too.
 */
export const newSectionWords = {
  title: 'New section',
  label: 'Name',
  placeholder: 'Section name',
  create: 'Create section',
  failed: "The section wasn't created",
  /** Where New section in the menu of a section puts the new section. */
  below: (name: string) => `The new section goes below ${name}.`,
  /** Where New section in the command palette puts the new section. */
  atEnd: 'The new section goes at the end of the list.',
} as const

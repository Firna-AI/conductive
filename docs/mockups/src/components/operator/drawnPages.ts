import { paths } from '../../paths'

/** The saved page of each record of one kind, by its name, if any. */
type PagesByName = Readonly<Record<string, string | undefined>>

/**
 * The saved pages of the records that an operator page names: the orgs by
 * name, the users by GitHub login, and the invite codes by label. The
 * catalogue is static and draws the pages of only some records. A page
 * that takes this lookup links a record only to the page of that record,
 * and shows a record without one as text.
 */
export type DrawnPages = {
  orgs: PagesByName
  users: PagesByName
  codes: PagesByName
}

/**
 * The drawn pages of the records that the pages of the Deletions tab name:
 * Hexwave, and the invite code Launch week. Rhino Data and @vex-ops have
 * no saved page, so these pages show them as text.
 */
export const drawnPages: DrawnPages = {
  orgs: { Hexwave: paths.operatorOrg },
  users: {},
  codes: { 'Launch week': paths.operatorCodesSearch },
}

/**
 * The page that a link to a record opens. With the lookup, it is the drawn
 * page of that record, or none. Without it, the screen keeps its link.
 */
export function linkTo(
  pages: DrawnPages | undefined,
  kind: keyof DrawnPages,
  name: string,
  link: string,
): string | undefined {
  return pages ? pages[kind][name] : link
}

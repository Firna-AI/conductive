import { isOrgColor, type OrgColor } from '../../src/shared/org-colors'
import { HttpError, requiredString } from '../http'

/** The fields of an org that a PATCH saves. An absent field keeps its value. */
interface OrgUpdate {
  name?: string
  initials?: string
  color?: OrgColor
}

/**
 * Reads the PATCH of an org. A rename gives the name, and the initials
 * when they change. A colour change can come alone, without the name. A
 * colour that is not a preset key is refused.
 */
export function readOrgUpdate(body: Record<string, unknown> | null) {
  const update: OrgUpdate = {}
  if (body?.color !== undefined) {
    if (!isOrgColor(body.color))
      throw new HttpError(400, 'invalid_input', 'Choose one of the colours.')
    update.color = body.color
  }
  if (body?.name !== undefined || update.color === undefined)
    update.name = requiredString(body?.name)
  if (body?.initials !== undefined)
    update.initials = requiredString(body.initials)
  return update
}

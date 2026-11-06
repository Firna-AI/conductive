import { orgPath } from './api'

export function sectionsPath(orgId: string): string {
  return `${orgPath(orgId)}/sections`
}
export function sectionPath(orgId: string, sectionId: string): string {
  return `${sectionsPath(orgId)}/${encodeURIComponent(sectionId)}`
}

export interface Section {
  id: string
  orgId: string
  name: string
  position: number
  isDefault: boolean
  collapsed: boolean
}
export interface SectionsResponse {
  sections: readonly Section[]
}
export interface CreateSectionRequest {
  name: string
}
export interface SectionResponse {
  section: Section
}
export interface UpdateSectionRequest {
  name?: string
  collapsed?: boolean
  position?: number
}

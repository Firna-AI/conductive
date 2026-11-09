import type { ParityFeature } from '../model'

export const securityPrivacyAndAdminFeatures: readonly ParityFeature[] = [
  {
    id: 'cloud-data-storage',
    area: 'security-privacy-and-admin',
    name: 'Cloud data storage',
    status: 'available',
    note: 'Chats stay on the service so agents can continue and members can share the history.',
  },
  {
    id: 'cloud-sandbox-isolation',
    area: 'security-privacy-and-admin',
    name: 'Cloud sandbox isolation',
    status: 'available',
    note: 'Each workspace runs in a separate cloud computer with its own repository copies.',
  },
  {
    id: 'sso-and-scim',
    area: 'security-privacy-and-admin',
    name: 'SSO and SCIM',
    status: 'not-planned',
    note: 'GitHub is the only sign-in, with no SSO or SCIM. New accounts need approval or an invite for app access.',
  },
  {
    id: 'admin-roles',
    area: 'security-privacy-and-admin',
    name: 'Admin roles',
    status: 'available',
    note: 'Each org has admins and members. Several people can be admins.',
  },
  {
    id: 'product-analytics',
    area: 'security-privacy-and-admin',
    name: 'Product analytics',
    status: 'considering',
    note: 'Conductive does not collect product analytics. Product analytics have no committed delivery plan.',
  },
  {
    id: 'soc-2-type-ii',
    area: 'security-privacy-and-admin',
    name: 'SOC 2 Type II',
    status: 'considering',
    note: 'Conductive has no SOC 2 Type II report.',
  },
]

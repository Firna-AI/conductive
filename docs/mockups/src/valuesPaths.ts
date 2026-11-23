/**
 * The pages of the proposal that combines the env vars and the secrets of
 * an org in one tab, Env & secrets. The proposal lives under
 * `app/org-settings/secrets/combined` until the change lands.
 */
export const valuesPaths = {
  list: 'app/org-settings/secrets/combined',
  add: 'app/org-settings/secrets/combined/add',
  memberAdd: 'app/org-settings/secrets/combined/member/add',
} as const

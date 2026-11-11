export function previewEnvironment() {
  return {
    CLOUDFLARE_API_TOKEN: 'fake-cloudflare-token',
    CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    PREVIEW_ZONE: 'preview.example',
    GITHUB_CLIENT_ID: 'fake-github-client',
    GITHUB_APP_SLUG: 'conductive-preview-test',
    BOAT_ORG_ID: 'fake-preview-org',
    OPERATOR_GITHUB_IDS: '123,456',
    GITHUB_CLIENT_SECRET: 'fake-client-secret',
    GITHUB_APP_PRIVATE_KEY: 'fake-private-key\nsecond line\n',
    GITHUB_WEBHOOK_SECRET: 'fake-webhook-secret',
    SESSION_SIGNING_KEY: 'fake-signing-key',
    BOAT_KEY_ENCRYPTION_KEY: 'fake-encryption-key',
    BOAT_API_KEY: 'fake-boat-key',
  }
}

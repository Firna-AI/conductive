//! HTTP client configuration for large sandbox release archives.

use std::time::Duration;

use async_trait::async_trait;
use cli_release_interface::ReleaseAssetInfo;
use cli_updater::{HttpReleaseClient, ReleaseClient};
use cnd_release::signature::RELEASE_PUBLIC_KEY;

use super::ports::ReleaseSource;

/// Compose the release download client with separate connect and total limits.
pub fn release_client(server: &str) -> cli_updater::Result<HttpReleaseClient> {
    HttpReleaseClient::new_with_timeouts(
        server,
        Duration::from_secs(60 * 60),
        Duration::from_secs(10),
    )
}

#[async_trait]
impl ReleaseSource for HttpReleaseClient {
    async fn download(&self, asset: &ReleaseAssetInfo) -> cli_updater::Result<Vec<u8>> {
        ReleaseClient::download(self, asset).await
    }

    fn verification_key(&self) -> &[u8; 32] {
        &RELEASE_PUBLIC_KEY
    }
}

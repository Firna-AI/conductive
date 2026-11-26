//! Apply restores missing parts of the starting release, with mocked ports.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cli_release_interface::ReleaseAssetInfo;
use cli_updater::ReleaseClient;
use tokio::time::Instant;
use unimock::{Clause, MockFn, Unimock, matching};

use super::error::Error;
use super::ports::{State, StoreMock, UpdateEngine};
use super::test_support::{ClientMock, engine, engine_with_client, locked, parts};
use super::warned_parts::WarnedParts;

/// The current release 0.0.5 starts, and every part except the SDK helper is missing.
fn current_release_without(missing: &'static [&'static str]) -> impl Clause {
    (
        StoreMock::apply_lock
            .some_call(matching!())
            .returns(Ok(locked())),
        StoreMock::state.some_call(matching!()).returns(Ok(State {
            current: Some("0.0.5".into()),
            ..State::default()
        })),
        StoreMock::versions
            .some_call(matching!())
            .returns(Ok(vec!["0.0.5".into()])),
        StoreMock::parts
            .some_call(matching!("0.0.5"))
            .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
        StoreMock::has_part
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, part| {
                Ok(!missing.contains(&part.name.as_str()))
            })),
    )
}

#[tokio::test]
async fn apply_downloads_only_the_missing_parts_of_the_current_release()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(
        Unimock::new((
            current_release_without(&["node"]),
            StoreMock::unpack
                .next_call(matching!((part, bytes) if part.name == "node" && *bytes == b"node"))
                .returns(Ok(())),
        )),
        Unimock::new(
            ClientMock::download
                .next_call(matching!((asset) if asset.download_url == "https://releases.test/node.tar.gz" && asset.version == "0.0.5"))
                .returns(Ok(b"node".to_vec())),
        ),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().await?;
    Ok(())
}

#[tokio::test]
async fn a_failed_part_download_warns_and_keeps_the_later_parts_and_the_start()
-> Result<(), Box<dyn std::error::Error>> {
    let warnings = WarnedParts::capture();
    let engine = engine(
        Unimock::new((
            current_release_without(&["node", "system"]),
            StoreMock::unpack
                .next_call(matching!((part, _) if part.name == "system"))
                .returns(Ok(())),
        )),
        Unimock::new((
            ClientMock::download
                .next_call(matching!((asset) if asset.binary == "node"))
                .returns(Err(cli_updater::Error::ReleaseServerStatus {
                    url: "https://releases.test/node.tar.gz".into(),
                    status: 503,
                })),
            ClientMock::download
                .next_call(matching!((asset) if asset.binary == "system"))
                .returns(Ok(b"system".to_vec())),
        )),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().await?;
    assert_eq!(warnings.parts(), ["node"]);
    Ok(())
}

/// Never answers for the stalled parts, and answers the others after a delay.
struct Replies {
    stalled: &'static [&'static str],
    delay: Duration,
}

#[async_trait]
impl ReleaseClient for Replies {
    async fn latest(&self, _: &str, _: &str) -> cli_updater::Result<ReleaseAssetInfo> {
        std::future::pending().await
    }
    async fn download(&self, asset: &ReleaseAssetInfo) -> cli_updater::Result<Vec<u8>> {
        if self.stalled.contains(&asset.binary.as_str()) {
            std::future::pending::<()>().await;
        }
        tokio::time::sleep(self.delay).await;
        Ok(asset.binary.as_bytes().to_vec())
    }
}

#[tokio::test(start_paused = true)]
async fn a_stalled_part_leaves_its_share_to_the_next_part() -> Result<(), Box<dyn std::error::Error>>
{
    let warnings = WarnedParts::capture();
    let engine = engine_with_client(
        Unimock::new((
            current_release_without(&["node", "system"]),
            StoreMock::unpack
                .next_call(matching!((part, bytes) if part.name == "system" && *bytes == b"system"))
                .returns(Ok(())),
        )),
        Arc::new(Replies {
            stalled: &["node"],
            delay: Duration::from_secs(25),
        }),
    );
    let started = Instant::now();
    tokio::time::timeout(Duration::from_secs(120), engine.apply()).await??;
    assert!(started.elapsed() <= Duration::from_secs(60));
    assert_eq!(warnings.parts(), ["node"]);
    Ok(())
}

#[tokio::test(start_paused = true)]
async fn stalled_parts_end_within_the_repair_limit() -> Result<(), Box<dyn std::error::Error>> {
    let warnings = WarnedParts::capture();
    let engine = engine_with_client(
        Unimock::new(current_release_without(&["node", "system"])),
        Arc::new(Replies {
            stalled: &["node", "system"],
            delay: Duration::ZERO,
        }),
    );
    let started = Instant::now();
    tokio::time::timeout(Duration::from_secs(120), engine.apply()).await??;
    assert!(
        started.elapsed() <= Duration::from_secs(60),
        "the repair passed its limit of 60 seconds"
    );
    assert_eq!(warnings.parts(), ["node", "system"]);
    Ok(())
}

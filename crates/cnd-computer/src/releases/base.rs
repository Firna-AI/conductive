//! Share each in-progress Podman image import by its local tag.

use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::computer::operations::ComputerRelease;
use futures_util::future::{FutureExt, WeakShared};
use tokio::sync::Mutex;

use crate::engine::error::EngineError;
use crate::engine::ports::Engine;
use crate::error::{Error, ErrorResultExt, Result};
use crate::settings::ServerUrl;

use super::ports::{BaseImages, ImageJournal, Releases};

type Download = Pin<Box<dyn Future<Output = std::result::Result<(), LoadFailure>> + Send>>;

/// Import missing signed images, with one in-progress import per base tag.
pub struct BaseImageLoader {
    engine: Arc<dyn Engine>,
    releases: Arc<dyn Releases>,
    journal: Arc<dyn ImageJournal>,
    loading: Mutex<HashMap<String, WeakShared<Download>>>,
}

impl BaseImageLoader {
    /// Use the local engine, signed release source, and import journal.
    pub fn new(
        engine: Arc<dyn Engine>,
        releases: Arc<dyn Releases>,
        journal: Arc<dyn ImageJournal>,
    ) -> Self {
        Self {
            engine,
            releases,
            journal,
            loading: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Clone, Copy)]
enum LoadFailure {
    Invalid,
    Unavailable,
    NoSpace,
    Internal,
}

impl From<Error> for LoadFailure {
    fn from(error: Error) -> Self {
        match error {
            Error::ReleaseInvalid => Self::Invalid,
            Error::ReleaseUnavailable => Self::Unavailable,
            Error::NoSpace => Self::NoSpace,
            _ => Self::Internal,
        }
    }
}

impl From<LoadFailure> for Error {
    fn from(error: LoadFailure) -> Self {
        match error {
            LoadFailure::Invalid => Self::ReleaseInvalid,
            LoadFailure::Unavailable => Self::ReleaseUnavailable,
            LoadFailure::NoSpace => Self::NoSpace,
            LoadFailure::Internal => Self::ImageImportFailed,
        }
    }
}

#[async_trait]
impl BaseImages for BaseImageLoader {
    async fn ensure(&self, server: &ServerUrl, release: &ComputerRelease) -> Result<String> {
        let tag = format!("localhost/conductive/base:{}", release.version);
        let shared = {
            let mut loading = self.loading.lock().await;
            if let Some(existing) = loading.get(&tag).and_then(WeakShared::upgrade) {
                existing
            } else {
                loading.retain(|_, download| download.upgrade().is_some());
                let import = Import {
                    tag: tag.clone(),
                    engine: self.engine.clone(),
                    releases: self.releases.clone(),
                    journal: self.journal.clone(),
                    server: server.clone(),
                    release: release.clone(),
                };
                let download: Download = Box::pin(async move { Ok(import.run().await?) });
                let shared = download.shared();
                if let Some(weak) = shared.downgrade() {
                    loading.insert(tag.clone(), weak);
                }
                shared
            }
        };
        shared.await?;
        Ok(tag)
    }
}

struct Import {
    tag: String,
    engine: Arc<dyn Engine>,
    releases: Arc<dyn Releases>,
    journal: Arc<dyn ImageJournal>,
    server: ServerUrl,
    release: ComputerRelease,
}

impl Import {
    async fn run(&self) -> Result<()> {
        if !self.journal.incomplete(&self.release.version)?
            && engine(self.engine.image_exists(&self.tag).await)?
        {
            return Ok(());
        }
        let archive = self.releases.base(&self.server, &self.release).await?;
        self.journal.start(&self.release.version)?;
        engine(
            self.engine
                .load(archive.path(), archive.image_id(), &self.tag)
                .await,
        )?;
        self.journal.complete(&self.release.version)
    }
}

fn engine<T>(result: std::result::Result<T, EngineError>) -> Result<T> {
    match result {
        Err(EngineError::NoSpace) => Err(Error::NoSpace),
        Err(EngineError::ImageIdMismatch) => Err(Error::ReleaseInvalid),
        result => result.internal(),
    }
}

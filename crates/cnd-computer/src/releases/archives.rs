//! Stream authenticated archives to private temporary files while hashing.

use std::path::Path;

use reqwest::Response;
use sha2::{Digest, Sha256};
use tempfile::{NamedTempFile, TempPath};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

use crate::disk::private_directory;
use crate::error::{Error, Result};

pub(super) async fn download(
    cache: &Path,
    mut response: Response,
    expected_digest: &str,
    expected_size: Option<u64>,
    limit: u64,
) -> Result<TempPath> {
    if let Some(content_length) = response.content_length()
        && (content_length > limit || expected_size.is_some_and(|size| size != content_length))
    {
        return Err(Error::ReleaseInvalid);
    }
    private_directory(cache)?;
    let (file, path) = NamedTempFile::new_in(cache)?.into_parts();
    let mut file = File::from_std(file);
    let mut digest = Sha256::new();
    let mut bytes = 0;
    loop {
        let Ok(chunk) = response.chunk().await else {
            return Err(Error::ReleaseUnavailable);
        };
        let Some(chunk) = chunk else { break };
        bytes += chunk.len() as u64;
        if bytes > limit {
            return Err(Error::ReleaseInvalid);
        }
        digest.update(&chunk);
        file.write_all(&chunk).await?;
    }
    if expected_size.is_some_and(|size| size != bytes)
        || digest
            .finalize()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>()
            != expected_digest
    {
        return Err(Error::ReleaseInvalid);
    }
    file.sync_all().await?;
    Ok(path)
}

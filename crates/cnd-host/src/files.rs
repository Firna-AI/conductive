//! Native file metadata and bounded base64 reads as the sandbox user.

use std::io::ErrorKind;

use async_trait::async_trait;
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use cnd_runner_interface::host::limits::HOST_FILE_READ_MAX_BYTES;
use cnd_runner_interface::host::results::{HostErrorCode, HostFileEncoding, HostResult};
use rustix::fs::OFlags;
use tokio::fs::{self, OpenOptions};
use tokio::io::AsyncReadExt;

use crate::dispatch::SAFE_INTEGER;
use crate::error::Result;
use crate::ports::Files;

/// Native file access. The dispatcher validates absolute paths and limits.
pub struct NativeFiles;

#[async_trait]
impl Files for NativeFiles {
    async fn info(&self, path: &str) -> Result<HostResult> {
        Ok(match fs::metadata(path).await {
            Ok(metadata) if metadata.len() <= SAFE_INTEGER => HostResult::FileInfo {
                path: path.into(),
                size_bytes: metadata.len(),
                is_directory: metadata.is_dir(),
            },
            Ok(_) => failure(HostErrorCode::Internal),
            Err(error) => failure(code(error.kind())),
        })
    }

    async fn read(&self, path: &str, max_bytes: u64) -> Result<HostResult> {
        if max_bytes > HOST_FILE_READ_MAX_BYTES as u64 {
            return Ok(failure(HostErrorCode::InvalidRequest));
        }
        let file = match OpenOptions::new()
            .read(true)
            .custom_flags(OFlags::NONBLOCK.bits() as i32)
            .open(path)
            .await
        {
            Ok(file) => file,
            Err(error) => {
                return Ok(match fs::metadata(path).await {
                    Ok(metadata) if !metadata.is_file() && !metadata.is_dir() => {
                        failure(HostErrorCode::InvalidRequest)
                    }
                    _ => failure(code(error.kind())),
                });
            }
        };
        let metadata = match file.metadata().await {
            Ok(metadata) => metadata,
            Err(error) => return Ok(failure(code(error.kind()))),
        };
        if metadata.is_dir() {
            return Ok(failure(HostErrorCode::IsDirectory));
        }
        if !metadata.is_file() {
            return Ok(failure(HostErrorCode::InvalidRequest));
        }
        if metadata.len() > SAFE_INTEGER {
            return Ok(failure(HostErrorCode::Internal));
        }
        if metadata.len() > max_bytes {
            return Ok(HostResult::FileTooLarge {
                size_bytes: metadata.len(),
                limit_bytes: max_bytes,
            });
        }
        let mut bytes = Vec::new();
        if let Err(error) = file.take(max_bytes + 1).read_to_end(&mut bytes).await {
            return Ok(failure(code(error.kind())));
        }
        if bytes.len() as u64 > max_bytes {
            return Ok(HostResult::FileTooLarge {
                size_bytes: bytes.len() as u64,
                limit_bytes: max_bytes,
            });
        }
        Ok(HostResult::FileContent {
            path: path.into(),
            size_bytes: bytes.len() as u64,
            encoding: HostFileEncoding::Base64,
            content: STANDARD.encode(bytes),
        })
    }
}

fn code(kind: ErrorKind) -> HostErrorCode {
    match kind {
        ErrorKind::NotFound => HostErrorCode::NotFound,
        ErrorKind::PermissionDenied => HostErrorCode::PermissionDenied,
        ErrorKind::IsADirectory => HostErrorCode::IsDirectory,
        _ => HostErrorCode::Internal,
    }
}

fn failure(code: HostErrorCode) -> HostResult {
    HostResult::Error { code }
}

//! Bounded raw offsets and UTF-8-safe output chunk boundaries.

use std::io::{ErrorKind, SeekFrom};
use std::path::Path;

use cnd_runner_interface::host::limits::HOST_COMMAND_REPLY_MAX_BYTES;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt};

use crate::dispatch::SAFE_INTEGER;
use crate::error::{Error, ErrorResultExt, Result};

pub(super) async fn read(path: &Path, offset: u64, ended: bool) -> Result<(String, u64, bool)> {
    let mut file = match File::open(path).await {
        Ok(file) => file,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            return Ok((String::new(), offset, false));
        }
        other => other.internal()?,
    };
    file.seek(SeekFrom::Start(offset)).await.internal()?;
    let mut bytes = Vec::new();
    (&mut file)
        .take((HOST_COMMAND_REPLY_MAX_BYTES / 16) as u64)
        .read_to_end(&mut bytes)
        .await
        .internal()?;
    let size = file.metadata().await.internal()?.len();
    if size > SAFE_INTEGER {
        return Err(Error::internal_message(
            "command output exceeds the wire integer range",
        ));
    }
    let complete = prefix(&bytes, ended && offset + bytes.len() as u64 >= size);
    let next = offset + complete as u64;
    Ok((
        String::from_utf8_lossy(&bytes[..complete]).into_owned(),
        next,
        next < size,
    ))
}

fn prefix(bytes: &[u8], ended: bool) -> usize {
    if ended {
        return bytes.len();
    }
    let mut cursor = 0;
    loop {
        match std::str::from_utf8(&bytes[cursor..]) {
            Ok(_) => return bytes.len(),
            Err(error) => {
                cursor += error.valid_up_to();
                match error.error_len() {
                    Some(invalid) => cursor += invalid,
                    None => return cursor,
                }
            }
        }
    }
}

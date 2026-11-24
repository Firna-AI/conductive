//! Pure binary frame encoding, with byte payloads preserved across UTF-8 cuts.

use internal_error::InternalError;
use thiserror::Error;
use ts_rs::TS;

use super::limits::{HOST_MESSAGE_PART_BYTES, HOST_STREAM_FRAME_BYTES};

/// Decoded binary host frame. Only complete messages undergo UTF-8 decoding.
#[derive(Debug, Clone, PartialEq, Eq, TS)]
#[ts(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum HostFrame {
    /// Bytes for one open stream.
    StreamData {
        /// Stream identity.
        stream_id: u32,
        /// One non-empty stream payload.
        #[ts(type = "Uint8Array")]
        data: Vec<u8>,
    },
    /// Bytes of one complete request or reply JSON document.
    MessagePart {
        /// Request identity.
        request_id: u32,
        /// Whether this is the final part.
        last: bool,
        /// Raw bytes, possibly ending within a UTF-8 code point.
        #[ts(type = "Uint8Array")]
        data: Vec<u8>,
    },
}

/// Invalid binary transport input.
#[derive(Debug, Error, internal_error::ErrorContract)]
pub enum Error {
    /// The frame kind is neither stream data nor a message part.
    #[error("[cnd-runner-interface/host/frames] invalid frame kind")]
    InvalidKind,
    /// The frame lacks its complete header.
    #[error("[cnd-runner-interface/host/frames] short frame header")]
    ShortHeader,
    /// Stream data must contain at least one byte.
    #[error("[cnd-runner-interface/host/frames] empty stream frame")]
    EmptyStream,
    /// The payload exceeds the limit for its frame kind.
    #[error("[cnd-runner-interface/host/frames] frame payload too large")]
    PayloadTooLarge,
    /// A message part sets a reserved flag bit.
    #[error("[cnd-runner-interface/host/frames] invalid message part flags")]
    InvalidFlags,
    /// An unexpected internal failure.
    #[error("[cnd-runner-interface/host/frames] internal: {0:?}")]
    Internal(#[from] InternalError),
}

/// Result of a host frame conversion.
pub type Result<T> = std::result::Result<T, Error>;

/// Encode one frame after checking its payload bounds.
pub fn encode(frame: &HostFrame) -> Result<Vec<u8>> {
    let (kind, id, data, last) = match frame {
        HostFrame::StreamData { stream_id, data } => (1, *stream_id, data, None),
        HostFrame::MessagePart {
            request_id,
            last,
            data,
        } => (2, *request_id, data, Some(*last)),
    };
    check_payload(data.len(), kind == 1)?;
    let mut bytes = Vec::with_capacity(6 + data.len());
    bytes.push(kind);
    bytes.extend_from_slice(&id.to_be_bytes());
    if let Some(last) = last {
        bytes.push(u8::from(last));
    }
    bytes.extend_from_slice(data);
    Ok(bytes)
}

/// Decode one frame without attempting to decode a message part as UTF-8.
pub fn decode(bytes: &[u8]) -> Result<HostFrame> {
    if bytes.len() < 5 {
        return Err(Error::ShortHeader);
    }
    let id = u32::from_be_bytes([bytes[1], bytes[2], bytes[3], bytes[4]]);
    match bytes[0] {
        1 => {
            let data = &bytes[5..];
            check_payload(data.len(), true)?;
            Ok(HostFrame::StreamData {
                stream_id: id,
                data: data.to_vec(),
            })
        }
        2 => {
            if bytes.len() < 6 {
                return Err(Error::ShortHeader);
            }
            let flags = bytes[5];
            if flags & !1 != 0 {
                return Err(Error::InvalidFlags);
            }
            let data = &bytes[6..];
            check_payload(data.len(), false)?;
            Ok(HostFrame::MessagePart {
                request_id: id,
                last: flags == 1,
                data: data.to_vec(),
            })
        }
        _ => Err(Error::InvalidKind),
    }
}

fn check_payload(size: usize, stream: bool) -> Result<()> {
    if stream && size == 0 {
        return Err(Error::EmptyStream);
    }
    let limit = if stream {
        HOST_STREAM_FRAME_BYTES
    } else {
        HOST_MESSAGE_PART_BYTES
    };
    if size > limit {
        return Err(Error::PayloadTooLarge);
    }
    Ok(())
}

#[cfg(test)]
#[path = "_tests_/frames_tests.rs"]
mod frames_tests;

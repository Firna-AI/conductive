//! Bounded message assembly and pure outbound host message framing.

use std::collections::BTreeMap;

use cnd_runner_interface::host::frames::{self, HostFrame};
use cnd_runner_interface::host::limits::{
    HOST_MAX_PENDING_REQUESTS, HOST_MESSAGE_PART_BYTES, HOST_REPLY_MAX_BYTES,
    HOST_REQUEST_MAX_BYTES,
};
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::json::decoder;

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::Incoming;

/// One outbound WebSocket payload.
#[derive(Debug, PartialEq, Eq)]
pub enum Packet {
    /// Complete compact JSON text.
    Text(String),
    /// A framed message part or stream payload.
    Binary(Vec<u8>),
}

/// Encode large replies as ordered raw JSON byte parts.
pub fn encode(message: &HostToWorker) -> Result<Vec<Packet>> {
    let bytes = serde_json::to_vec(message).internal()?;
    if bytes.len() <= HOST_MESSAGE_PART_BYTES {
        return Ok(vec![Packet::Text(String::from_utf8(bytes).internal()?)]);
    }
    let HostToWorker::Reply { request_id, .. } = message else {
        return Err(Error::Protocol);
    };
    let count = bytes.len().div_ceil(HOST_MESSAGE_PART_BYTES);
    bytes
        .chunks(HOST_MESSAGE_PART_BYTES)
        .enumerate()
        .map(|(index, data)| {
            Ok(Packet::Binary(
                frames::encode(&HostFrame::MessagePart {
                    request_id: *request_id,
                    last: index + 1 == count,
                    data: data.to_vec(),
                })
                .internal()?,
            ))
        })
        .collect()
}

/// Per-connection request assembly. No part survives a reconnect.
#[derive(Default)]
pub struct Reader {
    parts: BTreeMap<u32, Vec<u8>>,
}

impl Reader {
    /// Parse one complete inline message within its text budget.
    pub fn text(&mut self, bytes: &[u8]) -> Result<Incoming> {
        if bytes.len() > HOST_REPLY_MAX_BYTES {
            return Err(Error::Protocol);
        }
        self.message(bytes)
    }

    /// Assemble requests or hand raw stream data to the session.
    pub fn binary(&mut self, bytes: &[u8]) -> Result<Incoming> {
        let frame = match frames::decode(bytes) {
            Ok(frame) => frame,
            Err(_) => return Err(Error::Protocol),
        };
        match frame {
            HostFrame::StreamData { stream_id, data } => Ok(Incoming::Data { stream_id, data }),
            HostFrame::MessagePart {
                request_id,
                last,
                data,
            } => {
                if !self.parts.contains_key(&request_id)
                    && self.parts.len() >= HOST_MAX_PENDING_REQUESTS
                {
                    return Err(Error::Protocol);
                }
                let joined = self.parts.entry(request_id).or_default();
                if joined.len() + data.len() > HOST_REQUEST_MAX_BYTES {
                    return Err(Error::Protocol);
                }
                joined.extend_from_slice(&data);
                if !last {
                    return Ok(Incoming::Activity);
                }
                let joined = self.parts.remove(&request_id).ok_or(Error::Protocol)?;
                let message = self.message(&joined)?;
                match &message {
                    Incoming::Message(WorkerToHost::Request { request_id: id, .. })
                        if *id == request_id =>
                    {
                        Ok(message)
                    }
                    _ => Err(Error::Protocol),
                }
            }
        }
    }

    fn message(&self, bytes: &[u8]) -> Result<Incoming> {
        match decoder::decode::<WorkerToHost>(bytes) {
            Ok(message) => Ok(Incoming::Message(message)),
            Err(_) => Err(Error::Protocol),
        }
    }
}

#[cfg(test)]
#[path = "_tests_/wire_tests.rs"]
mod tests;

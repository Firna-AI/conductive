//! Bounded JSON messages and shared binary message parts.

use std::collections::BTreeMap;

use cnd_runner_interface::computer::limits::{
    COMPUTER_MAX_PENDING_REQUESTS, COMPUTER_MESSAGE_PART_BYTES, COMPUTER_REPLY_MAX_BYTES,
    COMPUTER_REQUEST_MAX_BYTES,
};
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};
use cnd_runner_interface::host::frames::{self, HostFrame};
use cnd_runner_interface::json::decoder;
use tokio_tungstenite::tungstenite::Message;

use crate::error::{Error, ErrorResultExt, Result};
use crate::socket::Incoming;

pub(crate) fn encode(message: &ComputerToWorker) -> Result<Vec<Message>> {
    let text = serde_json::to_string(message).internal()?;
    if text.len() > COMPUTER_REPLY_MAX_BYTES {
        return Err(Error::Protocol);
    }
    if text.len() <= COMPUTER_MESSAGE_PART_BYTES {
        return Ok(vec![Message::Text(text.into())]);
    }
    let ComputerToWorker::Reply { request_id, .. } = message else {
        return Err(Error::Protocol);
    };
    let count = text.len().div_ceil(COMPUTER_MESSAGE_PART_BYTES);
    text.as_bytes()
        .chunks(COMPUTER_MESSAGE_PART_BYTES)
        .enumerate()
        .map(|(index, chunk)| {
            let frame = HostFrame::MessagePart {
                request_id: *request_id,
                last: index + 1 == count,
                data: chunk.to_vec(),
            };
            Ok(Message::Binary(frames::encode(&frame).internal()?.into()))
        })
        .collect()
}

#[derive(Default)]
pub(crate) struct Reader {
    parts: BTreeMap<u32, Vec<u8>>,
    buffered: usize,
}

impl Reader {
    pub(crate) fn text(&self, bytes: &[u8]) -> Result<Incoming> {
        let message = decode(bytes)?;
        if let WorkerToComputer::Request { request_id, .. } = &message
            && self.parts.contains_key(request_id)
        {
            return Err(Error::Protocol);
        }
        Ok(Incoming::Message(message))
    }

    pub(crate) fn binary(&mut self, bytes: &[u8]) -> Result<Incoming> {
        let Ok(HostFrame::MessagePart {
            request_id,
            last,
            data,
        }) = frames::decode(bytes)
        else {
            return Err(Error::Protocol);
        };
        if request_id == 0
            || (!self.parts.contains_key(&request_id)
                && self.parts.len() >= COMPUTER_MAX_PENDING_REQUESTS)
            || self.buffered + data.len() > 2 * COMPUTER_REQUEST_MAX_BYTES
        {
            return Err(Error::Protocol);
        }
        let buffer = self.parts.entry(request_id).or_default();
        if buffer.len() + data.len() > COMPUTER_REQUEST_MAX_BYTES {
            return Err(Error::Protocol);
        }
        self.buffered += data.len();
        buffer.extend_from_slice(&data);
        if !last {
            return Ok(Incoming::Part(request_id));
        }
        let buffer = self.parts.remove(&request_id).ok_or(Error::Protocol)?;
        self.buffered -= buffer.len();
        let message = decode(&buffer)?;
        match &message {
            WorkerToComputer::Request { request_id: id, .. } if *id == request_id => {
                Ok(Incoming::Message(message))
            }
            _ => Err(Error::Protocol),
        }
    }
}

fn decode(bytes: &[u8]) -> Result<WorkerToComputer> {
    if bytes.len() > COMPUTER_REQUEST_MAX_BYTES {
        return Err(Error::Protocol);
    }
    match decoder::decode(bytes) {
        Ok(WorkerToComputer::Request { request_id: 0, .. }) | Err(_) => Err(Error::Protocol),
        Ok(message) => Ok(message),
    }
}

pub(crate) fn valid_version(version: &str) -> bool {
    let mut bytes = version.bytes();
    version.len() <= 128
        && bytes
            .next()
            .is_some_and(|byte| byte.is_ascii_alphanumeric())
        && bytes.all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte))
}

#[cfg(test)]
#[path = "_tests_/wire_tests.rs"]
mod tests;

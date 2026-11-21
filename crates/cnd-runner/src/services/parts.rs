//! Byte-aware fragments of typed JSON with complete outer-header accounting.

use cnd_runner_interface::runner_handshake::{RUNNER_EVENT_MAX_BYTES, RunnerToWorkspace};
use cnd_runner_interface::services::transport::{RunnerServiceMessage, ServiceTextPart};

use crate::error::{Error, Result};
use crate::json::codec;
use crate::limits::json_point_bytes;

pub(super) enum Header {
    Report(String),
    Control(String),
    Logs(String),
}

impl Header {
    fn message(&self, part: ServiceTextPart) -> RunnerServiceMessage {
        match self {
            Self::Report(id) => RunnerServiceMessage::ReportPart {
                transfer_id: id.clone(),
                part,
            },
            Self::Control(id) => RunnerServiceMessage::ControlResultPart {
                request_id: id.clone(),
                part,
            },
            Self::Logs(id) => RunnerServiceMessage::LogsPart {
                request_id: id.clone(),
                part,
            },
        }
    }
}

pub(super) struct Parts {
    header: Header,
    source: String,
    offset: usize,
    number: u64,
}

impl Parts {
    pub(super) fn new(header: Header, source: String) -> Self {
        Self {
            header,
            source,
            offset: 0,
            number: 0,
        }
    }

    pub(super) fn next(&mut self) -> Result<Option<RunnerServiceMessage>> {
        if self.offset == self.source.len() {
            return Ok(None);
        }
        self.number = self
            .number
            .checked_add(1)
            .filter(|n| *n <= codec::MAX_SAFE_INTEGER)
            .ok_or(Error::InvalidNumber)?;
        let mut part = ServiceTextPart {
            part_number: self.number,
            final_part: false,
            text: String::new(),
        };
        let overhead = codec::encode(&RunnerToWorkspace::RunnerServiceMessage(
            self.header.message(part.clone()),
        ))?
        .len();
        let budget = (RUNNER_EVENT_MAX_BYTES as usize).saturating_sub(overhead);
        let mut bytes = 0;
        let mut end = self.offset;
        for point in self.source[self.offset..].chars() {
            let next = json_point_bytes(point);
            if bytes + next > budget {
                break;
            }
            bytes += next;
            end += point.len_utf8();
        }
        if end == self.offset {
            return Err(Error::internal_message(
                "service header exceeds the runner envelope budget",
            ));
        }
        part.text = self.source[self.offset..end].into();
        self.offset = end;
        part.final_part = end == self.source.len();
        let message = self.header.message(part);
        if codec::encode(&RunnerToWorkspace::RunnerServiceMessage(message.clone()))?.len()
            > RUNNER_EVENT_MAX_BYTES as usize
        {
            return Err(Error::internal_message(
                "service part exceeds the runner envelope budget",
            ));
        }
        Ok(Some(message))
    }
}

//! Prepare complete tool updates before any source part enters the durable outbox.

use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::chat_events::{AgentChatEvent, TOOL_DETAIL_MAX_BYTES};
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_handshake::{RUNNER_EVENT_MAX_BYTES, RunnerEventEnvelope};
use cnd_runner_interface::runner_tool_detail::{RunnerToolDetailPart, RunnerToolDetailStart};

use crate::error::Result;
use crate::json::codec::{self, MAX_SAFE_INTEGER};
use crate::limits::{bound_event, json_point_bytes};

pub(super) fn prepare(
    event: RunnerEvent,
    complete: bool,
    stream_id: &str,
    now: i64,
) -> Result<Vec<RunnerEvent>> {
    if !complete {
        return Ok(vec![bound_event(event)?]);
    }
    let RunnerEvent::AgentChatEvent(AgentChatEvent::ToolUpdated {
        turn_event_context,
        mut tool,
    }) = event
    else {
        return Ok(vec![bound_event(event)?]);
    };
    if tool.detail.as_ref().is_none_or(|detail| {
        2 + detail.chars().map(json_point_bytes).sum::<usize>() <= TOOL_DETAIL_MAX_BYTES as usize
    }) {
        return Ok(vec![bound_event(RunnerEvent::AgentChatEvent(
            AgentChatEvent::ToolUpdated {
                turn_event_context,
                tool,
            },
        ))?]);
    }
    let source = tool.detail.take().unwrap_or_default();
    let mut first = Some(RunnerToolDetailStart {
        turn_event_context,
        tool,
    });
    let mut result = Vec::new();
    let mut remaining = source.as_str();
    while !remaining.is_empty() {
        let mut part = RunnerToolDetailPart::ToolDetailPart {
            start: first.take(),
            detail: String::new(),
            part_number: MAX_SAFE_INTEGER,
            final_part: false,
        };
        let overhead = codec::encode(&RunnerEventEnvelope::Event {
            stream_id: stream_id.into(),
            event_number: MAX_SAFE_INTEGER,
            occurred_at: Timestamp(now),
            event: RunnerEvent::RunnerToolDetailPart(part.clone()),
        })?
        .len();
        let budget = (RUNNER_EVENT_MAX_BYTES as usize).saturating_sub(overhead);
        let mut bytes = 0;
        let mut end = 0;
        for point in remaining.chars() {
            let next = json_point_bytes(point);
            if bytes + next > budget {
                break;
            }
            bytes += next;
            end += point.len_utf8();
        }
        let RunnerToolDetailPart::ToolDetailPart {
            detail,
            part_number,
            final_part,
            ..
        } = &mut part;
        if overhead > RUNNER_EVENT_MAX_BYTES as usize || (end == 0 && !result.is_empty()) {
            *detail = source.clone();
            *part_number = 1;
            *final_part = true;
            return Ok(vec![RunnerEvent::RunnerToolDetailPart(part)]);
        }
        *detail = remaining[..end].into();
        *part_number = result.len() as u64 + 1;
        remaining = &remaining[end..];
        *final_part = remaining.is_empty();
        result.push(RunnerEvent::RunnerToolDetailPart(part));
    }
    Ok(result)
}

#[cfg(test)]
#[path = "_tests_/tool_detail_tests.rs"]
mod tool_detail_tests;

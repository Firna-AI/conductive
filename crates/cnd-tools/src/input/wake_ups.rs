//! Convert ISO 8601 time with an offset into the Worker's wire time.

use serde_json::{Map, Value};
use time::OffsetDateTime;
use time::format_description::well_known::{Iso8601, Rfc3339};

use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::tools::wake_ups::AgentScheduleWakeUpRequest;

use crate::error::{Error, InputError, Result};

use super::parse::text;

const MAX_SAFE_MS: i128 = 9_007_199_254_740_991;

pub(super) fn parse(fields: &Map<String, Value>) -> Result<AgentScheduleWakeUpRequest> {
    let text = text(fields, "text")?;
    match (fields.get("delaySeconds"), fields.get("at")) {
        (Some(delay), None) => {
            let delay_seconds = delay
                .as_f64()
                .filter(|seconds| seconds.is_finite())
                .ok_or(Error::Input(InputError::WakeUpTime))?;
            Ok(AgentScheduleWakeUpRequest::Delay {
                text,
                delay_seconds,
            })
        }
        (None, Some(at)) => {
            let at = at
                .as_str()
                .and_then(|value| {
                    OffsetDateTime::parse(value, &Iso8601::PARSING)
                        .or_else(|_| OffsetDateTime::parse(value, &Rfc3339))
                        .ok()
                })
                .ok_or(Error::Input(InputError::WakeUpTime))?;
            let millis = at.unix_timestamp_nanos().div_euclid(1_000_000);
            if millis.abs() > MAX_SAFE_MS {
                return Err(Error::Input(InputError::WakeUpTime));
            }
            Ok(AgentScheduleWakeUpRequest::Absolute {
                text,
                at: Timestamp(millis as i64),
            })
        }
        _ => Err(Error::Input(InputError::WakeUpTime)),
    }
}

#[cfg(test)]
#[path = "../_tests_/wake_up_input_tests.rs"]
mod tests;

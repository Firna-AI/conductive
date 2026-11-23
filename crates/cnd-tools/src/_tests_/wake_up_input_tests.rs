//! Time conversion and required-offset failures at the tool boundary.

use serde_json::json;

use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::tools::wake_ups::AgentScheduleWakeUpRequest;

use crate::error::{Error, InputError, Result};

use super::parse;

#[test]
fn a_wake_up_needs_one_time_and_an_explicit_offset_when_absolute() -> Result<()> {
    for fields in [
        json!({"text":"Check later"}),
        json!({"text":"Check later", "at":"2026-11-23T09:00:00Z", "delaySeconds":60}),
        json!({"text":"Check later", "at":"2026-11-23T09:00:00"}),
    ] {
        assert!(
            matches!(
                parse(fields.as_object().ok_or(Error::Input(InputError::Object))?),
                Err(Error::Input(InputError::WakeUpTime))
            ),
            "{fields}"
        );
    }
    Ok(())
}

#[test]
fn preserves_minutes_precision_and_times_before_the_epoch() -> Result<()> {
    for (at, millis) in [
        ("1970-01-01T01:02+01:00", 120_000),
        ("1970-01-01T00:59:59.125+01:00", -875),
    ] {
        let fields = json!({"text": "Check later", "at": at});
        assert_eq!(
            parse(fields.as_object().ok_or(Error::Input(InputError::Object))?)?,
            AgentScheduleWakeUpRequest::Absolute {
                text: "Check later".into(),
                at: Timestamp(millis),
            },
        );
    }
    Ok(())
}

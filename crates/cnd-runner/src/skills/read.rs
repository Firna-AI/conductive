//! Public failures of a skill read never include private paths or diagnostics.

use cnd_runner_interface::runner_skills::{RunnerSkillError, SkillReadOutcome};
use cnd_runner_interface::wire::WireFalse;

/// The latest list or current copy has no skill to read.
pub(crate) fn not_found() -> SkillReadOutcome {
    SkillReadOutcome::Failure {
        ok: WireFalse,
        error: RunnerSkillError::NotFound {
            message: "The skill was not found.".into(),
        },
    }
}

/// The runner cannot complete the read.
pub(crate) fn unavailable() -> SkillReadOutcome {
    SkillReadOutcome::Failure {
        ok: WireFalse,
        error: RunnerSkillError::Unavailable {
            message: "The skill could not be read.".into(),
        },
    }
}

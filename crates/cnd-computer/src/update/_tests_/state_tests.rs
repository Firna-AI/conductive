//! Persistent state transitions for activation, confirmation, and rollback.

use super::{Start, UpdateState};

#[test]
fn pending_release_gets_five_unconfirmed_starts_then_rolls_back() {
    let mut state = UpdateState::default();
    state.stage("0.0.41", "0.0.42");
    assert_eq!(state.previous.as_deref(), Some("0.0.41"));
    assert_eq!(state.pending.as_deref(), Some("0.0.42"));
    assert_eq!(state.starts, 0);
    for count in 1..=5 {
        assert!(matches!(state.register_start("0.0.42"), Start::Counted));
        assert_eq!(state.starts, count);
    }
    assert!(matches!(state.register_start("0.0.42"), Start::RollBack));
    assert!(matches!(
        state.register_start("0.0.41"),
        Start::FinishRollback(version) if version == "0.0.42"
    ));
    state.refuse("0.0.42");
    assert!(state.refused.contains("0.0.42"));
    assert_eq!(state.pending, None);
    assert_eq!(state.starts, 0);
    assert!(matches!(state.register_start("0.0.41"), Start::Unchanged));
}

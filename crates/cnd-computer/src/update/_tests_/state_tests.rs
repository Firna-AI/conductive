//! A trial preserves the preceding confirmed release until it is promoted.

use super::UpdateState;

#[test]
fn staging_retains_the_previous_release_until_the_trial_confirms() {
    let mut state = UpdateState {
        previous: Some("0.0.40".into()),
        ..UpdateState::default()
    };
    state.stage("0.0.41", "0.0.42");
    assert_eq!(state.retained("0.0.41"), ["0.0.41", "0.0.40", "0.0.42"]);
    assert!(!state.confirm("0.0.41"));
    assert!(state.confirm("0.0.42"));
    assert_eq!(state.retained("0.0.42"), ["0.0.42", "0.0.41"]);
}

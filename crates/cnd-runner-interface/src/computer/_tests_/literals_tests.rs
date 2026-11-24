//! Exact values on the computer wire.

use serde_json::error::Category;

use crate::computer::messages::{ComputerToWorker, WorkerToComputer};

use super::{ComputerPath, ComputerProtocolVersion};

#[test]
fn welcome_accepts_only_version_one() -> Result<(), serde_json::Error> {
    assert_eq!(serde_json::to_string(&ComputerProtocolVersion)?, "1");
    assert_eq!(
        serde_json::from_str::<ComputerProtocolVersion>("1")?,
        ComputerProtocolVersion
    );
    for version in ["0", "2", "256", "-1", "1.5", "null", "\"1\""] {
        assert_eq!(
            serde_json::from_str::<ComputerProtocolVersion>(version)
                .err()
                .map(|error| error.classify()),
            Some(Category::Data),
            "{version}"
        );
    }
    Ok(())
}

#[test]
fn route_accepts_only_the_computer_path() -> Result<(), serde_json::Error> {
    assert_eq!(serde_json::to_string(&ComputerPath)?, r#""/v1/computer""#);
    assert_eq!(
        serde_json::from_str::<ComputerPath>(r#""/v1/computer""#)?,
        ComputerPath
    );
    for json in [r#""/v1/host""#, r#""/v1/computer/""#, r#""""#, "1", "null"] {
        assert_eq!(
            serde_json::from_str::<ComputerPath>(json)
                .err()
                .map(|error| error.classify()),
            Some(Category::Data),
            "{json}"
        );
    }
    Ok(())
}

#[test]
fn ping_and_pong_match_the_hibernation_auto_response() -> Result<(), serde_json::Error> {
    assert_eq!(
        serde_json::to_string(&ComputerToWorker::Ping)?,
        r#"{"type":"ping"}"#
    );
    assert_eq!(
        serde_json::to_string(&WorkerToComputer::Pong)?,
        r#"{"type":"pong"}"#
    );
    Ok(())
}

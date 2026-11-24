//! Exact route, welcome, and port literals through serde.

use serde_json::error::Category;

use crate::host::messages::{HostToWorker, WorkerToHost};

use super::{HostPath, HostProtocolVersion, HostStreamPort};

#[test]
fn welcome_accepts_only_version_one() -> Result<(), serde_json::Error> {
    assert_eq!(serde_json::to_string(&HostProtocolVersion)?, "1");
    let welcome =
        serde_json::from_str::<WorkerToHost>(r#"{"type":"welcome","hostProtocolVersion":1}"#)?;
    assert_eq!(
        welcome,
        WorkerToHost::Welcome {
            host_protocol_version: HostProtocolVersion
        }
    );
    for version in ["0", "2", "255", "256", "-1", "1.5", "null", "\"1\""] {
        let json = format!(r#"{{"type":"welcome","hostProtocolVersion":{version}}}"#);
        assert_eq!(
            serde_json::from_str::<WorkerToHost>(&json)
                .err()
                .map(|error| error.classify()),
            Some(Category::Data),
            "{json}"
        );
    }
    Ok(())
}

#[test]
fn route_accepts_only_the_host_path() -> Result<(), serde_json::Error> {
    assert_eq!(serde_json::to_string(&HostPath)?, r#""/v1/host""#);
    assert_eq!(serde_json::from_str::<HostPath>(r#""/v1/host""#)?, HostPath);
    for json in [r#""/v1/runner""#, r#""/v1/host/""#, r#""""#, "1", "null"] {
        assert_eq!(
            serde_json::from_str::<HostPath>(json)
                .err()
                .map(|error| error.classify()),
            Some(Category::Data),
            "{json}"
        );
    }
    Ok(())
}

#[test]
fn stream_ports_reject_every_port_except_terminal_and_relay() -> Result<(), serde_json::Error> {
    assert_eq!(serde_json::to_string(&HostStreamPort::Terminal)?, "7681");
    assert_eq!(
        serde_json::to_string(&HostStreamPort::PreviewRelay)?,
        "7682"
    );
    assert_eq!(
        serde_json::from_str::<HostStreamPort>("7681")?,
        HostStreamPort::Terminal
    );
    assert_eq!(
        serde_json::from_str::<HostStreamPort>("7682")?,
        HostStreamPort::PreviewRelay
    );
    for port in (0..=u16::MAX).filter(|port| !matches!(port, 7681 | 7682)) {
        assert_eq!(
            serde_json::from_str::<HostStreamPort>(&port.to_string())
                .err()
                .map(|error| error.classify()),
            Some(Category::Data),
            "port {port}"
        );
    }
    for json in ["65536", "-1", "7681.5", "null", "\"7681\""] {
        assert_eq!(
            serde_json::from_str::<HostStreamPort>(json)
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
        serde_json::to_string(&HostToWorker::Ping)?,
        r#"{"type":"ping"}"#
    );
    assert_eq!(
        serde_json::to_string(&WorkerToHost::Pong)?,
        r#"{"type":"pong"}"#
    );
    Ok(())
}

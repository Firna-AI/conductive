//! Exact welcome version, route, and permitted local stream ports.

use serde::{Deserialize, Deserializer, Serialize, Serializer, de::Error};
use ts_rs::TS;

use super::limits::{HOST_PATH, HOST_PROTOCOL_VERSION};

/// Only version 1 is valid in a welcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq, TS)]
#[ts(type = "1")]
pub struct HostProtocolVersion;

impl Serialize for HostProtocolVersion {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_u8(HOST_PROTOCOL_VERSION)
    }
}

impl<'de> Deserialize<'de> for HostProtocolVersion {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        if u8::deserialize(deserializer)? == HOST_PROTOCOL_VERSION {
            Ok(Self)
        } else {
            Err(D::Error::custom("unsupported host protocol version"))
        }
    }
}

/// The only route that accepts a machine host connection.
#[derive(Debug, Clone, Copy, PartialEq, Eq, TS)]
#[ts(type = "\"/v1/host\"")]
pub struct HostPath;

impl Serialize for HostPath {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(HOST_PATH)
    }
}

impl<'de> Deserialize<'de> for HostPath {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        if String::deserialize(deserializer)? == HOST_PATH {
            Ok(Self)
        } else {
            Err(D::Error::custom("expected the host connection path"))
        }
    }
}

/// Only the terminal and preview relay can receive a host stream.
#[derive(Debug, Clone, Copy, PartialEq, Eq, TS)]
#[ts(type = "7681 | 7682")]
pub enum HostStreamPort {
    /// Terminal service loopback port.
    Terminal,
    /// Preview relay loopback port.
    PreviewRelay,
}

impl From<HostStreamPort> for u16 {
    fn from(port: HostStreamPort) -> Self {
        match port {
            HostStreamPort::Terminal => 7681,
            HostStreamPort::PreviewRelay => 7682,
        }
    }
}

impl Serialize for HostStreamPort {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_u16(u16::from(*self))
    }
}

impl<'de> Deserialize<'de> for HostStreamPort {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        match u16::deserialize(deserializer)? {
            7681 => Ok(Self::Terminal),
            7682 => Ok(Self::PreviewRelay),
            _ => Err(D::Error::custom("unsupported host stream port")),
        }
    }
}

#[cfg(test)]
#[path = "_tests_/literals_tests.rs"]
mod literals_tests;

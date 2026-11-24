//! Exact computer welcome version and route.

use serde::{Deserialize, Deserializer, Serialize, Serializer, de::Error};
use ts_rs::TS;

use super::limits::{COMPUTER_PATH, COMPUTER_PROTOCOL_VERSION};

/// Only version 1 is valid in a welcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq, TS)]
#[ts(type = "1")]
pub struct ComputerProtocolVersion;

impl Serialize for ComputerProtocolVersion {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_u8(COMPUTER_PROTOCOL_VERSION)
    }
}

impl<'de> Deserialize<'de> for ComputerProtocolVersion {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        if u8::deserialize(deserializer)? == COMPUTER_PROTOCOL_VERSION {
            Ok(Self)
        } else {
            Err(D::Error::custom("unsupported computer protocol version"))
        }
    }
}

/// The only route that accepts a computer code or token.
#[derive(Debug, Clone, Copy, PartialEq, Eq, TS)]
#[ts(type = "\"/v1/computer\"")]
pub struct ComputerPath;

impl Serialize for ComputerPath {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(COMPUTER_PATH)
    }
}

impl<'de> Deserialize<'de> for ComputerPath {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        if String::deserialize(deserializer)? == COMPUTER_PATH {
            Ok(Self)
        } else {
            Err(D::Error::custom("expected the computer connection path"))
        }
    }
}

#[cfg(test)]
#[path = "_tests_/literals_tests.rs"]
mod literals_tests;

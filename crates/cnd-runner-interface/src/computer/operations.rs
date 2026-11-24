//! Fixed operations on containers and images of one own computer.

use std::fmt;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::wire::ReadonlyVec;

/// A signed release identified by its version and digest.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
pub struct ComputerRelease {
    /// Release version.
    pub version: String,
    /// Release digest as 64 lowercase hexadecimal characters.
    pub digest: String,
}

/// The image from which to create a container.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ContainerImage {
    /// Signed container base image of a release.
    Base {
        /// Release that published the image.
        release: ComputerRelease,
    },
    /// An org image on this computer.
    Org {
        /// Local image name.
        name: String,
    },
}

/// An environment variable for a container.
/// Debug output redacts the value because it can hold a token or secret.
#[derive(Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
pub struct ContainerEnvVar {
    /// Nonempty environment variable name without `=` or NUL.
    pub name: String,
    /// Value without a NUL byte.
    pub value: String,
}

impl fmt::Debug for ContainerEnvVar {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ContainerEnvVar")
            .field("name", &self.name)
            .field("value", &"<redacted>")
            .finish()
    }
}

/// Container and image operations that the computer connection accepts.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all_fields = "camelCase")]
pub enum ComputerOperation {
    /// Create a container from an image.
    #[serde(rename = "container.create")]
    ContainerCreate {
        /// Container name on this computer.
        container: String,
        /// Image from which to create the container.
        image: ContainerImage,
        /// Environment variables for the new container.
        #[ts(as = "ReadonlyVec<ContainerEnvVar>")]
        env: Vec<ContainerEnvVar>,
        /// Virtual CPUs for the container.
        cpus: u32,
        /// Memory limit in bytes within the JavaScript safe integer range.
        #[ts(type = "number")]
        memory_bytes: u64,
    },
    /// Read the state of a container.
    #[serde(rename = "container.get")]
    ContainerGet {
        /// Container name to look up.
        container: String,
    },
    /// Start a container with the supplied environment.
    #[serde(rename = "container.start")]
    ContainerStart {
        /// Container name to start.
        container: String,
        /// Environment variables for this start.
        #[ts(as = "ReadonlyVec<ContainerEnvVar>")]
        env: Vec<ContainerEnvVar>,
    },
    /// Stop a container and keep its disk.
    #[serde(rename = "container.stop")]
    ContainerStop {
        /// Container name to stop.
        container: String,
    },
    /// Delete a container.
    #[serde(rename = "container.delete")]
    ContainerDelete {
        /// Container name to delete.
        container: String,
    },
    /// Save the contents of a container as an org image.
    #[serde(rename = "image.save")]
    ImageSave {
        /// Source container name.
        container: String,
        /// Name of the new local image.
        image: String,
    },
    /// Install a signed release in a container and start its host program.
    #[serde(rename = "container.bootstrap")]
    ContainerBootstrap {
        /// Container name to bootstrap.
        container: String,
        /// Release to verify and install.
        release: ComputerRelease,
    },
}

#[cfg(test)]
#[path = "_tests_/operations_tests.rs"]
mod operations_tests;

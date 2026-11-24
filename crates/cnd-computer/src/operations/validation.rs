//! Validate fixed request shapes after typed wire decoding.

use cnd_runner_interface::computer::operations::{
    ComputerOperation, ComputerRelease, ContainerImage,
};

use crate::wire::valid_version;

use super::environment::valid_environment;
use super::names::valid_name;

pub(super) fn container_name(operation: &ComputerOperation) -> &str {
    match operation {
        ComputerOperation::ContainerCreate { container, .. }
        | ComputerOperation::ContainerGet { container }
        | ComputerOperation::ContainerStart { container, .. }
        | ComputerOperation::ContainerStop { container }
        | ComputerOperation::ContainerDelete { container }
        | ComputerOperation::ImageSave { container, .. }
        | ComputerOperation::ContainerBootstrap { container, .. } => container,
    }
}

pub(super) fn validate(name: &str, operation: &ComputerOperation) -> bool {
    const MAX_SAFE_INTEGER: u64 = (1 << 53) - 1;
    if !valid_name(name) {
        return false;
    }
    match operation {
        ComputerOperation::ContainerCreate {
            image,
            env,
            cpus,
            memory_bytes,
            ..
        } => {
            let image = match image {
                ContainerImage::Base { release } => valid_release(release),
                ContainerImage::Org { name } => valid_name(name),
            };
            image
                && *cpus > 0
                && (1..=MAX_SAFE_INTEGER).contains(memory_bytes)
                && valid_environment(env)
        }
        ComputerOperation::ContainerStart { env, .. } => valid_environment(env),
        ComputerOperation::ImageSave { image, .. } => valid_name(image),
        ComputerOperation::ContainerBootstrap { release, .. } => valid_release(release),
        _ => true,
    }
}

fn valid_release(release: &ComputerRelease) -> bool {
    valid_version(&release.version)
        && release.digest.len() == 64
        && release
            .digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

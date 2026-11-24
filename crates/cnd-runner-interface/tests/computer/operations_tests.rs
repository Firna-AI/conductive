//! Each fixed operation and both container image variants.

use cnd_runner_interface::computer::operations::ComputerOperation;

computer_wire!(
    container_create_base,
    ComputerOperation,
    r#"{"kind":"container.create","container":"workspace-1","image":{"kind":"base","release":{"version":"0.0.42","digest":"abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"}},"env":[{"name":"LANG","value":"en_US.UTF-8"}],"cpus":4,"memoryBytes":8589934592}"#
);
computer_wire!(
    container_create_org,
    ComputerOperation,
    r#"{"kind":"container.create","container":"workspace-2","image":{"kind":"org","name":"acme-image"},"env":[],"cpus":4,"memoryBytes":8589934592}"#
);
computer_wire!(
    container_get,
    ComputerOperation,
    r#"{"kind":"container.get","container":"workspace-1"}"#
);
computer_wire!(
    container_start,
    ComputerOperation,
    r#"{"kind":"container.start","container":"workspace-1","env":[{"name":"LANG","value":"C"}]}"#
);
computer_wire!(
    container_stop,
    ComputerOperation,
    r#"{"kind":"container.stop","container":"workspace-1"}"#
);
computer_wire!(
    container_delete,
    ComputerOperation,
    r#"{"kind":"container.delete","container":"workspace-1"}"#
);
computer_wire!(
    image_save,
    ComputerOperation,
    r#"{"kind":"image.save","container":"workspace-1","image":"acme-image"}"#
);
computer_wire!(
    container_bootstrap,
    ComputerOperation,
    r#"{"kind":"container.bootstrap","container":"workspace-1","release":{"version":"0.0.42","digest":"abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"}}"#
);

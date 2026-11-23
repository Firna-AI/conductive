//! Typed command identities used by the session registry.

use cnd_runner_interface::runner_commands::{
    RunnerChangeModel, RunnerCommand, RunnerControlCommand, RunnerInterrupt,
    RunnerMessageDuringTurn, RunnerNotice, RunnerTurn,
};

pub(super) fn route(command: &RunnerCommand) -> Option<(&str, &str, Option<&str>)> {
    match command {
        RunnerCommand::RunnerTurn(RunnerTurn::Turn {
            command_id,
            session_id,
            turn_id,
            ..
        }) => Some((command_id, session_id, Some(turn_id))),
        RunnerCommand::RunnerMessageDuringTurn(RunnerMessageDuringTurn::Message {
            command_id,
            session_id,
            ..
        }) => Some((command_id, session_id, None)),
        RunnerCommand::RunnerNotice(RunnerNotice::Notice {
            command_id,
            session_id,
            ..
        }) => Some((command_id, session_id, None)),
        RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerInterrupt(
            RunnerInterrupt::Interrupt {
                command_id,
                session_id,
                turn_id,
            },
        )) => Some((command_id, session_id, Some(turn_id))),
        RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerChangeModel(
            RunnerChangeModel::Model {
                command_id,
                session_id,
                ..
            },
        )) => Some((command_id, session_id, None)),
        _ => None,
    }
}

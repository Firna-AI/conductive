//! One turn's background deadline survives helper handoffs.

use std::time::Duration;

/// Only a member can restart the limit of an existing wait.
#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum InputKind {
    Member,
    Notice,
}

#[derive(Default)]
pub(super) struct Background {
    live: bool,
    idle: bool,
    observed: bool,
    replied: bool,
    pub(super) waiting: bool,
    pub(super) deadline: Option<i64>,
}

#[derive(PartialEq, Debug)]
pub(super) enum Disposition {
    Finish,
    Wait,
    Limit,
}

impl Background {
    pub(super) fn work(&mut self, live: bool, idle: bool) -> bool {
        self.live = live;
        self.idle = idle;
        self.observed |= live;
        self.replied && idle && !live
    }
    pub(super) fn activity(&mut self, idle: bool) -> bool {
        self.idle = idle;
        if !idle {
            self.waiting = false;
            self.replied = false;
        }
        self.replied && idle && !self.live
    }
    pub(super) fn input(&mut self, kind: InputKind, received_at: i64, limit: Duration) {
        if kind == InputKind::Member && self.waiting && self.deadline.is_some() {
            self.deadline = Some(received_at.saturating_add(limit.as_millis() as i64));
        }
        self.waiting = false;
        self.replied = false;
        self.idle = false;
    }
    pub(super) fn reply(&mut self, now: i64, limit: Duration) -> Disposition {
        if self.deadline.is_some_and(|deadline| now >= deadline) {
            return Disposition::Limit;
        }
        self.replied = true;
        // Work that ended before this reply can still send a wake-up reply
        // before the fresh idle state. That wait keeps the limit too.
        if self.live || self.observed && !self.idle {
            self.waiting = true;
            self.deadline
                .get_or_insert(now.saturating_add(limit.as_millis() as i64));
            return Disposition::Wait;
        }
        Disposition::Finish
    }
    pub(super) fn restart(&mut self) {
        let deadline = self.deadline;
        *self = Self {
            deadline,
            ..Self::default()
        };
    }
}

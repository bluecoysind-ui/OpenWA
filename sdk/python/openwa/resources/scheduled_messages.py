"""Scheduled messages — one-shot and recurring delayed sends.

Backed by ``src/modules/scheduler/scheduler.controller.ts``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from .._http import quote_segment
from ..types import (
    CreateScheduledMessageRequest,
    ScheduledMessageRecord,
    UpdateScheduledMessageRequest,
)

if TYPE_CHECKING:
    from .._http import HttpExecutor


class ScheduledMessagesResource:
    def __init__(self, http: "HttpExecutor") -> None:
        self._http = http

    def list(self, session_id: str) -> list[ScheduledMessageRecord]:
        return self._http.request(
            "GET", f"/api/sessions/{quote_segment(session_id)}/scheduled-messages"
        )

    def create(self, session_id: str, body: CreateScheduledMessageRequest) -> ScheduledMessageRecord:
        return self._http.request(
            "POST", f"/api/sessions/{quote_segment(session_id)}/scheduled-messages", body=body
        )

    def get(self, session_id: str, job_id: str) -> ScheduledMessageRecord:
        return self._http.request(
            "GET",
            f"/api/sessions/{quote_segment(session_id)}/scheduled-messages/{quote_segment(job_id)}",
        )

    def update(
        self, session_id: str, job_id: str, body: UpdateScheduledMessageRequest
    ) -> ScheduledMessageRecord:
        return self._http.request(
            "PATCH",
            f"/api/sessions/{quote_segment(session_id)}/scheduled-messages/{quote_segment(job_id)}",
            body=body,
        )

    def delete(self, session_id: str, job_id: str) -> Optional[ScheduledMessageRecord]:
        return self._http.request(
            "DELETE",
            f"/api/sessions/{quote_segment(session_id)}/scheduled-messages/{quote_segment(job_id)}",
        )

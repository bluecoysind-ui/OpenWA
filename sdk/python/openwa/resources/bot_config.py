"""Per-session bot config — access lists, prefix, commands, autoRead, welcome.

Backed by ``src/modules/bot/bot-config.controller.ts``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Mapping

from .._http import quote_segment

if TYPE_CHECKING:
    from .._http import HttpExecutor


class BotConfigResource:
    def __init__(self, http: "HttpExecutor") -> None:
        self._http = http

    def get(self, session_id: str) -> dict[str, Any]:
        return self._http.request("GET", f"/api/sessions/{quote_segment(session_id)}/bot-config")

    def update(self, session_id: str, body: Mapping[str, Any]) -> dict[str, Any]:
        return self._http.request(
            "PUT", f"/api/sessions/{quote_segment(session_id)}/bot-config", body=body
        )

"""Error types for server request handling."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ApiError(Exception):
    """Structured API error with HTTP status and stable code."""

    code: str
    message: str
    status_code: int = 400

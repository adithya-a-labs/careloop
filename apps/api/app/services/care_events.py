"""Compatibility import for the concrete care coordination service."""

from app.services.care_coordination import CareCoordinationService

CareEventService = CareCoordinationService

__all__ = ["CareEventService"]

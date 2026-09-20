"""Deterministic CareLoop demo data for the configured Supabase project.

This module is intentionally server-side. It uses the backend Supabase secret
key, verifies the synthetic demo identities before destructive reset work, and
scopes every cleanup query to the single known demo Care Circle.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]


class DemoSettings(BaseSettings):
    supabase_url: str = ""
    supabase_secret_key: str = ""
    model_config = SettingsConfigDict(extra="ignore")


IST = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")

DEMO_CIRCLE_ID = "20000000-0000-0000-0000-000000000001"
DEMO_AMMA_ID = "10000000-0000-0000-0000-000000000001"
DEMO_MAYA_ID = "10000000-0000-0000-0000-000000000002"
DEMO_RAHUL_ID = "10000000-0000-0000-0000-000000000003"
DEMO_ANU_ID = "10000000-0000-0000-0000-000000000004"

DEMO_PROFILE_IDS = (
    DEMO_AMMA_ID,
    DEMO_MAYA_ID,
    DEMO_RAHUL_ID,
    DEMO_ANU_ID,
)

PRESCRIPTION_TASK_ID = "40000000-0000-0000-0000-000000000001"
EVENING_CHECK_TASK_ID = "40000000-0000-0000-0000-000000000002"
RAHUL_AVAILABILITY_ID = "70000000-0000-0000-0000-000000000001"
ANU_VISIT_TASK_ID = "40000000-0000-0000-0000-000000000006"

RESET_DELETE_ORDER = (
    "handoffs",
    "tasks",
    "scheduled_items",
    "memories",
    "availability",
    "care_events",
)


class DemoDataError(RuntimeError):
    """Raised when the demo project guard or a Supabase operation fails."""


@dataclass(frozen=True)
class DemoDataset:
    profiles: list[dict[str, Any]]
    circle: dict[str, Any]
    members: list[dict[str, Any]]
    care_events: list[dict[str, Any]]
    tasks: list[dict[str, Any]]
    availability: list[dict[str, Any]]
    scheduled_items: list[dict[str, Any]]
    memories: list[dict[str, Any]]


def _iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def _at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=IST)


def _event(
    index: int,
    *,
    occurred_at: datetime,
    reported_by: str,
    event_type: str,
    event_data: dict[str, Any],
    source: str,
    transcript: str,
    confidence: float | None = None,
) -> dict[str, Any]:
    return {
        "id": f"30000000-0000-0000-0000-{index:012d}",
        "circle_id": DEMO_CIRCLE_ID,
        "subject_id": DEMO_AMMA_ID,
        "reported_by": reported_by,
        "event_type": event_type,
        "event_data": event_data,
        "source": source,
        "raw_transcript": transcript,
        "confidence": confidence,
        "occurred_at": _iso(occurred_at),
        "created_at": _iso(occurred_at + timedelta(minutes=3)),
    }


def build_demo_dataset(now: datetime | None = None) -> DemoDataset:
    """Build the known-good demo state relative to a supplied/current time."""

    current = now or datetime.now(UTC)
    if current.tzinfo is None:
        raise ValueError("now must include a timezone")
    local_now = current.astimezone(IST)
    today = local_now.date()

    # Keep the full four-event opening story historical even for morning resets.
    story_day = today if local_now >= _at(today, 13, 15) else today - timedelta(days=1)
    previous_day = story_day - timedelta(days=1)
    two_days_ago = story_day - timedelta(days=2)
    three_days_ago = story_day - timedelta(days=3)
    four_days_ago = story_day - timedelta(days=4)
    five_days_ago = story_day - timedelta(days=5)
    six_days_ago = story_day - timedelta(days=6)
    seven_days_ago = story_day - timedelta(days=7)
    eight_days_ago = story_day - timedelta(days=8)
    nine_days_ago = story_day - timedelta(days=9)

    # All schedule cards are guaranteed to be in the future. If a reset happens
    # after the first visit window, the whole daily sequence rolls to tomorrow.
    schedule_day = (
        today if local_now < _at(today, 14, 45) else today + timedelta(days=1)
    )
    tomorrow = today + timedelta(days=1)

    profiles = [
        {
            "id": DEMO_AMMA_ID,
            "display_name": "Amma",
            "age_range": "65+",
            "preferred_language": "ml",
            "preferences": {"demo": True, "memory_box_access": True},
        },
        {
            "id": DEMO_MAYA_ID,
            "display_name": "Maya",
            "age_range": "18-64",
            "preferred_language": "en",
            "preferences": {"demo": True, "memory_box_access": True},
        },
        {
            "id": DEMO_RAHUL_ID,
            "display_name": "Rahul",
            "age_range": "18-64",
            "preferred_language": "en",
            "preferences": {"demo": True, "memory_box_access": True},
        },
        {
            "id": DEMO_ANU_ID,
            "display_name": "Anu",
            "age_range": "18-64",
            "preferred_language": "ml",
            "preferences": {"demo": True, "memory_box_access": False},
        },
    ]

    circle = {
        "id": DEMO_CIRCLE_ID,
        "name": "Amma's Care Circle",
        "created_by": DEMO_MAYA_ID,
        "invite_code": "AMMA-DEMO",
    }

    joined = _iso(_at(today - timedelta(days=90), 9))
    members = [
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_AMMA_ID,
            "role": "patient",
            "relationship": "patient",
            "is_active": True,
            "joined_at": joined,
        },
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_MAYA_ID,
            "role": "family",
            "relationship": "daughter and coordinator",
            "is_active": True,
            "joined_at": joined,
        },
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_RAHUL_ID,
            "role": "family",
            "relationship": "son",
            "is_active": True,
            "joined_at": joined,
        },
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_ANU_ID,
            "role": "caregiver",
            "relationship": "professional home caregiver",
            "is_active": True,
            "joined_at": _iso(_at(today - timedelta(days=45), 9)),
        },
    ]

    care_events = [
        _event(
            1,
            occurred_at=_at(story_day, 7, 45),
            reported_by=DEMO_AMMA_ID,
            event_type="sleep",
            event_data={
                "quality": "okay",
                "duration_hours": 6,
                "note": "slightly restless",
            },
            source="voice",
            transcript="I slept for about six hours and felt a little restless, but I am okay.",
            confidence=0.96,
        ),
        _event(
            2,
            occurred_at=_at(story_day, 8, 30),
            reported_by=DEMO_AMMA_ID,
            event_type="meal",
            event_data={"meal": "breakfast", "intake": "normal", "appetite": "normal"},
            source="voice",
            transcript="I ate breakfast normally and my appetite was fine.",
            confidence=0.98,
        ),
        _event(
            3,
            occurred_at=_at(story_day, 10, 20),
            reported_by=DEMO_MAYA_ID,
            event_type="check_in",
            event_data={"method": "phone", "status": "stable"},
            source="manual",
            transcript="I called Amma this morning and she sounded fine.",
        ),
        _event(
            4,
            occurred_at=_at(story_day, 12, 45),
            reported_by=DEMO_AMMA_ID,
            event_type="meal",
            event_data={"meal": "lunch", "intake": "slightly low"},
            source="voice",
            transcript="I ate lunch, though a little less than usual.",
            confidence=0.97,
        ),
        _event(
            5,
            occurred_at=_at(previous_day, 15, 30),
            reported_by=DEMO_ANU_ID,
            event_type="visit",
            event_data={"visit_type": "professional home visit", "status": "completed"},
            source="manual",
            transcript="Routine home visit completed. Amma was comfortable and there was no urgent issue.",
        ),
        _event(
            6,
            occurred_at=_at(previous_day, 20),
            reported_by=DEMO_MAYA_ID,
            event_type="medication",
            event_data={"routine": "evening check", "status": "completed"},
            source="manual",
            transcript="The usual evening medicine check was completed.",
        ),
        _event(
            7,
            occurred_at=_at(two_days_ago, 15),
            reported_by=DEMO_AMMA_ID,
            event_type="check_in",
            event_data={"energy": "a little tired", "follow_up": "rested"},
            source="voice",
            transcript="I felt a little tired in the afternoon, so I rested for a while.",
            confidence=0.95,
        ),
        _event(
            8,
            occurred_at=_at(two_days_ago, 17),
            reported_by=DEMO_RAHUL_ID,
            event_type="activity",
            event_data={"activity": "short walk", "intensity": "light"},
            source="manual",
            transcript="Amma and I took a short, easy walk together.",
        ),
        _event(
            9,
            occurred_at=_at(three_days_ago, 19, 30),
            reported_by=DEMO_AMMA_ID,
            event_type="meal",
            event_data={"meal": "dinner", "intake": "normal"},
            source="voice",
            transcript="Dinner was normal and I ate well.",
            confidence=0.98,
        ),
        _event(
            10,
            occurred_at=_at(three_days_ago, 22),
            reported_by=DEMO_AMMA_ID,
            event_type="sleep",
            event_data={"quality": "good"},
            source="voice",
            transcript="I slept well that night.",
            confidence=0.98,
        ),
        _event(
            11,
            occurred_at=_at(four_days_ago, 8, 20),
            reported_by=DEMO_AMMA_ID,
            event_type="meal",
            event_data={"meal": "breakfast", "intake": "normal"},
            source="voice",
            transcript="Breakfast was normal and I ate comfortably.",
            confidence=0.98,
        ),
        _event(
            12,
            occurred_at=_at(four_days_ago, 14, 15),
            reported_by=DEMO_AMMA_ID,
            event_type="rest",
            event_data={"activity": "afternoon rest", "status": "completed"},
            source="voice",
            transcript="I rested for a little while in the afternoon.",
            confidence=0.96,
        ),
        _event(
            13,
            occurred_at=_at(five_days_ago, 19, 20),
            reported_by=DEMO_MAYA_ID,
            event_type="meal",
            event_data={"meal": "dinner", "intake": "normal"},
            source="manual",
            transcript="Dinner was normal and Amma ate with us.",
        ),
        _event(
            14,
            occurred_at=_at(five_days_ago, 22),
            reported_by=DEMO_AMMA_ID,
            event_type="sleep",
            event_data={"quality": "good"},
            source="voice",
            transcript="I slept well and woke up feeling rested.",
            confidence=0.98,
        ),
        _event(
            15,
            occurred_at=_at(six_days_ago, 16, 30),
            reported_by=DEMO_RAHUL_ID,
            event_type="visit",
            event_data={"visit_type": "family visit", "status": "completed"},
            source="manual",
            transcript="Rahul stopped by for a relaxed family visit.",
        ),
        _event(
            16,
            occurred_at=_at(six_days_ago, 11, 10),
            reported_by=DEMO_MAYA_ID,
            event_type="check_in",
            event_data={"kind": "hydration reminder", "status": "completed"},
            source="manual",
            transcript="Maya checked in and Amma had water nearby.",
        ),
        _event(
            17,
            occurred_at=_at(seven_days_ago, 10, 30),
            reported_by=DEMO_MAYA_ID,
            event_type="check_in",
            event_data={"method": "phone", "status": "comfortable"},
            source="manual",
            transcript="Maya called and Amma sounded comfortable.",
        ),
        _event(
            18,
            occurred_at=_at(seven_days_ago, 20),
            reported_by=DEMO_ANU_ID,
            event_type="medication",
            event_data={"routine": "evening check", "status": "completed"},
            source="manual",
            transcript="The usual evening medicine check was completed.",
        ),
        _event(
            19,
            occurred_at=_at(eight_days_ago, 15),
            reported_by=DEMO_ANU_ID,
            event_type="visit",
            event_data={"visit_type": "professional home visit", "status": "completed"},
            source="manual",
            transcript="Anu completed the planned home visit and shared the routine update.",
        ),
        _event(
            20,
            occurred_at=_at(eight_days_ago, 17, 15),
            reported_by=DEMO_RAHUL_ID,
            event_type="activity",
            event_data={"activity": "short walk", "intensity": "light"},
            source="manual",
            transcript="Amma took a short walk with Rahul in the evening.",
        ),
        _event(
            21,
            occurred_at=_at(nine_days_ago, 13),
            reported_by=DEMO_AMMA_ID,
            event_type="meal",
            event_data={
                "meal": "lunch",
                "intake": "slightly low",
                "follow_up": "rested",
            },
            source="voice",
            transcript="Lunch was a little light, so I rested afterwards.",
            confidence=0.96,
        ),
        _event(
            22,
            occurred_at=_at(nine_days_ago, 16),
            reported_by=DEMO_RAHUL_ID,
            event_type="activity",
            event_data={"activity": "household errand", "status": "completed"},
            source="manual",
            transcript="Rahul completed a household errand for Amma.",
        ),
        _event(
            23,
            occurred_at=_at(nine_days_ago, 19),
            reported_by=DEMO_MAYA_ID,
            event_type="meal",
            event_data={"meal": "dinner", "appetite": "normal"},
            source="manual",
            transcript="Amma's appetite was normal at dinner.",
        ),
        _event(
            24,
            occurred_at=_at(nine_days_ago, 22, 10),
            reported_by=DEMO_AMMA_ID,
            event_type="sleep",
            event_data={"quality": "good"},
            source="voice",
            transcript="I had a quiet night and slept well.",
            confidence=0.98,
        ),
    ]

    prescription_due = _at(tomorrow, 15)
    evening_check_due = _at(schedule_day, 20)
    tasks = [
        {
            "id": PRESCRIPTION_TASK_ID,
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Pick up prescription",
            "description": "Collect the prepared prescription from the pharmacy.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": None,
            "status": "pending",
            "priority": "high",
            "due_at": _iso(prescription_due),
            "completed_at": None,
            "source_event_id": None,
            "created_at": _iso(_at(story_day, 9)),
            "updated_at": _iso(current),
        },
        {
            "id": EVENING_CHECK_TASK_ID,
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Evening medicine check",
            "description": "Confirm that the usual evening medicine routine was completed.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_ANU_ID,
            "status": "pending",
            "priority": "medium",
            "due_at": _iso(evening_check_due),
            "completed_at": None,
            "source_event_id": None,
            "created_at": _iso(_at(story_day, 9, 5)),
            "updated_at": _iso(current),
        },
        {
            "id": "40000000-0000-0000-0000-000000000003",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Buy fruit",
            "description": "Pick up fruit for Amma's kitchen.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_MAYA_ID,
            "status": "completed",
            "priority": "medium",
            "due_at": _iso(_at(previous_day, 17)),
            "completed_at": _iso(_at(previous_day, 16, 20)),
            "source_event_id": None,
            "created_at": _iso(_at(two_days_ago, 10)),
            "updated_at": _iso(_at(previous_day, 16, 20)),
        },
        {
            "id": "40000000-0000-0000-0000-000000000004",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Confirm Anu's visit",
            "description": "Confirm the professional home visit time with Anu.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_RAHUL_ID,
            "status": "completed",
            "priority": "medium",
            "due_at": _iso(_at(previous_day, 12)),
            "completed_at": _iso(_at(previous_day, 10, 40)),
            "source_event_id": None,
            "created_at": _iso(_at(two_days_ago, 9)),
            "updated_at": _iso(_at(previous_day, 10, 40)),
        },
        {
            "id": "40000000-0000-0000-0000-000000000005",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Call pharmacy",
            "description": "Confirm the pharmacy opening hours.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_RAHUL_ID,
            "status": "completed",
            "priority": "low",
            "due_at": _iso(_at(story_day, 11)),
            "completed_at": _iso(_at(story_day, 10, 15)),
            "source_event_id": None,
            "created_at": _iso(_at(previous_day, 18)),
            "updated_at": _iso(_at(story_day, 10, 15)),
        },
        {
            "id": ANU_VISIT_TASK_ID,
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Complete today’s home visit",
            "description": "Complete the planned home visit and share a routine care note.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_ANU_ID,
            "status": "pending",
            "priority": "medium",
            "due_at": _iso(_at(schedule_day, 16)),
            "completed_at": None,
            "source_event_id": None,
            "created_at": _iso(_at(previous_day, 17)),
            "updated_at": _iso(current),
        },
        {
            "id": "40000000-0000-0000-0000-000000000007",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Bring reading glasses",
            "description": "Bring Amma's reading glasses from the side table.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_MAYA_ID,
            "status": "completed",
            "priority": "low",
            "due_at": _iso(_at(two_days_ago, 16)),
            "completed_at": _iso(_at(two_days_ago, 15, 40)),
            "source_event_id": None,
            "created_at": _iso(_at(three_days_ago, 18)),
            "updated_at": _iso(_at(two_days_ago, 15, 40)),
        },
        {
            "id": "40000000-0000-0000-0000-000000000008",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Restock household essentials",
            "description": "Restock the usual kitchen and household essentials.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_MAYA_ID,
            "status": "completed",
            "priority": "medium",
            "due_at": _iso(_at(three_days_ago, 18)),
            "completed_at": _iso(_at(three_days_ago, 17, 20)),
            "source_event_id": None,
            "created_at": _iso(_at(four_days_ago, 9)),
            "updated_at": _iso(_at(three_days_ago, 17, 20)),
        },
        {
            "id": "40000000-0000-0000-0000-000000000009",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Confirm follow-up time",
            "description": "Confirm the next family follow-up call time.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_RAHUL_ID,
            "status": "pending",
            "priority": "low",
            "due_at": _iso(_at(tomorrow, 11)),
            "completed_at": None,
            "source_event_id": None,
            "created_at": _iso(_at(two_days_ago, 14)),
            "updated_at": _iso(current),
        },
    ]

    availability = [
        {
            "id": RAHUL_AVAILABILITY_ID,
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_RAHUL_ID,
            "starts_at": _iso(_at(tomorrow, 13)),
            "ends_at": _iso(_at(tomorrow, 17)),
            "note": "Available for family errands tomorrow afternoon",
        },
        {
            "id": "70000000-0000-0000-0000-000000000002",
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_MAYA_ID,
            "starts_at": _iso(_at(today, 17)),
            "ends_at": _iso(_at(today, 20, 30)),
            "note": "Available this evening; unavailable during tomorrow's prescription window",
        },
        {
            "id": "70000000-0000-0000-0000-000000000003",
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_ANU_ID,
            "starts_at": _iso(_at(today, 14, 30)),
            "ends_at": _iso(_at(today, 16, 30)),
            "note": "Professional home-visit window only",
        },
        {
            "id": "70000000-0000-0000-0000-000000000004",
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_MAYA_ID,
            "starts_at": _iso(_at(tomorrow, 9)),
            "ends_at": _iso(_at(tomorrow, 11)),
            "note": "Available for a morning phone check-in",
        },
    ]

    scheduled_items = [
        {
            "id": "50000000-0000-0000-0000-000000000001",
            "circle_id": DEMO_CIRCLE_ID,
            "created_by": DEMO_MAYA_ID,
            "title": "Anu home visit",
            "starts_at": _iso(_at(schedule_day, 15)),
            "ends_at": _iso(_at(schedule_day, 16)),
            "recurrence_rule": None,
            "created_at": _iso(current - timedelta(days=7)),
        },
        {
            "id": "50000000-0000-0000-0000-000000000002",
            "circle_id": DEMO_CIRCLE_ID,
            "created_by": DEMO_MAYA_ID,
            "title": "Maya visit and family call",
            "starts_at": _iso(_at(schedule_day, 17, 30)),
            "ends_at": _iso(_at(schedule_day, 18, 15)),
            "recurrence_rule": None,
            "created_at": _iso(current - timedelta(days=6)),
        },
        {
            "id": "50000000-0000-0000-0000-000000000003",
            "circle_id": DEMO_CIRCLE_ID,
            "created_by": DEMO_MAYA_ID,
            "title": "Evening medicine check",
            "starts_at": _iso(_at(schedule_day, 20)),
            "ends_at": _iso(_at(schedule_day, 20, 15)),
            "recurrence_rule": None,
            "created_at": _iso(current - timedelta(days=5)),
        },
        {
            "id": "50000000-0000-0000-0000-000000000004",
            "circle_id": DEMO_CIRCLE_ID,
            "created_by": DEMO_MAYA_ID,
            "title": "Family follow-up call",
            "starts_at": _iso(_at(tomorrow, 11)),
            "ends_at": _iso(_at(tomorrow, 11, 30)),
            "recurrence_rule": None,
            "created_at": _iso(current - timedelta(days=4)),
        },
        {
            "id": "50000000-0000-0000-0000-000000000005",
            "circle_id": DEMO_CIRCLE_ID,
            "created_by": DEMO_MAYA_ID,
            "title": "Morning phone check-in",
            "starts_at": _iso(_at(tomorrow, 9, 30)),
            "ends_at": _iso(_at(tomorrow, 9, 45)),
            "recurrence_rule": None,
            "created_at": _iso(current - timedelta(days=3)),
        },
        {
            "id": "50000000-0000-0000-0000-000000000006",
            "circle_id": DEMO_CIRCLE_ID,
            "created_by": DEMO_RAHUL_ID,
            "title": "Rahul family visit",
            "starts_at": _iso(_at(tomorrow, 18)),
            "ends_at": _iso(_at(tomorrow, 19)),
            "recurrence_rule": None,
            "created_at": _iso(current - timedelta(days=2)),
        },
    ]

    memories = [
        {
            "id": "60000000-0000-0000-0000-000000000001",
            "circle_id": DEMO_CIRCLE_ID,
            "author_id": DEMO_MAYA_ID,
            "subject_id": DEMO_AMMA_ID,
            "kind": "story",
            "title": "My first job",
            "body": (
                "Amma remembers starting her first job in Kochi in 1978, "
                "feeling excited as she stepped into a new routine of her own."
            ),
            "media_path": None,
            "approximate_year": 1978,
            "created_at": _iso(current - timedelta(days=30)),
        },
        {
            "id": "60000000-0000-0000-0000-000000000002",
            "circle_id": DEMO_CIRCLE_ID,
            "author_id": DEMO_RAHUL_ID,
            "subject_id": DEMO_AMMA_ID,
            "kind": "story",
            "title": "Our old family home",
            "body": (
                "Amma remembers the old family home, familiar evening routines, "
                "and the conversations everyone shared as the day grew quiet."
            ),
            "media_path": None,
            "approximate_year": 1985,
            "created_at": _iso(current - timedelta(days=20)),
        },
        {
            "id": "60000000-0000-0000-0000-000000000003",
            "circle_id": DEMO_CIRCLE_ID,
            "author_id": DEMO_MAYA_ID,
            "subject_id": DEMO_AMMA_ID,
            "kind": "story",
            "title": "Maya's first day of school",
            "body": (
                "Amma remembers getting Maya ready for her first day of school, "
                "checking everything twice and walking out together with a smile."
            ),
            "media_path": None,
            "approximate_year": 1992,
            "created_at": _iso(current - timedelta(days=10)),
        },
        {
            "id": "60000000-0000-0000-0000-000000000004",
            "circle_id": DEMO_CIRCLE_ID,
            "author_id": DEMO_RAHUL_ID,
            "subject_id": DEMO_AMMA_ID,
            "kind": "story",
            "title": "A family trip to Munnar",
            "body": "Amma remembers the cool air, shared snacks, and an easy family day in Munnar.",
            "media_path": None,
            "approximate_year": None,
            "created_at": _iso(current - timedelta(days=8)),
        },
        {
            "id": "60000000-0000-0000-0000-000000000005",
            "circle_id": DEMO_CIRCLE_ID,
            "author_id": DEMO_MAYA_ID,
            "subject_id": DEMO_AMMA_ID,
            "kind": "story",
            "title": "Rahul's graduation day",
            "body": "Amma remembers the family gathering together and Rahul's proud smile that day.",
            "media_path": None,
            "approximate_year": None,
            "created_at": _iso(current - timedelta(days=6)),
        },
        {
            "id": "60000000-0000-0000-0000-000000000006",
            "circle_id": DEMO_CIRCLE_ID,
            "author_id": DEMO_MAYA_ID,
            "subject_id": DEMO_AMMA_ID,
            "kind": "story",
            "title": "Festival at home",
            "body": "Amma remembers everyone helping at home, the warm lights, and a lively family meal.",
            "media_path": None,
            "approximate_year": None,
            "created_at": _iso(current - timedelta(days=4)),
        },
    ]

    return DemoDataset(
        profiles=profiles,
        circle=circle,
        members=members,
        care_events=care_events,
        tasks=tasks,
        availability=availability,
        scheduled_items=scheduled_items,
        memories=memories,
    )


def load_demo_settings() -> DemoSettings:
    settings = DemoSettings(_env_file=ROOT / ".env", _env_file_encoding="utf-8")
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise DemoDataError(
            "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the environment or root .env."
        )
    if not settings.supabase_url.startswith(("https://", "http://")):
        raise DemoDataError("SUPABASE_URL must be an http(s) URL.")
    return settings


def create_admin_client() -> Any:
    settings = load_demo_settings()
    try:
        from supabase import create_client

        return create_client(settings.supabase_url, settings.supabase_secret_key)
    except Exception as exc:  # pragma: no cover - library-specific setup failures
        raise DemoDataError("Could not create the backend Supabase client.") from exc


def _data(query: Any, action: str) -> list[dict[str, Any]]:
    try:
        response = query.execute()
    except Exception as exc:
        raise DemoDataError(f"Supabase failed while {action}: {exc}") from exc
    return list(response.data or [])


def assert_demo_project(client: Any) -> None:
    """Fail closed unless the fixed identities are marked as synthetic demo data."""

    profiles = _data(
        client.table("profiles")
        .select("id,display_name,preferences")
        .in_("id", list(DEMO_PROFILE_IDS)),
        "checking demo profiles",
    )
    by_id = {row["id"]: row for row in profiles}
    missing = [profile_id for profile_id in DEMO_PROFILE_IDS if profile_id not in by_id]
    if missing:
        raise DemoDataError(
            "The configured project is missing deterministic demo profiles. "
            "Provision the synthetic demo identities before seeding."
        )
    expected_names = {
        DEMO_AMMA_ID: "Amma",
        DEMO_MAYA_ID: "Maya",
        DEMO_RAHUL_ID: "Rahul",
        DEMO_ANU_ID: "Anu",
    }
    unsafe = [
        profile_id
        for profile_id, expected_name in expected_names.items()
        if by_id[profile_id].get("display_name") != expected_name
        or not (by_id[profile_id].get("preferences") or {}).get("demo")
    ]
    if unsafe:
        raise DemoDataError(
            "The configured project did not pass the synthetic demo-profile guard; no reset was run."
        )

    circles = _data(
        client.table("care_circles")
        .select("id,name,created_by")
        .eq("id", DEMO_CIRCLE_ID)
        .limit(1),
        "checking the demo Care Circle",
    )
    if circles:
        circle = circles[0]
        if (
            circle.get("name") != "Amma's Care Circle"
            or circle.get("created_by") != DEMO_MAYA_ID
        ):
            raise DemoDataError(
                "The fixed Care Circle ID belongs to unexpected data; no reset was run."
            )


def _upsert(
    client: Any, table: str, rows: Iterable[dict[str, Any]], conflict: str
) -> None:
    payload = list(rows)
    if not payload:
        return
    _data(
        client.table(table).upsert(payload, on_conflict=conflict),
        f"upserting {table}",
    )


def seed_demo(client: Any, dataset: DemoDataset) -> None:
    """Idempotently upsert the deterministic records without deleting other rows."""

    assert_demo_project(client)
    _upsert(client, "profiles", dataset.profiles, "id")
    _upsert(client, "care_circles", [dataset.circle], "id")
    _upsert(client, "circle_members", dataset.members, "circle_id,profile_id")
    _upsert(client, "care_events", dataset.care_events, "id")
    _upsert(client, "tasks", dataset.tasks, "id")
    _upsert(client, "scheduled_items", dataset.scheduled_items, "id")
    _upsert(client, "memories", dataset.memories, "id")
    _upsert(client, "availability", dataset.availability, "id")


def reset_demo(client: Any, dataset: DemoDataset) -> None:
    """Delete only demo-circle child data, then restore the known-good state."""

    assert_demo_project(client)
    for table in RESET_DELETE_ORDER:
        _data(
            client.table(table).delete().eq("circle_id", DEMO_CIRCLE_ID),
            f"clearing {table} for the demo Care Circle",
        )
    seed_demo(client, dataset)


def _select_circle(client: Any, table: str, columns: str = "*") -> list[dict[str, Any]]:
    return _data(
        client.table(table).select(columns).eq("circle_id", DEMO_CIRCLE_ID),
        f"verifying {table}",
    )


def verify_demo_state(
    client: Any, dataset: DemoDataset, *, exact: bool
) -> dict[str, Any]:
    members = _select_circle(client, "circle_members", "profile_id")
    events = _select_circle(client, "care_events", "id")
    tasks = _select_circle(
        client,
        "tasks",
        "id,title,status,assigned_to,due_at,completed_at",
    )
    availability = _select_circle(
        client,
        "availability",
        "id,profile_id,starts_at,ends_at,note",
    )
    scheduled = _select_circle(client, "scheduled_items", "id,starts_at")
    memories = _select_circle(client, "memories", "id,title")

    expected_counts = {
        "members": len(dataset.members),
        "care_events": len(dataset.care_events),
        "tasks": len(dataset.tasks),
        "availability": len(dataset.availability),
        "scheduled_items": len(dataset.scheduled_items),
        "memories": len(dataset.memories),
    }
    actual_counts = {
        "members": len(members),
        "care_events": len(events),
        "tasks": len(tasks),
        "availability": len(availability),
        "scheduled_items": len(scheduled),
        "memories": len(memories),
    }
    if exact and actual_counts != expected_counts:
        raise DemoDataError(
            f"Reset verification count mismatch: expected {expected_counts}, got {actual_counts}."
        )
    if not exact and any(
        actual_counts[key] < value for key, value in expected_counts.items()
    ):
        raise DemoDataError(
            f"Seed verification count mismatch: expected at least {expected_counts}, got {actual_counts}."
        )

    prescription = next(
        (row for row in tasks if row["id"] == PRESCRIPTION_TASK_ID),
        None,
    )
    rahul_window = next(
        (row for row in availability if row["id"] == RAHUL_AVAILABILITY_ID),
        None,
    )
    if not prescription or not rahul_window:
        raise DemoDataError(
            "Prescription task or Rahul availability is missing after seed."
        )
    if (
        prescription["status"] != "pending"
        or prescription["assigned_to"] is not None
        or prescription["completed_at"] is not None
    ):
        raise DemoDataError(
            "Prescription task was not restored to pending and unassigned."
        )
    due = datetime.fromisoformat(prescription["due_at"])
    if not (
        datetime.fromisoformat(rahul_window["starts_at"])
        <= due
        <= datetime.fromisoformat(rahul_window["ends_at"])
    ):
        raise DemoDataError(
            "Rahul availability does not cover the prescription due time."
        )
    now = datetime.now(UTC)
    if any(datetime.fromisoformat(row["starts_at"]) <= now for row in scheduled):
        raise DemoDataError("One or more scheduled items are not in the future.")

    return {
        **actual_counts,
        "pending_tasks": sum(
            row["status"] not in {"completed", "done", "cancelled"} for row in tasks
        ),
        "completed_tasks": sum(row["status"] in {"completed", "done"} for row in tasks),
        "prescription": prescription,
    }


def print_summary(summary: dict[str, Any], action: str) -> None:
    prescription = summary["prescription"]
    print(f"CareLoop demo {action} complete.\n")
    print(f"Members: {summary['members']}")
    print(f"Care events: {summary['care_events']}")
    print(f"Tasks: {summary['tasks']}")
    print(f"Pending tasks: {summary['pending_tasks']}")
    print(f"Completed tasks: {summary['completed_tasks']}")
    print(f"Availability records: {summary['availability']}")
    print(f"Scheduled items: {summary['scheduled_items']}")
    print(f"Memories: {summary['memories']}\n")
    print("Prescription pickup:")
    print(f"status={prescription['status']}")
    print(f"assigned_to={prescription['assigned_to']}")
    print(f"due={prescription['due_at']}")

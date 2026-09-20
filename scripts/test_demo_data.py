from datetime import UTC, datetime, timedelta

import pytest

from scripts.demo_data import (
    DEMO_ANU_ID,
    DEMO_CIRCLE_ID,
    DEMO_MAYA_ID,
    DEMO_RAHUL_ID,
    PRESCRIPTION_TASK_ID,
    RAHUL_AVAILABILITY_ID,
    build_demo_dataset,
)

FIXED_NOW = datetime(2026, 9, 20, 4, 0, tzinfo=UTC)


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value)


def test_demo_dataset_has_expected_personas_and_counts() -> None:
    dataset = build_demo_dataset(FIXED_NOW)

    assert len(dataset.profiles) == 4
    assert len(dataset.members) == 4
    assert len(dataset.care_events) == 10
    assert len(dataset.tasks) == 5
    assert len(dataset.availability) == 3
    assert len(dataset.scheduled_items) == 4
    assert len(dataset.memories) == 3
    assert {row["circle_id"] for row in dataset.members} == {DEMO_CIRCLE_ID}

    members = {row["profile_id"]: row for row in dataset.members}
    assert members[DEMO_MAYA_ID]["relationship"] == "daughter and coordinator"
    assert members[DEMO_ANU_ID]["role"] == "caregiver"
    anu = next(row for row in dataset.profiles if row["id"] == DEMO_ANU_ID)
    assert anu["preferences"]["memory_box_access"] is False


def test_prescription_is_unassigned_and_covered_only_by_rahuls_window() -> None:
    dataset = build_demo_dataset(FIXED_NOW)
    prescription = next(row for row in dataset.tasks if row["id"] == PRESCRIPTION_TASK_ID)
    rahul_window = next(
        row for row in dataset.availability if row["id"] == RAHUL_AVAILABILITY_ID
    )

    assert prescription["status"] == "pending"
    assert prescription["assigned_to"] is None
    assert prescription["completed_at"] is None
    due = _parse(prescription["due_at"])
    assert _parse(rahul_window["starts_at"]) <= due <= _parse(rahul_window["ends_at"])
    assert rahul_window["profile_id"] == DEMO_RAHUL_ID
    assert [
        row["profile_id"]
        for row in dataset.availability
        if _parse(row["starts_at"]) <= due <= _parse(row["ends_at"])
    ] == [DEMO_RAHUL_ID]


@pytest.mark.parametrize(
    "now",
    [
        FIXED_NOW,
        datetime(2026, 9, 20, 16, 0, tzinfo=UTC),
    ],
)
def test_all_upcoming_items_are_future_for_morning_and_evening_resets(
    now: datetime,
) -> None:
    dataset = build_demo_dataset(now)

    assert all(_parse(row["starts_at"]) > now for row in dataset.scheduled_items)
    assert all(_parse(row["occurred_at"]) < now for row in dataset.care_events)


def test_seed_ids_are_unique_and_timestamps_move_with_reset_day() -> None:
    first = build_demo_dataset(FIXED_NOW)
    next_day = build_demo_dataset(FIXED_NOW + timedelta(days=1))

    for rows in (
        first.care_events,
        first.tasks,
        first.availability,
        first.scheduled_items,
        first.memories,
    ):
        ids = [row["id"] for row in rows]
        assert len(ids) == len(set(ids))

    first_due = next(row for row in first.tasks if row["id"] == PRESCRIPTION_TASK_ID)[
        "due_at"
    ]
    next_due = next(
        row for row in next_day.tasks if row["id"] == PRESCRIPTION_TASK_ID
    )["due_at"]
    assert _parse(next_due) - _parse(first_due) == timedelta(days=1)

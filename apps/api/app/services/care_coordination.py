from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from threading import RLock
from typing import Any
from uuid import UUID, uuid4

from app.core.config import settings
from app.schemas.care import CareEventCreate, MemoryCreate, TaskCreate, TaskUpdate
from app.services.errors import (
    BackendUnavailableError,
    ForbiddenError,
    InvalidOperationError,
    NotFoundError,
    UnauthorizedError,
)

DEMO_AMMA_ID = "10000000-0000-0000-0000-000000000001"
DEMO_MAYA_ID = "10000000-0000-0000-0000-000000000002"
DEMO_RAHUL_ID = "10000000-0000-0000-0000-000000000003"
DEMO_ANU_ID = "10000000-0000-0000-0000-000000000004"
DEMO_CIRCLE_ID = "20000000-0000-0000-0000-000000000001"


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime) -> str:
    return value.isoformat()


def _demo_state() -> dict[str, Any]:
    today = _utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
    profiles = {
        DEMO_AMMA_ID: {
            "id": DEMO_AMMA_ID,
            "display_name": "Amma",
            "avatar_url": None,
            "preferred_language": "ml",
        },
        DEMO_MAYA_ID: {
            "id": DEMO_MAYA_ID,
            "display_name": "Maya",
            "avatar_url": None,
            "preferred_language": "en",
        },
        DEMO_RAHUL_ID: {
            "id": DEMO_RAHUL_ID,
            "display_name": "Rahul",
            "avatar_url": None,
            "preferred_language": "en",
        },
        DEMO_ANU_ID: {
            "id": DEMO_ANU_ID,
            "display_name": "Anu",
            "avatar_url": None,
            "preferred_language": "ml",
        },
    }
    members = [
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_AMMA_ID,
            "role": "patient",
            "relationship": "patient",
            "is_active": True,
            "joined_at": _iso(today - timedelta(days=60)),
        },
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_MAYA_ID,
            "role": "family",
            "relationship": "daughter",
            "is_active": True,
            "joined_at": _iso(today - timedelta(days=60)),
        },
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_RAHUL_ID,
            "role": "family",
            "relationship": "son",
            "is_active": True,
            "joined_at": _iso(today - timedelta(days=55)),
        },
        {
            "circle_id": DEMO_CIRCLE_ID,
            "profile_id": DEMO_ANU_ID,
            "role": "caregiver",
            "relationship": "home nurse",
            "is_active": True,
            "joined_at": _iso(today - timedelta(days=30)),
        },
    ]
    events = {
        "30000000-0000-0000-0000-000000000001": {
            "id": "30000000-0000-0000-0000-000000000001",
            "circle_id": DEMO_CIRCLE_ID,
            "subject_id": DEMO_AMMA_ID,
            "reported_by": DEMO_MAYA_ID,
            "event_type": "meal",
            "event_data": {"meal": "lunch", "intake": "low"},
            "source": "manual",
            "raw_transcript": "Amma didn't eat much at lunch.",
            "confidence": 0.98,
            "occurred_at": _iso(today + timedelta(hours=13)),
            "created_at": _iso(today + timedelta(hours=13, minutes=5)),
        },
        "30000000-0000-0000-0000-000000000002": {
            "id": "30000000-0000-0000-0000-000000000002",
            "circle_id": DEMO_CIRCLE_ID,
            "subject_id": DEMO_AMMA_ID,
            "reported_by": DEMO_ANU_ID,
            "event_type": "visit",
            "event_data": {"visit_type": "home_nurse", "status": "completed"},
            "source": "manual",
            "raw_transcript": None,
            "confidence": None,
            "occurred_at": _iso(today + timedelta(hours=15)),
            "created_at": _iso(today + timedelta(hours=15, minutes=5)),
        },
        "30000000-0000-0000-0000-000000000003": {
            "id": "30000000-0000-0000-0000-000000000003",
            "circle_id": DEMO_CIRCLE_ID,
            "subject_id": DEMO_AMMA_ID,
            "reported_by": DEMO_AMMA_ID,
            "event_type": "check_in",
            "event_data": {"mood": "okay", "note": "Morning voice check-in completed"},
            "source": "voice",
            "raw_transcript": "I am doing okay this morning.",
            "confidence": 0.96,
            "occurred_at": _iso(today + timedelta(hours=8)),
            "created_at": _iso(today + timedelta(hours=8, minutes=1)),
        },
    }
    tasks = {
        "40000000-0000-0000-0000-000000000001": {
            "id": "40000000-0000-0000-0000-000000000001",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Pick up prescription",
            "description": "Collect the prepared prescription from the pharmacy.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": None,
            "status": "pending",
            "priority": "high",
            "due_at": _iso(today + timedelta(hours=18)),
            "completed_at": None,
            "source_event_id": None,
            "created_at": _iso(today + timedelta(hours=9)),
            "updated_at": _iso(today + timedelta(hours=9)),
        },
        "40000000-0000-0000-0000-000000000002": {
            "id": "40000000-0000-0000-0000-000000000002",
            "circle_id": DEMO_CIRCLE_ID,
            "title": "Evening medicine check",
            "description": "Confirm that the usual evening medicine routine was completed.",
            "created_by": DEMO_MAYA_ID,
            "assigned_to": DEMO_ANU_ID,
            "status": "pending",
            "priority": "medium",
            "due_at": _iso(today + timedelta(hours=20)),
            "completed_at": None,
            "source_event_id": None,
            "created_at": _iso(today + timedelta(hours=9, minutes=5)),
            "updated_at": _iso(today + timedelta(hours=9, minutes=5)),
        },
    }
    return {
        "profiles": profiles,
        "circles": {
            DEMO_CIRCLE_ID: {
                "id": DEMO_CIRCLE_ID,
                "name": "Amma's Care Circle",
                "created_by": DEMO_MAYA_ID,
                "created_at": _iso(today - timedelta(days=60)),
            }
        },
        "members": members,
        "events": events,
        "tasks": tasks,
        "scheduled_items": {
            "50000000-0000-0000-0000-000000000001": {
                "id": "50000000-0000-0000-0000-000000000001",
                "circle_id": DEMO_CIRCLE_ID,
                "created_by": DEMO_MAYA_ID,
                "title": "Evening family call",
                "starts_at": _iso(today + timedelta(hours=19)),
                "ends_at": _iso(today + timedelta(hours=19, minutes=30)),
                "recurrence_rule": None,
                "created_at": _iso(today + timedelta(hours=9)),
            }
        },
        "availability": {
            "70000000-0000-0000-0000-000000000001": {
                "id": "70000000-0000-0000-0000-000000000001",
                "circle_id": DEMO_CIRCLE_ID,
                "profile_id": DEMO_RAHUL_ID,
                "starts_at": _iso(today + timedelta(days=1, hours=13)),
                "ends_at": _iso(today + timedelta(days=1, hours=17)),
                "note": "Available tomorrow afternoon",
            }
        },
        "memories": {
            "60000000-0000-0000-0000-000000000001": {
                "id": "60000000-0000-0000-0000-000000000001",
                "circle_id": DEMO_CIRCLE_ID,
                "author_id": DEMO_MAYA_ID,
                "subject_id": DEMO_AMMA_ID,
                "kind": "story",
                "title": "My first job",
                "body": "Amma remembers starting her first job around 1978.",
                "media_path": None,
                "approximate_year": 1978,
                "created_at": _iso(today - timedelta(days=2)),
            }
        },
    }


class CareCoordinationService:
    """Authorization-aware care coordination operations with a demo fallback."""

    def __init__(self) -> None:
        self._state = _demo_state()
        self._lock = RLock()
        self._supabase: Any | None = None

    @property
    def uses_supabase(self) -> bool:
        return not settings.demo_mode and bool(
            settings.supabase_url and settings.supabase_secret_key
        )

    def _client(self) -> Any:
        if not self.uses_supabase:
            raise BackendUnavailableError()
        if self._supabase is None:
            try:
                from supabase import create_client

                self._supabase = create_client(
                    settings.supabase_url,
                    settings.supabase_secret_key,
                )
            except Exception as exc:
                raise BackendUnavailableError() from exc
        return self._supabase

    def resolve_actor(self, authorization: str | None) -> str:
        if settings.demo_mode:
            return DEMO_MAYA_ID
        if not authorization:
            raise UnauthorizedError()

        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise UnauthorizedError()
        if not self.uses_supabase:
            raise BackendUnavailableError()
        try:
            response = self._client().auth.get_user(token)
            user = getattr(response, "user", None)
            user_id = getattr(user, "id", None)
        except Exception as exc:
            raise UnauthorizedError("The bearer token could not be verified.") from exc
        if not user_id:
            raise UnauthorizedError("The bearer token could not be verified.")
        return str(user_id)

    def _execute(self, query: Any) -> list[dict[str, Any]]:
        try:
            response = query.execute()
            return list(response.data or [])
        except Exception as exc:
            raise BackendUnavailableError() from exc

    def _is_demo_member(self, circle_id: str, actor_id: str) -> bool:
        return any(
            member["circle_id"] == circle_id
            and member["profile_id"] == actor_id
            and member["is_active"]
            for member in self._state["members"]
        )

    def _assert_member(self, circle_id: str, actor_id: str) -> None:
        if self.uses_supabase:
            rows = self._execute(
                self._client()
                .table("circle_members")
                .select("profile_id")
                .eq("circle_id", circle_id)
                .eq("profile_id", actor_id)
                .eq("is_active", True)
                .limit(1)
            )
            if not rows:
                raise ForbiddenError()
            return
        if not settings.demo_mode:
            raise BackendUnavailableError()
        if not self._is_demo_member(circle_id, actor_id):
            raise ForbiddenError()

    def _assert_person_in_circle(self, circle_id: str, profile_id: str) -> None:
        if self.uses_supabase:
            rows = self._execute(
                self._client()
                .table("circle_members")
                .select("profile_id")
                .eq("circle_id", circle_id)
                .eq("profile_id", profile_id)
                .eq("is_active", True)
                .limit(1)
            )
            if not rows:
                raise InvalidOperationError(
                    "member_required",
                    "The referenced person must be an active member of this Care Circle.",
                )
            return
        if not self._is_demo_member(circle_id, profile_id):
            raise InvalidOperationError(
                "member_required",
                "The referenced person must be an active member of this Care Circle.",
            )

    def assert_voice_context(self, circle_id: str, actor_id: str, patient_id: str) -> None:
        """Authorize both the speaker and care subject before provider session creation."""
        self._assert_member(circle_id, actor_id)
        self._assert_person_in_circle(circle_id, patient_id)

    def get_circle(self, circle_id: UUID, actor_id: str) -> dict[str, Any]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        if self.uses_supabase:
            rows = self._execute(
                self._client()
                .table("care_circles")
                .select("id,name,created_by,created_at")
                .eq("id", circle)
                .limit(1)
            )
            if not rows:
                raise NotFoundError("Care Circle")
            members = self._execute(
                self._client()
                .table("circle_members")
                .select("profile_id")
                .eq("circle_id", circle)
                .eq("is_active", True)
            )
            return {**rows[0], "member_count": len(members)}
        row = self._state["circles"].get(circle)
        if not row:
            raise NotFoundError("Care Circle")
        count = sum(
            1
            for member in self._state["members"]
            if member["circle_id"] == circle and member["is_active"]
        )
        return {**deepcopy(row), "member_count": count}

    def list_members(self, circle_id: UUID, actor_id: str) -> list[dict[str, Any]]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        if self.uses_supabase:
            memberships = self._execute(
                self._client()
                .table("circle_members")
                .select("circle_id,profile_id,role,relationship,joined_at")
                .eq("circle_id", circle)
                .eq("is_active", True)
                .order("joined_at")
            )
            profile_ids = [row["profile_id"] for row in memberships]
            if not profile_ids:
                return []
            profiles = self._execute(
                self._client()
                .table("profiles")
                .select("id,display_name,avatar_url,preferred_language")
                .in_("id", profile_ids)
            )
            profile_map = {row["id"]: row for row in profiles}
            return [
                {
                    **membership,
                    "display_name": profile_map[membership["profile_id"]]["display_name"],
                    "avatar_url": profile_map[membership["profile_id"]]["avatar_url"],
                    "preferred_language": profile_map[membership["profile_id"]][
                        "preferred_language"
                    ],
                }
                for membership in memberships
                if membership["profile_id"] in profile_map
            ]
        rows: list[dict[str, Any]] = []
        for membership in self._state["members"]:
            if membership["circle_id"] != circle or not membership["is_active"]:
                continue
            profile = self._state["profiles"][membership["profile_id"]]
            rows.append(
                {
                    key: deepcopy(value)
                    for key, value in {**membership, **profile}.items()
                    if key != "is_active" and key != "id"
                }
            )
        return rows

    def list_events(
        self,
        circle_id: UUID,
        actor_id: str,
        limit: int,
        offset: int,
        since: datetime | None = None,
    ) -> list[dict[str, Any]]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        if self.uses_supabase:
            query = (
                self._client()
                .table("care_events")
                .select(
                    "id,circle_id,subject_id,reported_by,event_type,event_data,"
                    "source,raw_transcript,confidence,occurred_at,created_at"
                )
                .eq("circle_id", circle)
            )
            if since is not None:
                query = query.gte("occurred_at", _iso(since))
            return self._execute(
                query.order("occurred_at", desc=True).range(offset, offset + limit - 1)
            )
        rows = [
            deepcopy(row)
            for row in self._state["events"].values()
            if row["circle_id"] == circle
            and (since is None or datetime.fromisoformat(row["occurred_at"]) >= since)
        ]
        rows.sort(key=lambda row: row["occurred_at"], reverse=True)
        return rows[offset : offset + limit]

    def create_event(
        self,
        circle_id: UUID,
        actor_id: str,
        payload: CareEventCreate,
    ) -> dict[str, Any]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        reporter = (
            actor_id
            if self.uses_supabase
            else str(payload.reported_by) if payload.reported_by else actor_id
        )
        self._assert_person_in_circle(circle, reporter)
        self._assert_person_in_circle(circle, str(payload.subject_id))

        row = payload.model_dump(
            mode="json",
            exclude={"confirmed"},
            exclude_none=True,
        )
        row.update(
            {
                "circle_id": circle,
                "reported_by": reporter,
                "occurred_at": row.get("occurred_at", _iso(_utc_now())),
            }
        )
        if self.uses_supabase:
            rows = self._execute(self._client().table("care_events").insert(row))
            if not rows:
                raise BackendUnavailableError()
            return {
                key: rows[0].get(key)
                for key in (
                    "id",
                    "circle_id",
                    "subject_id",
                    "reported_by",
                    "event_type",
                    "event_data",
                    "source",
                    "raw_transcript",
                    "confidence",
                    "occurred_at",
                    "created_at",
                )
            }
        now = _iso(_utc_now())
        created = {"id": str(uuid4()), **row, "created_at": now}
        with self._lock:
            self._state["events"][created["id"]] = created
        return deepcopy(created)

    def list_tasks(
        self,
        circle_id: UUID,
        actor_id: str,
        limit: int,
        offset: int,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        if self.uses_supabase:
            query = (
                self._client()
                .table("tasks")
                .select(
                    "id,circle_id,title,description,created_by,assigned_to,status,"
                    "priority,due_at,completed_at,source_event_id,created_at,updated_at"
                )
                .eq("circle_id", circle)
            )
            if status:
                query = query.eq("status", status)
            return self._execute(
                query.order("created_at", desc=True).range(offset, offset + limit - 1)
            )
        rows = [
            deepcopy(row)
            for row in self._state["tasks"].values()
            if row["circle_id"] == circle and (status is None or row["status"] == status)
        ]
        rows.sort(key=lambda row: row["created_at"], reverse=True)
        return rows[offset : offset + limit]

    def create_task(
        self,
        circle_id: UUID,
        actor_id: str,
        payload: TaskCreate,
    ) -> dict[str, Any]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        if payload.assigned_to:
            self._assert_person_in_circle(circle, str(payload.assigned_to))
        if payload.source_event_id:
            self._assert_event_in_circle(circle, str(payload.source_event_id))

        row = payload.model_dump(mode="json", exclude_none=True)
        row.update({"circle_id": circle, "created_by": actor_id})
        if self.uses_supabase:
            rows = self._execute(self._client().table("tasks").insert(row))
            if not rows:
                raise BackendUnavailableError()
            return rows[0]
        now = _iso(_utc_now())
        created = {
            "id": str(uuid4()),
            **row,
            "description": row.get("description"),
            "assigned_to": row.get("assigned_to"),
            "due_at": row.get("due_at"),
            "completed_at": None,
            "source_event_id": row.get("source_event_id"),
            "created_at": now,
            "updated_at": now,
        }
        with self._lock:
            self._state["tasks"][created["id"]] = created
        return deepcopy(created)

    def _assert_event_in_circle(self, circle_id: str, event_id: str) -> None:
        if self.uses_supabase:
            rows = self._execute(
                self._client()
                .table("care_events")
                .select("id")
                .eq("id", event_id)
                .eq("circle_id", circle_id)
                .limit(1)
            )
            if not rows:
                raise InvalidOperationError(
                    "source_event_mismatch",
                    "The source event must belong to the same Care Circle.",
                )
            return
        row = self._state["events"].get(event_id)
        if not row or row["circle_id"] != circle_id:
            raise InvalidOperationError(
                "source_event_mismatch",
                "The source event must belong to the same Care Circle.",
            )

    def update_task(
        self,
        task_id: UUID,
        actor_id: str,
        payload: TaskUpdate,
    ) -> dict[str, Any]:
        task = str(task_id)
        if self.uses_supabase:
            rows = self._execute(
                self._client()
                .table("tasks")
                .select(
                    "id,circle_id,title,description,created_by,assigned_to,status,"
                    "priority,due_at,completed_at,source_event_id,created_at,updated_at"
                )
                .eq("id", task)
                .limit(1)
            )
            if not rows:
                raise NotFoundError("Task")
            current = rows[0]
        else:
            current = self._state["tasks"].get(task)
            if not current:
                raise NotFoundError("Task")
        circle = current["circle_id"]
        self._assert_member(circle, actor_id)

        fields = payload.model_dump(mode="json", exclude_unset=True)
        if not fields:
            raise InvalidOperationError("empty_update", "At least one task field is required.")
        if fields.get("assigned_to"):
            self._assert_person_in_circle(circle, fields["assigned_to"])
        if fields.get("status") in {"completed", "done"}:
            fields["completed_at"] = _iso(_utc_now())
        elif "status" in fields and current.get("completed_at") is not None:
            fields["completed_at"] = None
        fields["updated_at"] = _iso(_utc_now())

        if self.uses_supabase:
            rows = self._execute(
                self._client()
                .table("tasks")
                .update(fields)
                .eq("id", task)
                .eq("circle_id", circle)
            )
            if not rows:
                raise NotFoundError("Task")
            return rows[0]
        with self._lock:
            current.update(fields)
            updated = deepcopy(current)
        return updated

    def list_availability(
        self, circle_id: UUID, actor_id: str, limit: int, offset: int
    ) -> list[dict[str, Any]]:
        return self._list_circle_rows(
            "availability", circle_id, actor_id, "starts_at", limit, offset
        )

    def list_scheduled_items(
        self, circle_id: UUID, actor_id: str, limit: int, offset: int
    ) -> list[dict[str, Any]]:
        return self._list_circle_rows(
            "scheduled_items", circle_id, actor_id, "starts_at", limit, offset
        )

    def _list_circle_rows(
        self,
        table: str,
        circle_id: UUID,
        actor_id: str,
        order_by: str,
        limit: int,
        offset: int,
    ) -> list[dict[str, Any]]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        if self.uses_supabase:
            return self._execute(
                self._client()
                .table(table)
                .select("*")
                .eq("circle_id", circle)
                .order(order_by)
                .range(offset, offset + limit - 1)
            )
        rows = [
            deepcopy(row)
            for row in self._state[table].values()
            if row["circle_id"] == circle
        ]
        rows.sort(key=lambda row: row[order_by])
        return rows[offset : offset + limit]

    def create_memory(
        self,
        circle_id: UUID,
        actor_id: str,
        payload: MemoryCreate,
    ) -> dict[str, Any]:
        circle = str(circle_id)
        self._assert_member(circle, actor_id)
        self._assert_person_in_circle(circle, str(payload.subject_id))
        row = payload.model_dump(mode="json", exclude_none=True)
        row.update({"circle_id": circle, "author_id": actor_id})
        if self.uses_supabase:
            rows = self._execute(self._client().table("memories").insert(row))
            if not rows:
                raise BackendUnavailableError()
            return rows[0]
        created = {
            "id": str(uuid4()),
            **row,
            "body": row.get("body"),
            "media_path": row.get("media_path"),
            "approximate_year": row.get("approximate_year"),
            "created_at": _iso(_utc_now()),
        }
        with self._lock:
            self._state["memories"][created["id"]] = created
        return deepcopy(created)

    def handoff_context(
        self,
        circle_id: UUID,
        actor_id: str,
        since: datetime | None,
    ) -> dict[str, list[dict[str, Any]]]:
        events = self.list_events(circle_id, actor_id, 100, 0, since)
        tasks = self.list_tasks(circle_id, actor_id, 100, 0)
        scheduled = self.list_scheduled_items(circle_id, actor_id, 100, 0)
        return {
            "events_since_last_seen": events,
            "pending_tasks": [
                row for row in tasks if row["status"] not in {"done", "completed", "cancelled"}
            ],
            "completed_tasks": [
                row for row in tasks if row["status"] in {"done", "completed"}
            ],
            "upcoming": scheduled,
        }


@lru_cache
def get_care_coordination_service() -> CareCoordinationService:
    return CareCoordinationService()

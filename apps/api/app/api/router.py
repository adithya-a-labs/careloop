from fastapi import APIRouter

from app.api.routes import care_events, circles, handoffs, memories, tasks, voice, wellbeing

api_router = APIRouter()
for router in (
    circles.router,
    care_events.router,
    tasks.router,
    handoffs.router,
    memories.router,
    wellbeing.router,
    voice.router,
):
    api_router.include_router(router)

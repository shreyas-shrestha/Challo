from .schemas import GroupRequest, PlanResponse
from .agents import ListenerAgent, PlannerAgent, WriterAgent

listener = ListenerAgent()
planner  = PlannerAgent()
writer   = WriterAgent()

def plan(req: GroupRequest) -> PlanResponse:
    action_log = []

    l_out = listener.run(req.query_text)
    action_log.append("Listener: parsed vibes/time/budget")

    p_out = planner.run(
        req.user_ids,
        l_out,
        req.location_hint or "Boston, MA",
        req.time_window
    )
    action_log.append("Planner: merged tastes & fetched activities")

    cards = writer.run(p_out)
    action_log.append(f"Writer: scored {len(cards)} candidates")

    merged_vibe = p_out["merged"].get("vibe", "chill")
    energy_profile = p_out["merged"].get("energy_level", "medium")
    return PlanResponse(
        query_normalized=req.query_text.strip(),
        merged_vibe=merged_vibe,
        energy_profile=energy_profile,
        candidates=cards,
        action_log=action_log
    )

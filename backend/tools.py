# These are the callable “functions” the LLM will use.
# In dev, they can return mock data; Friend 2 will later wire real APIs.

from typing import List, Dict, Any
from backend.schemas import UserTaste, PlanCard

# === Data-access contracts Friend 2 will implement for real ===
def tool_get_user_taste(user_id: str) -> UserTaste:
    # TODO: replace with Supabase fetch
    MOCK = {
        "u1": UserTaste(
            user_id="u1",
            likes=["live music", "coffee tastings", "gallery pop-ups"],
            vibes=["music", "creative", "social"],
            budget_max=25,
            distance_km_max=4,
            tags=["indoor", "night"],
        ),
        "u2": UserTaste(
            user_id="u2",
            likes=["sunset walks", "outdoor markets", "kayaking"],
            vibes=["outdoors", "adventure", "chill"],
            budget_max=10,
            distance_km_max=6,
            tags=["free", "daytime"],
        ),
        "u3": UserTaste(
            user_id="u3",
            likes=["board games", "indie films", "tea houses"],
            vibes=["quiet", "nerdy", "mindful"],
            budget_max=15,
            distance_km_max=3,
            tags=["indoor", "cozy"],
        ),
    }
    return MOCK.get(user_id, UserTaste(user_id=user_id))

def tool_merge_tastes(tastes: List[UserTaste]) -> Dict[str, Any]:
    # naive weighted union for hackathon speed
    from collections import Counter
    vibes = Counter(v for t in tastes for v in t.vibes).most_common()
    merged_vibe = (vibes[0][0] if vibes else "chill")
    budget = min([t.budget_max for t in tastes if t.budget_max is not None] or [None]) or None
    distance = min([t.distance_km_max for t in tastes if t.distance_km_max is not None] or [None]) or None
    likes = list({l for t in tastes for l in t.likes})
    tags = list({tg for t in tastes for tg in t.tags})
    return {"merged_vibe": merged_vibe, "budget_cap": budget, "distance_cap": distance, "likes": likes, "tags": tags}

def tool_find_activities(query: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Input keys (example): {
      "location": "Cambridge, MA", "vibe": "outdoors", "budget_cap": 20,
      "time_window": "today 4-8pm", "likes": ["sunset","live music"], "tags":["free"]
    }
    Return raw candidates; Writer will turn into PlanCard.
    """
    # TODO: swap for Google Places / Eventbrite / Meetup
    return [
        {
            "title": "Sunset Kayak Meetup",
            "vibe": "adventure",
            "price": "$",
            "address": "Charles River Canoe & Kayak, Cambridge",
            "lat": 42.372,
            "lng": -71.118,
            "distance_km": 2.4,
            "booking_url": "https://paddleboston.com/events",
            "source": "cached",
            "tags": ["sunset", "outdoors", "group"],
        },
        {
            "title": "Indie Film + Tea Night",
            "vibe": "mindful",
            "price": "$",
            "address": "Somerville Theatre Microcinema",
            "lat": 42.381,
            "lng": -71.100,
            "distance_km": 4.1,
            "booking_url": "https://somervilletheatre.com",
            "source": "cached",
            "tags": ["indie", "indoor", "cozy"],
        },
        {
            "title": "Riverside Jazz Picnic",
            "vibe": "music",
            "price": "free",
            "address": "Memorial Drive Riverbend Park",
            "lat": 42.366,
            "lng": -71.114,
            "distance_km": 1.9,
            "booking_url": "https://www.cambridgema.gov",
            "source": "cached",
            "tags": ["live music", "outdoors", "picnic"],
        },
        {
            "title": "Maker's Market Crawl",
            "vibe": "creative",
            "price": "free",
            "address": "Bow Market, Somerville",
            "lat": 42.382,
            "lng": -71.099,
            "distance_km": 3.6,
            "booking_url": "https://www.bowmarketsomerville.com",
            "source": "cached",
            "tags": ["market", "art", "local"],
        },
        {
            "title": "Dance-In-The-Dark Silent Disco",
            "vibe": "party",
            "price": "$$",
            "address": "Underground at Ink Block, Boston",
            "lat": 42.347,
            "lng": -71.060,
            "distance_km": 5.2,
            "booking_url": "https://www.eventbrite.com/o/silent-disco-boston-123456789",
            "source": "cached",
            "tags": ["night", "dance", "social"],
        },
    ]

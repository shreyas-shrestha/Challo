import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EventItem, fetchEvents, fetchPlan } from "./lib/api";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

type PlanCard = {
  title: string;
  subtitle?: string | null;
  time?: string | null;
  price?: string | null;
  vibe?: string | null;
  energy?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | null;
  booking_url?: string | null;
  maps_url?: string | null;
  summary?: string | null;
  group_score: number;
  reasons: string[];
  source: string;
};

type PlanResponse = {
  query_normalized: string;
  merged_vibe?: string | null;
  energy_profile?: string | null;
  candidates: PlanCard[];
  action_log: string[];
};

const FRIENDS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alex",
    tags: ["music", "creative", "night"],
    defaultLikes: "live music, coffee tastings",
    defaultVibes: "music, creative",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Jade",
    tags: ["outdoors", "budget", "daytime"],
    defaultLikes: "outdoor markets, kayaking",
    defaultVibes: "outdoors, adventure",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Max",
    tags: ["cozy", "games", "mindful"],
    defaultLikes: "board games, tea houses",
    defaultVibes: "quiet, mindful",
  },
];

type FriendInputState = {
  likes: string;
  vibes: string;
  tags: string;
  budget: string;
  distance: string;
};

type EventProviderOption = "all" | "eventbrite" | "google_places";

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function App() {
  const [query, setQuery] = useState(
    "We’re bored, under $20, want something outdoorsy with music near Cambridge after 5pm."
  );
  const [locationHint, setLocationHint] = useState("Cambridge, MA");
  const [timeWindow, setTimeWindow] = useState("Today 5-9pm");
  const [vibeHint, setVibeHint] = useState("music");
  const [budgetCap, setBudgetCap] = useState<string>("20");
  const [distanceKm, setDistanceKm] = useState<string>("5");
  const [customLikes, setCustomLikes] = useState("live music, sunset picnic");
  const [customTags, setCustomTags] = useState("outdoor, group, evening");
  const [selectedFriends, setSelectedFriends] = useState<string[]>(FRIENDS.slice(0, 2).map((f) => f.id));
  const [friendInputs, setFriendInputs] = useState<Record<string, FriendInputState>>(() => {
    const entries = FRIENDS.map((friend) => [
      friend.id,
      {
        likes: friend.defaultLikes ?? "",
        vibes: friend.defaultVibes ?? "",
        tags: friend.tags.join(", "),
        budget: "",
        distance: "",
      },
    ]);
    return Object.fromEntries(entries);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [lastContext, setLastContext] = useState<{
    location: string;
    time: string;
    vibeHint?: string;
    budget?: number;
    distance?: number;
    likes: string[];
    tags: string[];
  } | null>(null);

  const [eventQuery, setEventQuery] = useState("live music");
  const [eventLocation, setEventLocation] = useState("Cambridge, MA");
  const [eventVibeFilter, setEventVibeFilter] = useState("music");
  const [eventProvider, setEventProvider] = useState<EventProviderOption>("all");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const hasMapboxToken = Boolean(MAPBOX_TOKEN);

  const vibePalette = useMemo(() => {
    return {
      chill: "#b5c0d0",
      outdoors: "#6fc495",
      social: "#f6ad55",
      artsy: "#d6bcfa",
      nerdy: "#63b3ed",
      romantic: "#f687b3",
      active: "#f6e05e",
      quiet: "#a0aec0",
      creative: "#fbd38d",
      music: "#f687b3",
      adventure: "#68d391",
      mindful: "#9ae6b4",
      party: "#f56565",
      sports: "#60a5fa",
    } as Record<string, string>;
  }, []);

  const performEventSearch = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const likesArray = splitList(customLikes);
      const tagsArray = splitList(customTags);
      const data = await fetchEvents({
        q: eventQuery || undefined,
        location: eventLocation || undefined,
        vibe: eventVibeFilter || undefined,
        provider: eventProvider === "all" ? undefined : eventProvider,
        likes: likesArray,
        tags: tagsArray,
        limit: 20,
      });
      setEvents(data);
      if (data.length > 0) {
        setActiveEventId(data[0].id);
      } else {
        setActiveEventId(null);
      }
    } catch (err) {
      setEvents([]);
      setActiveEventId(null);
      setEventsError(err instanceof Error ? err.message : "Failed to fetch events.");
    } finally {
      setEventsLoading(false);
    }
  }, [customLikes, customTags, eventLocation, eventProvider, eventQuery, eventVibeFilter]);

  useEffect(() => {
    void performEventSearch();
  }, [performEventSearch]);

  useEffect(() => {
    if (!hasMapboxToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-71.0589, 42.3601],
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    const handleClick = () => setActiveEventId(null);
    map.on("click", handleClick);

    mapRef.current = map;

    return () => {
      map.off("click", handleClick);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [hasMapboxToken]);

  useEffect(() => {
    if (!mapRef.current || !hasMapboxToken) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (events.length === 0) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    events.forEach((event) => {
      if (typeof event.lng !== "number" || typeof event.lat !== "number") {
        return;
      }

      const marker = new mapboxgl.Marker({
        color: event.source === "eventbrite" ? "#f97316" : "#38bdf8",
      })
        .setLngLat([event.lng, event.lat])
        .addTo(mapRef.current!);

      marker.getElement().addEventListener("click", () => {
        setActiveEventId(event.id);
      });

      markersRef.current.push(marker);
      bounds.extend([event.lng, event.lat]);
    });

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
    }
  }, [events, hasMapboxToken]);

  useEffect(() => {
    if (!mapRef.current || !hasMapboxToken) {
      return;
    }

    popupRef.current?.remove();
    popupRef.current = null;

    if (!activeEventId) {
      return;
    }

    const event = events.find((item) => item.id === activeEventId);
    if (!event || typeof event.lng !== "number" || typeof event.lat !== "number") {
      return;
    }

    const html = `
      <div class="map-popup">
        <strong>${event.title}</strong>
        ${event.venue ? `<p>${event.venue}</p>` : ""}
        ${
          event.booking_url
            ? `<a href="${event.booking_url}" target="_blank" rel="noreferrer">Event Link</a>`
            : ""
        }
        ${
          event.maps_url
            ? `<a href="${event.maps_url}" target="_blank" rel="noreferrer">Directions</a>`
            : ""
        }
      </div>
    `;

    popupRef.current = new mapboxgl.Popup({ closeOnClick: true, maxWidth: "260px" })
      .setLngLat([event.lng, event.lat])
      .setHTML(html)
      .addTo(mapRef.current);

    mapRef.current.easeTo({ center: [event.lng, event.lat], zoom: 13, duration: 600 });
  }, [activeEventId, events, hasMapboxToken]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLastContext(null);

    try {
      const likesArray = splitList(customLikes);
      const tagsArray = splitList(customTags);

      const friendOverrides = selectedFriends.map((id) => {
        const inputs = friendInputs[id] || {
          likes: "",
          vibes: "",
          tags: "",
          budget: "",
          distance: "",
        };
        return {
          user_id: id,
          display_name: FRIENDS.find((f) => f.id === id)?.name,
          likes: splitList(inputs.likes),
          vibes: splitList(inputs.vibes),
          tags: splitList(inputs.tags),
          budget_max: inputs.budget ? Number(inputs.budget) : undefined,
          distance_km_max: inputs.distance ? Number(inputs.distance) : undefined,
        };
      });

      const data = await fetchPlan({
        query_text: query,
        user_ids: selectedFriends,
        location_hint: locationHint,
        time_window: timeWindow,
        vibe_hint: vibeHint || undefined,
        budget_cap: budgetCap ? Number(budgetCap) : undefined,
        distance_km: distanceKm ? Number(distanceKm) : undefined,
        custom_likes: likesArray,
        custom_tags: tagsArray,
        friend_overrides: friendOverrides,
      });
      setResult(data);
      setLastContext({
        location: locationHint,
        time: timeWindow,
        vibeHint: vibeHint || undefined,
        budget: budgetCap ? Number(budgetCap) : undefined,
        distance: distanceKm ? Number(distanceKm) : undefined,
        likes: likesArray,
        tags: tagsArray,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch plan.");
    } finally {
      setLoading(false);
    }
  }

  function toggleFriend(id: string) {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  function handleEventSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void performEventSearch();
  }

  function handleEventCardClick(event: EventItem) {
    setActiveEventId(event.id);
    if (mapRef.current && typeof event.lng === "number" && typeof event.lat === "number") {
      mapRef.current.easeTo({ center: [event.lng, event.lat], zoom: 13, duration: 600 });
    }
  }

  return (
    <div className="map-first-shell">
      <div className="map-surface">
        {hasMapboxToken ? (
          <div ref={mapContainerRef} className="mapbox-view" />
        ) : (
          <div className="map-fallback">
            <div className="map-fallback__card">
              <h2>Add your Mapbox token</h2>
              <p>
                Set <code>VITE_MAPBOX_ACCESS_TOKEN</code> to unlock the live map. You can still see
                events in the panel.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="ui-overlay">
        <div className="control-panel">
          <header className="control-panel__header">
            <span className="brand">Vivi</span>
            <p className="hint">Drop a mood, and Vivi will surface aligned events instantly.</p>
          </header>

          <form className="control-panel__form" onSubmit={onSubmit}>
            <label>
              Prompt
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={2}
                placeholder="Tonight we're broke but want outdoorsy music near Cambridge."
              />
            </label>

            <div className="control-panel__row">
              <label>
                Location
                <input
                  value={locationHint}
                  onChange={(e) => setLocationHint(e.target.value)}
                  placeholder="Cambridge, MA"
                />
              </label>
              <label>
                Time
                <input
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                  placeholder="Tonight 5-9pm"
                />
              </label>
            </div>

            <div className="control-panel__row">
              <label>
                Interests
                <input
                  value={customLikes}
                  onChange={(e) => setCustomLikes(e.target.value)}
                  placeholder="live music, sunset picnic"
                />
              </label>
              <label>
                Tags
                <input
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  placeholder="outdoor, group, evening"
                />
              </label>
            </div>

            <div className="control-panel__row">
              <label>
                Vibe
                <input
                  value={vibeHint}
                  onChange={(e) => setVibeHint(e.target.value)}
                  placeholder="music"
                />
              </label>
              <label>
                Budget $
                <input
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(e.target.value)}
                  type="number"
                  min="0"
                />
              </label>
              <label>
                Radius km
                <input
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  type="number"
                  min="0"
                />
              </label>
            </div>

            <details className="advanced">
              <summary>Friends & providers</summary>
              <fieldset className="friends">
                <div className="chips">
                  {FRIENDS.map((friend) => {
                    const active = selectedFriends.includes(friend.id);
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        className={`chip ${active ? "chip--active" : ""}`}
                        onClick={() => toggleFriend(friend.id)}
                      >
                        <span>{friend.name}</span>
                        <small>{friend.tags.join(" · ")}</small>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              {selectedFriends.map((friendId) => {
                const friend = FRIENDS.find((f) => f.id === friendId);
                const inputs = friendInputs[friendId] || {
                  likes: "",
                  vibes: "",
                  tags: "",
                  budget: "",
                  distance: "",
                };
                return (
                  <div key={friendId} className="friend-overrides">
                    <header>
                      <h3>{friend?.name ?? friendId}</h3>
                      <span>{friend?.tags.join(" / ")}</span>
                    </header>
                    <div className="control-panel__row">
                      <label>
                        Likes
                        <input
                          value={inputs.likes}
                          onChange={(e) =>
                            setFriendInputs((prev) => ({
                              ...prev,
                              [friendId]: { ...inputs, likes: e.target.value },
                            }))
                          }
                          placeholder="live music"
                        />
                      </label>
                      <label>
                        Vibes
                        <input
                          value={inputs.vibes}
                          onChange={(e) =>
                            setFriendInputs((prev) => ({
                              ...prev,
                              [friendId]: { ...inputs, vibes: e.target.value },
                            }))
                          }
                          placeholder="creative"
                        />
                      </label>
                    </div>
                    <div className="control-panel__row">
                      <label>
                        Tags
                        <input
                          value={inputs.tags}
                          onChange={(e) =>
                            setFriendInputs((prev) => ({
                              ...prev,
                              [friendId]: { ...inputs, tags: e.target.value },
                            }))
                          }
                          placeholder="outdoor"
                        />
                      </label>
                      <label>
                        Budget $
                        <input
                          type="number"
                          min="0"
                          value={inputs.budget}
                          onChange={(e) =>
                            setFriendInputs((prev) => ({
                              ...prev,
                              [friendId]: { ...inputs, budget: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Radius km
                        <input
                          type="number"
                          min="0"
                          value={inputs.distance}
                          onChange={(e) =>
                            setFriendInputs((prev) => ({
                              ...prev,
                              [friendId]: { ...inputs, distance: e.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                );
              })}

              <label>
                Provider
                <select
                  value={eventProvider}
                  onChange={(e) => setEventProvider(e.target.value as EventProviderOption)}
                >
                  <option value="all">Eventbrite + Google Places</option>
                  <option value="eventbrite">Eventbrite only</option>
                  <option value="google_places">Google Places only</option>
                </select>
              </label>
            </details>

            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Finding matches..." : "Generate plan"}
            </button>

            {error && <div className="inline-error">{error}</div>}
          </form>

          <div className="panel-output">
            {loading && <p className="placeholder">Synthesizing picks...</p>}
            {!loading && !result && !error && (
              <p className="placeholder">Enter a mood + interests to see events on the map.</p>
            )}
            {result && (
              <div className="plan-stack">
                <header>
                  <h2>{result.query_normalized}</h2>
                  {(result.merged_vibe || result.energy_profile) && (
                    <div className="tag-row">
                      {result.merged_vibe && <span className="badge">{result.merged_vibe}</span>}
                      {result.energy_profile && (
                        <span className="badge badge--muted">{result.energy_profile}</span>
                      )}
                    </div>
                  )}
                </header>
                <div className="candidate-list">
                  {result.candidates.length === 0 && (
                    <p className="placeholder">
                      No live matches yet. Try widening the radius or adjusting keywords.
                    </p>
                  )}
                  {result.candidates.map((card) => (
                    <article key={card.title} className="candidate-card">
                      <div>
                        <h3>{card.title}</h3>
                        {card.address && <span className="candidate-card__address">{card.address}</span>}
                      </div>
                      <div className="candidate-card__meta">
                        {card.price ? card.price : "Price: —"} ·{" "}
                        {card.distance_km ? `${card.distance_km} km` : "distance unknown"} ·{" "}
                        <span className="source-pill">{card.source}</span>
                      </div>
                      {card.summary && <p className="candidate-card__summary">{card.summary}</p>}
                      <div className="candidate-card__footer">
                        <span className="score">{Math.round(card.group_score * 100)}%</span>
                        <div className="links">
                          {card.booking_url && (
                            <a href={card.booking_url} target="_blank" rel="noreferrer">
                              Event
                            </a>
                          )}
                          {card.maps_url && (
                            <a href={card.maps_url} target="_blank" rel="noreferrer">
                              Map
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="event-tray">
          <form className="event-form" onSubmit={handleEventSearchSubmit}>
            <input
              value={eventQuery}
              onChange={(e) => setEventQuery(e.target.value)}
              placeholder="Keyword"
            />
            <input
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="Location"
            />
            <input
              value={eventVibeFilter}
              onChange={(e) => setEventVibeFilter(e.target.value)}
              placeholder="Vibe"
            />
            <button type="submit" disabled={eventsLoading}>
              {eventsLoading ? "..." : "Refresh"}
            </button>
          </form>

          <div className="event-tray__list">
            {eventsError && <div className="inline-error">{eventsError}</div>}
            {!eventsError && eventsLoading && <p className="placeholder">Loading events...</p>}
            {!eventsError && !eventsLoading && events.length === 0 && (
              <p className="placeholder">No events matched. Try new keywords.</p>
            )}
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                className={`event-pill ${activeEventId === event.id ? "event-pill--active" : ""}`}
                onClick={() => handleEventCardClick(event)}
              >
                <span className="event-pill__title">{event.title}</span>
                <span className="event-pill__meta">
                  {event.venue ?? event.address ?? "TBA"} · {event.price ?? "—"}
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}


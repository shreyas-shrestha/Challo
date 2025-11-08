import { FormEvent, useMemo, useState } from "react";
import { fetchPlan } from "./lib/api";

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
  { id: "u1", name: "Abhiram", tags: ["music", "creative", "night"] },
  { id: "u2", name: "Nina", tags: ["outdoors", "budget", "daytime"] },
  { id: "u3", name: "Kai", tags: ["cozy", "games", "mindful"] },
  { id: "u4", name: "Sam", tags: ["party", "dance", "late-night"] },
];

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
  const [selectedFriends, setSelectedFriends] = useState<string[]>(["u1", "u2", "u3"]);
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLastContext(null);

    try {
      const likesArray = customLikes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const tagsArray = customTags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

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

  return (
    <div className="app-shell">
      <header>
        <span className="brand">Vivi</span>
        <p className="tagline">
          The agentic social activity network. You bring the vibe. Your friends bring the time. AI
          orchestrates the plan.
        </p>
      </header>

      <main>
        <section className="planner-panel">
          <form onSubmit={onSubmit}>
            <label>
              Mood Input
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What's the vibe?"
                rows={4}
              />
            </label>

            <div className="inputs-grid">
              <label>
                Where?
                <input
                  value={locationHint}
                  onChange={(e) => setLocationHint(e.target.value)}
                  placeholder="Neighborhood or city"
                />
              </label>
              <label>
                When?
                <input
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                  placeholder="e.g. Tonight 6-9pm"
                />
              </label>
            </div>

            <div className="inputs-grid">
              <label>
                Optional vibe hint
                <input
                  value={vibeHint}
                  onChange={(e) => setVibeHint(e.target.value)}
                  placeholder="music, outdoors, romantic..."
                />
              </label>
              <label>
                Budget cap (USD)
                <input
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="20"
                />
              </label>
              <label>
                Distance max (km)
                <input
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="5"
                />
              </label>
            </div>

            <label>
              Custom likes (comma separated)
              <input
                value={customLikes}
                onChange={(e) => setCustomLikes(e.target.value)}
                placeholder="live music, cafe crawl, art pop-up"
              />
            </label>

            <label>
              Tags or constraints (comma separated)
              <input
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="outdoor, group-friendly, free"
              />
            </label>

            <fieldset className="friends">
              <legend>Tag friends to merge their vibes</legend>
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

            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Orchestrating..." : "Spin up a plan"}
            </button>
          </form>
          <aside className="concept">
            <h2>Agent Graph</h2>
            <p>
              Vivi listens to your mood, retrieves everyone’s preferences, merges the vibes, scouts
              the city, and drafts a ready-to-book plan card — all in seconds.
            </p>
            <ul>
              <li>
                <strong>Listener</strong> parses emotion + intent.
              </li>
              <li>
                <strong>Profile</strong> maps taste graphs.
              </li>
              <li>
                <strong>Merge</strong> finds the overlap.
              </li>
              <li>
                <strong>Explorer</strong> combs APIs for matches.
              </li>
              <li>
                <strong>Writer</strong> crafts vibe cards.
              </li>
              <li>
                <strong>Scheduler</strong> syncs the squad.
              </li>
            </ul>
          </aside>
        </section>

        <section className="results-panel">
          {error && <div className="error">{error}</div>}
          {!loading && !error && !result && (
            <p className="placeholder">Drop a vibe above to see Vivi’s picks.</p>
          )}

          {loading && <p className="placeholder">Synthesizing mood graph...</p>}

          {result && (
            <>
              <div className="summary">
                <div>
                  <h2>Top Picks for “{result.query_normalized}”</h2>
                  {(result.merged_vibe || result.energy_profile) && (
                    <p>
                      {result.merged_vibe && (
                        <>
                          Shared vibe: <span className="badge">{result.merged_vibe}</span>{" "}
                        </>
                      )}
                      {result.energy_profile && (
                        <>
                          Energy:{" "}
                          <span className="badge badge--muted">{result.energy_profile}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <div className="log">
                  {result.action_log.map((entry, idx) => (
                    <span key={idx}>{entry}</span>
                  ))}
                </div>
              </div>
              {result.candidates.length === 0 && (
                <div className="empty-state">
                  <h3>No live matches yet</h3>
                  <p>
                    Vivi called Google Places and Eventbrite but they didn't return any hits for the
                    current settings. Try widening the distance, budget, or tweak the vibe keywords.
                  </p>
                </div>
              )}
              {lastContext && (
                <div className="constraints-card">
                  <h3>Planner inputs</h3>
                  <div className="constraint-grid">
                    <span>
                      <strong>Where:</strong> {lastContext.location}
                    </span>
                    <span>
                      <strong>When:</strong> {lastContext.time}
                    </span>
                    {lastContext.vibeHint && (
                      <span>
                        <strong>Vibe hint:</strong> {lastContext.vibeHint}
                      </span>
                    )}
                    {lastContext.budget !== undefined && (
                      <span>
                        <strong>Budget ≤</strong> ${lastContext.budget}
                      </span>
                    )}
                    {lastContext.distance !== undefined && (
                      <span>
                        <strong>Radius ≤</strong> {lastContext.distance} km
                      </span>
                    )}
                    {lastContext.likes.length > 0 && (
                      <span className="list-line">
                        <strong>Likes:</strong> {lastContext.likes.join(", ")}
                      </span>
                    )}
                    {lastContext.tags.length > 0 && (
                      <span className="list-line">
                        <strong>Tags:</strong> {lastContext.tags.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="cards-grid">
                {result.candidates.map((card) => (
                  <article key={card.title} className="plan-card">
                    <header>
                      <div>
                        <h3>{card.title}</h3>
                        {card.address && <p className="address">{card.address}</p>}
                      </div>
                      {card.vibe && (
                        <span
                          className="vibe-pill"
                          style={{
                            backgroundColor:
                              vibePalette[card.vibe.toLowerCase()] ?? "#CBD5F5",
                          }}
                        >
                          {card.vibe}
                        </span>
                      )}
                    </header>
                    <p className="meta">
                      {card.price ? `Price: ${card.price}` : "Price: —"} ·{" "}
                      {card.distance_km ? `${card.distance_km} km` : "distance unknown"} ·{" "}
                      <span className="source-pill">{card.source}</span>
                    </p>
                    {card.energy && <p className="meta">Energy match: {card.energy}</p>}
                    {card.time && <p className="meta">Suggested time: {card.time}</p>}
                    {card.summary && <p className="summary">{card.summary}</p>}
                    <ul className="reason-list">
                      {card.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <footer>
                      <span className="score">Score {Math.round(card.group_score * 100)}%</span>
                      <div className="links">
                        {card.booking_url && (
                          <a href={card.booking_url} target="_blank" rel="noreferrer">
                            Event Link
                          </a>
                        )}
                        {card.maps_url && (
                          <a href={card.maps_url} target="_blank" rel="noreferrer">
                            Map
                          </a>
                        )}
                      </div>
                    </footer>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <footer>
        <p>
          Built for crews who ask “What should we do?” Vivi learns your vibe signatures and keeps the
          energy flowing.
        </p>
      </footer>
    </div>
  );
}


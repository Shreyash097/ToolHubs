import { useEffect, useMemo, useState } from "react";
import ToolCard from "../../Component/Toolcard/Toolcard";
import Icon from "../../Component/Icon/Icon";
import "./HomePage.css";

/**
 * HomePage Component
 * -------------------
 * This component fetches a list of engineering tools from the backend API
 * and displays them in a grid layout using the ToolCard component.
 * Users can search by name / description and filter by category.
 */

function HomePage() {
  // State to store the list of tools fetched from API
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search box text and the selected category chip
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  /**
   * useEffect Hook
   * --------------
   * Runs once when the component mounts.
   * Fetches tools data from the backend API.
   */

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tools`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setTools(data))
      .catch((err) => {
        console.error("Error fetching tools:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Unique, sorted list of categories for the filter chips
  const categories = useMemo(
    () => [...new Set(tools.map((t) => t.category))].sort(),
    [tools]
  );

  // Tools that match both the selected category and the search text
  const visibleTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const inCategory = category === "All" || tool.category === category;
      const matches =
        !q ||
        [tool.name, tool.description, tool.category]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return inCategory && matches;
    });
  }, [tools, query, category]);

  return (
    <div className="homepage">
      {/* Hero with search */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <h1>
            Every engineering tool, <span>in one place</span>
          </h1>
          <p>
            Find the tools we use, open their official sites, and follow
            step-by-step guides to sign up, log in and get started.
          </p>

          <label className="home-search">
            <Icon name="search" size={20} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools, e.g. Docker, Jira, testing"
              aria-label="Search tools"
            />
          </label>
        </div>
      </section>

      <div className="home-content">
        {loading && (
          <div className="tools-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="tool-skeleton" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="home-message">
            <Icon name="alert" size={28} />
            <h2>Couldn't load tools</h2>
            <p>The tools service isn't reachable right now. Please try again in a moment.</p>
            <button type="button" onClick={() => window.location.reload()}>
              <Icon name="refresh" size={16} />
              Try again
            </button>
          </div>
        )}

        {!loading && !error && tools.length === 0 && (
          <div className="home-message">
            <Icon name="info" size={28} />
            <h2>No tools available yet.</h2>
          </div>
        )}

        {!loading && !error && tools.length > 0 && (
          <>
            {/* Category filter */}
            <div className="category-chips" aria-label="Filter by category">
              {["All", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${category === c ? "active" : ""}`}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            {visibleTools.length > 0 ? (
              <>
                <p className="results-count">
                  Showing {visibleTools.length} of {tools.length} tools
                </p>
                <div className="tools-grid">
                  {visibleTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </>
            ) : (
              <div className="home-message">
                <Icon name="search" size={28} />
                <h2>No tools match your search</h2>
                <p>Try a different word or pick another category.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;

import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Icon from "../../Component/Icon/Icon";
import { ToolAvatar } from "../../Component/Toolcard/Toolcard";
import "./ToolDetails.css";

/**
 * ToolDetails Component
 * ----------------------
 * This component displays detailed information about a single tool.
 * It fetches the tool details from the backend using the tool ID
 * obtained from the URL params.
 */

// The four parts of every tool's guide, in reading order
const GUIDE_SECTIONS = [
  { key: "about", title: "About", icon: "info" },
  { key: "signup", title: "How to Sign Up", icon: "userPlus" },
  { key: "login", title: "How to Login", icon: "logIn" },
  { key: "usage", title: "How to Use", icon: "play" },
];

function ToolDetails() {
  // Extract `id` from the URL (React Router)
  const { id } = useParams();

  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);

  const backendBaseURL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  /**
   * useEffect Hook
   * ---------------
   * Fetch tool details whenever the `id` changes.
   */
  useEffect(() => {
    fetch(`${backendBaseURL}/api/tools/${id}`)
      .then((res) => (res.ok ? res.json() : null)) // 404 -> "not found" screen
      .then((data) => {
        setTool(data); // Save tool data in state
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching tool:", err);
        setLoading(false);
      });
  }, [id, backendBaseURL]);

  if (loading) {
    return (
      <div className="td-page">
        <div className="td-skeleton" />
        <div className="td-skeleton short" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="td-page">
        <div className="td-not-found">
          <Icon name="alert" size={30} />
          <h2>Tool Not Found</h2>
          <p>The signup guide for this tool is not available yet.</p>
          <Link to="/" className="td-btn primary">
            <Icon name="arrowLeft" size={16} />
            Back to all tools
          </Link>
        </div>
      </div>
    );
  }

  const hasCompanyDoc =
    tool.companyDocument && tool.companyDocument.trim() !== "";

  return (
    <div className="td-page">
      <Link to="/" className="td-back">
        <Icon name="arrowLeft" size={16} />
        All tools
      </Link>

      {/* Header card */}
      <header className="td-hero">
        <ToolAvatar name={tool.name} size="lg" />
        <div className="td-hero-text">
          <span className="td-category">{tool.category}</span>
          <h1 className="tool-title">{tool.name}</h1>
          <p className="td-description">{tool.description}</p>

          <div className="td-actions">
            <a
              href={tool.officialLink}
              target="_blank"
              rel="noreferrer"
              className="td-btn primary"
            >
              Visit Official Site
              <Icon name="external" size={16} />
            </a>

            {hasCompanyDoc && (
              <a
                href={tool.companyDocument}
                target="_blank"
                rel="noreferrer"
                className="td-btn secondary"
              >
                <Icon name="file" size={16} />
                View Company Document
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Company document not uploaded yet */}
      {!hasCompanyDoc && (
        <p className="doc-message">
          <Icon name="info" size={18} />
          The company document is being prepared and will be uploaded soon.
          Stay tuned!
        </p>
      )}

      {/* Signup guide */}
      <h2 className="td-guide-title">Signup Guide</h2>
      <div className="signup-guide">
        {GUIDE_SECTIONS.map((section, index) => (
          <section key={section.key} className="guide-card">
            <div className="guide-card-head">
              <span className="guide-icon">
                <Icon name={section.icon} size={18} />
              </span>
              <span className="guide-step">Step {index + 1}</span>
              <h3>{section.title}</h3>
            </div>
            <p>{tool.guide?.[section.key] || "No details available yet."}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export default ToolDetails;

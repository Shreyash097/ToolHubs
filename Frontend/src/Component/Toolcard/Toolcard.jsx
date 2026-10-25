import { Link } from "react-router-dom";
import Icon from "../Icon/Icon";
import "./Toolcard.css";

// Background / text colour pairs for the letter avatars
const AVATAR_COLORS = [
  ["#dbeafe", "#1e40af"],
  ["#ede9fe", "#5b21b6"],
  ["#dcfce7", "#166534"],
  ["#fef3c7", "#92400e"],
  ["#fce7f3", "#9d174d"],
  ["#cffafe", "#155e75"],
  ["#fee2e2", "#991b1b"],
  ["#e0e7ff", "#3730a3"],
];

/**
 * ToolAvatar Component
 * --------------------
 * Coloured square with the tool's first letter. The colour is picked from
 * the name, so the same tool always gets the same colour.
 */
export function ToolAvatar({ name = "", size = "md" }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const [bg, fg] = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  return (
    <span
      className={`tool-avatar tool-avatar-${size}`}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function ToolCard({ tool }) {
  return (
    <div className="tool-card">
      <div className="tool-card-head">
        <ToolAvatar name={tool.name} />
        <div>
          <h3 className="tool-card-title">{tool.name}</h3>
          <span className="tool-card-category">{tool.category}</span>
        </div>
      </div>

      <p className="tool-card-description">{tool.description}</p>

      <div className="tool-card-buttons">
        <Link to={`/tools/${tool.id}`} className="tool-card-btn primary">
          Signup Guide
          <Icon name="arrowRight" size={16} />
        </Link>

        <a
          href={tool.officialLink}
          target="_blank"
          rel="noreferrer"
          className="tool-card-btn secondary"
        >
          Official Link
          <Icon name="external" size={15} />
        </a>
      </div>
    </div>
  );
}

export default ToolCard;

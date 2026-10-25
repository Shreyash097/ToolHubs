import { Link, NavLink } from "react-router-dom";
import Icon from "../Icon/Icon";
import { PROFILE } from "../../profile";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo-mark">
            <Icon name="wikiMark" size={20} />
          </span>
          <span className="navbar-brand-text">Engineering Wiki</span>
        </Link>

        {/* NavLink adds an "active" class to the link for the current page */}
        <ul className="navbar-links">
          <li>
            <NavLink to="/" end>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/contact">Contact</NavLink>
          </li>
          <li>
            <a href={PROFILE.portfolio} target="_blank" rel="noreferrer">
              Portfolio
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;

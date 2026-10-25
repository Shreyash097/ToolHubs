import { useState } from "react";
import Icon from "../../Component/Icon/Icon";
import { PROFILE, gmailComposeUrl } from "../../profile";
import "./ContactPage.css";

/**
 * ContactPage Component
 * ---------------------
 * Personal contact details, plus a section for website enquiries
 * (custom-coded and WordPress) with a recent project as a sample.
 */

const [EMAIL_USER, EMAIL_DOMAIN] = PROFILE.email.split("@");

const CONTACT_DETAILS = [
  {
    label: "Location",
    value: PROFILE.location,
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PROFILE.location)}`,
    icon: "location",
    external: true,
  },
  {
    label: "Phone",
    value: PROFILE.phoneDisplay,
    href: `tel:${PROFILE.phone}`,
    icon: "phone",
  },
  {
    label: "Email",
    // <wbr /> lets a narrow card wrap the address before "@", not mid-word
    value: (
      <>
        {EMAIL_USER}
        <wbr />@{EMAIL_DOMAIN}
      </>
    ),
    href: gmailComposeUrl(),
    icon: "mail",
    external: true,
  },
  {
    label: "Portfolio",
    value: new URL(PROFILE.portfolio).hostname,
    href: PROFILE.portfolio,
    icon: "globe",
    external: true,
  },
];

const SERVICES = [
  {
    title: "Custom-coded websites",
    icon: "code",
    text: "Built from scratch with React and Node.js, so every page and feature works exactly the way you want.",
    points: ["Custom design and features", "Web apps, dashboards and APIs", "Fast and responsive"],
  },
  {
    title: "WordPress websites",
    icon: "layout",
    text: "Easy to manage on your own. Update pages and content any time without touching code.",
    points: ["Business sites and blogs", "Simple editing after launch", "Responsive on every device"],
  },
];

function ContactPage() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy email:", err);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        {/* Intro */}
        <header className="contact-hero">
          <span className="contact-eyebrow">Contact</span>
          <h1>Let's work together</h1>
          <p>
            Hi, I'm {PROFILE.name}. Have a question about this project, or
            need a website built? Reach out and I'll get back to you.
          </p>
        </header>

        {/* Contact details */}
        <section className="contact-grid" aria-label="Contact details">
          {CONTACT_DETAILS.map((item) => (
            <a
              key={item.label}
              className="contact-card"
              href={item.href}
              {...(item.external && { target: "_blank", rel: "noreferrer" })}
            >
              <span className="contact-icon">
                <Icon name={item.icon} />
              </span>
              <span className="contact-label">{item.label}</span>
              <span className="contact-value">{item.value}</span>
            </a>
          ))}
        </section>

        {/* Website enquiries */}
        <section className="website-cta" aria-labelledby="website-cta-title">
          <div className="website-cta-head">
            <h2 id="website-cta-title">Need a website?</h2>
            <p>
              I build websites both ways: fully custom-coded, or on WordPress.
              Tell me what you need and I'll suggest the right fit.
            </p>
          </div>

          <div className="service-grid">
            {SERVICES.map((service) => (
              <div key={service.title} className="service-card">
                <span className="service-icon">
                  <Icon name={service.icon} size={22} />
                </span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <ul>
                  {service.points.map((point) => (
                    <li key={point}>
                      <Icon name="check" size={16} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="recent-work">
            <div>
              <span className="recent-label">Recent WordPress project</span>
              <strong className="recent-name">oraganospoon.com</strong>
              <p>A WordPress website I recently built for a company.</p>
            </div>
            <a
              className="contact-btn contact-btn-light"
              href="https://oraganospoon.com/"
              target="_blank"
              rel="noreferrer"
            >
              Visit site
              <Icon name="external" size={16} />
            </a>
          </div>

          <div className="cta-actions">
            {/* Gmail compose works even without a desktop mail app */}
            <a
              className="contact-btn contact-btn-primary"
              href={gmailComposeUrl("Website enquiry")}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="mail" size={18} />
              Email me about a website
            </a>
            <a className="contact-btn contact-btn-outline" href={`tel:${PROFILE.phone}`}>
              <Icon name="phone" size={18} />
              Call {PROFILE.phoneDisplay}
            </a>
            <button
              type="button"
              className="contact-btn contact-btn-ghost"
              onClick={copyEmail}
            >
              <Icon name={copied ? "check" : "copy"} size={18} />
              {copied ? "Email copied!" : "Copy email"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ContactPage;

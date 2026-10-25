/**
 * Personal details shown on the Contact page and in the footer.
 * Change them here and every page picks up the new values.
 */
export const PROFILE = {
  name: "Shreyash Pandey",
  location: "Noida, India",
  phoneDisplay: "+91 88879 84720",
  phone: "+918887984720",
  email: "pandeyshreyash790@gmail.com",
  portfolio: "https://shreyashpandey-portfolio.vercel.app/",
};

/**
 * Link that opens Gmail's "new message" window in a browser tab.
 * A plain mailto: link does nothing when no desktop mail app is set up,
 * which is common for people who use Gmail in the browser.
 */
export function gmailComposeUrl(subject = "") {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: PROFILE.email,
    su: subject,
  });
  return `https://mail.google.com/mail/?${params}`;
}

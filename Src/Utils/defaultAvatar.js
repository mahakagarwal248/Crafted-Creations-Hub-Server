/**
 * Stored as a static base64 data URL so no static asset hosting is needed.
 * Neutral gray bust silhouette on round background; matches catalogue dark theme.
 */
export const DEFAULT_REVIEW_AVATAR =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <circle cx="32" cy="32" r="32" fill="#d8d8df"/>
      <circle cx="32" cy="25" r="11" fill="#9a9aa6"/>
      <path d="M10 56c2.5-11 12-17 22-17s19.5 6 22 17z" fill="#9a9aa6"/>
    </svg>`
  ).toString("base64");

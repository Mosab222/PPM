// Shared between the admin and technician sidebars so collapsing one keeps
// the other collapsed too — it's one "nav preference," not a per-section one.
// A cookie (rather than localStorage) is used so the server layout can read
// it during SSR and render the correct width on first paint, with no flash.
export const SIDEBAR_COLLAPSE_COOKIE = "sidebar_collapsed";

export function setSidebarCollapsedCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
}

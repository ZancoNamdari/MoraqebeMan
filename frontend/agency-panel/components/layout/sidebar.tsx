// This component previously rendered the old, wide (w-64) text-based
// sidebar for agency-panel. It's been replaced by the new icon rail
// (components/layout/icon-rail.tsx), rendered once in the shared
// (panel)/layout.tsx — not per page.
//
// Deliberately kept here as a no-op (same prop signature, renders
// nothing) rather than deleted outright: several pages haven't been
// migrated to the new (panel) route group yet and still call
// <Sidebar onLogout={...} isOwner={...} /> inline. Deleting this
// file outright would break those pages' builds entirely; leaving it
// as a no-op means they keep compiling and simply show no sidebar of
// their own (relying on the new one from the shared layout, once
// they're moved into the (panel) group) instead of showing two
// inconsistent sidebars at once — which is the actual bug being
// fixed here. Once every page is migrated, this file can be deleted
// for real, along with the import lines that reference it.
export function Sidebar(_props: { onLogout: () => void; isOwner: boolean }) {
  return null
}

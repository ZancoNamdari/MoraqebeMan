import type { NextConfig } from "next"

// Empty by default (root-mounted, matching every panel's current
// IP-test port-based setup). Set NEXT_PUBLIC_BASE_PATH at build time
// (e.g. "/supervisor") to mount this app under a path prefix instead
// — the actual path-based-routing-on-one-IP setup this panel now
// needs. Read from the same NEXT_PUBLIC_ variable api.ts uses for its
// own 401-redirect logic, so the two can never drift out of sync.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  basePath,
}

export default nextConfig

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@darsh/design"],
  // The QA scripts drive the dev server over 127.0.0.1 rather than localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Next writes AGENTS.md and CLAUDE.md into the app on dev. They are tooling
  // notes for agents, not part of this project, and they must not be published.
  agentRules: false,
};

export default nextConfig;

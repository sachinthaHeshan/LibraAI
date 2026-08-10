import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: trace files from repo root so standalone includes workspace deps.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;

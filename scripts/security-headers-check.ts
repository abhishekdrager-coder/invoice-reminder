import fs from "node:fs";

const middlewarePath = "middleware.ts";
const nextConfigPath = "next.config.ts";

const middleware = fs.readFileSync(middlewarePath, "utf8");
const nextConfig = fs.readFileSync(nextConfigPath, "utf8");

const requiredHeaders = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];

for (const header of requiredHeaders) {
  if (!middleware.includes(header)) {
    throw new Error(`Missing security header configuration: ${header}`);
  }
}

if (!nextConfig.includes("poweredByHeader: false")) {
  throw new Error("Next.js poweredByHeader is not disabled");
}

console.log("Security headers check passed");

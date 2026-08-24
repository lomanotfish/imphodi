type RuntimeEnvironment = "development" | "production" | "test";

function cspForEnvironment(environment: RuntimeEnvironment) {
  const unsafeEval = environment === "development" ? " 'unsafe-eval'" : "";

  return `default-src 'self'; script-src 'self' 'unsafe-inline'${unsafeEval}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;
}

export function securityHeadersForEnvironment(environment: RuntimeEnvironment) {
  return [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
      value: cspForEnvironment(environment),
  },
  ] as const;
}

export const SECURITY_HEADERS = securityHeadersForEnvironment(
  process.env.NODE_ENV,
);

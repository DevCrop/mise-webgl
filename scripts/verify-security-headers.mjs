import process from "node:process";

const REQUIRED_CSP = Object.freeze({
  "base-uri": ["'self'"],
  "connect-src": ["'self'"],
  "default-src": ["'self'"],
  "form-action": ["'none'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "script-src": ["'self'"],
  "style-src": ["'self'"],
});
const FORBIDDEN_CSP_TOKENS = new Set(["'unsafe-eval'", "'unsafe-inline'"]);
const HSTS_MINIMUM_SECONDS = 31_536_000;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  await verifyRemote(args);
}

async function verifyRemote(args) {
  const allowHttpLoopback = args.includes("--allow-http-loopback");
  const target = args.find((value) => !value.startsWith("--"));
  if (!target) throw new Error("Security header verification requires a URL.");
  const url = new URL(target);
  assertTransport(url, allowHttpLoopback);
  const response = await fetch(url, { redirect: "error" });
  assertSecurityResponse(url, response, allowHttpLoopback);
  console.log("SECURITY HEADERS PASS");
}

function assertTransport(url, allowHttpLoopback) {
  if (url.protocol === "https:") return;
  if (
    allowHttpLoopback
    && url.protocol === "http:"
    && LOOPBACK_HOSTS.has(url.hostname)
  ) return;
  throw new Error("Security header verification requires HTTPS.");
}

function assertSecurityResponse(url, response, allowHttpLoopback) {
  if (!response.ok) throw new Error("Security endpoint did not return success.");
  requireHeader(response.headers, "content-type", (value) =>
    value.toLowerCase().startsWith("text/html"));
  requireHeader(response.headers, "cache-control", (value) =>
    value.toLowerCase().includes("no-store"));
  requireHeader(response.headers, "x-content-type-options", (value) =>
    value.toLowerCase() === "nosniff");
  requireHeader(response.headers, "x-frame-options", (value) =>
    value.toUpperCase() === "DENY");
  requireHeader(response.headers, "referrer-policy", (value) =>
    value.toLowerCase() === "strict-origin-when-cross-origin");
  requireHeader(response.headers, "cross-origin-resource-policy", (value) =>
    value.toLowerCase() === "same-origin");
  requireHeader(response.headers, "permissions-policy", hasRestrictedPermissions);
  requireHeader(response.headers, "content-security-policy", hasRequiredCsp);
  if (url.protocol === "https:" || !allowHttpLoopback) {
    requireHeader(response.headers, "strict-transport-security", hasStrongHsts);
  }
}

function requireHeader(headers, name, validate) {
  const value = headers.get(name);
  if (!value || !validate(value)) {
    throw new Error(`Security header is missing or invalid: ${name}.`);
  }
}

function hasRestrictedPermissions(value) {
  const compact = value.replaceAll(/\s/g, "").toLowerCase();
  return ["camera=()", "geolocation=()", "microphone=()"]
    .every((directive) => compact.includes(directive));
}

function hasRequiredCsp(value) {
  const directives = new Map(
    value
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...tokens] = part.split(/\s+/);
        return [name.toLowerCase(), new Set(tokens)];
      }),
  );
  for (const tokens of directives.values()) {
    for (const forbidden of FORBIDDEN_CSP_TOKENS) {
      if (tokens.has(forbidden)) return false;
    }
  }
  return Object.entries(REQUIRED_CSP).every(([name, required]) => {
    const tokens = directives.get(name);
    return tokens && required.every((token) => tokens.has(token));
  });
}

function hasStrongHsts(value) {
  const match = /(?:^|;)\s*max-age=(\d+)(?:;|$)/i.exec(value);
  return match ? Number(match[1]) >= HSTS_MINIMUM_SECONDS : false;
}

function runSelfTest() {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'",
    "content-type": "text/html; charset=UTF-8",
    "cross-origin-resource-policy": "same-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  assertSecurityResponse(
    new URL("https://portfolio.test/"),
    new Response(null, { status: 204, headers }),
    false,
  );
  const unsafe = new Headers(headers);
  unsafe.set("content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'");
  let rejected = false;
  try {
    assertSecurityResponse(
      new URL("https://portfolio.test/"),
      new Response(null, { status: 204, headers: unsafe }),
      false,
    );
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Security header self-test accepted unsafe CSP.");
  console.log("SECURITY HEADERS SELF-TEST PASS");
}

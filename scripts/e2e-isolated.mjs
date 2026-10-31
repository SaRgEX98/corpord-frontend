// An entirely disposable stack. Never reads workspace .env or existing database credentials.
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";

const docker = (...args) =>
  execFileSync("docker", args, { stdio: ["pipe", "pipe", "pipe"] })
    .toString()
    .trim();
const prefix = `corpord-e2e-${randomBytes(4).toString("hex")}`;
const temp = mkdtempSync(join(tmpdir(), "corpord-e2e-"));
const image =
  process.env.CORPORD_E2E_BACKEND_IMAGE ||
  "ghcr.io/sargex98/corpord-backend:dev";
const apiPort = process.env.CORPORD_E2E_API_PORT || "8082";
const webPort = process.env.CORPORD_E2E_WEB_PORT || "3101";
const api = `http://127.0.0.1:${apiPort}/api/v1`;
const web = `http://127.0.0.1:${webPort}`;
const email = `admin-${prefix}@example.test`;
const password = randomBytes(20).toString("hex");
const postgresPassword = randomBytes(20).toString("hex");
const containers = [];
let frontend;
let testProcess;
let networkCreated = false;
let interrupted = 0;
let cleanupPromise;
// Keep shell/tool configuration, but never inherit application runtime configuration.
const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !/^(NUXT_|NITRO_)/.test(key)),
);
async function assertFreePort(port) {
  if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
    throw new Error("Use a test port between 1024 and 65535");
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(new Error(`Test port ${port} is already occupied`)),
    );
    probe.listen(
      { host: "127.0.0.1", port: Number(port), exclusive: true },
      () => probe.close(resolve),
    );
  });
}
async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill("SIGTERM");
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 3000);
    timer.unref();
    child.once("exit", () => clearTimeout(timer));
  });
}
function cleanup() {
  cleanupPromise ??= (async () => {
    await Promise.all([stopChild(testProcess), stopChild(frontend)]);
    for (const id of containers.toReversed()) {
      try {
        docker("rm", "-f", id);
      } catch {}
    }
    if (networkCreated) {
      try {
        docker("network", "rm", prefix);
      } catch {}
    }
    rmSync(temp, { recursive: true, force: true });
  })();
  return cleanupPromise;
}
for (const [signal, code] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  process.once(signal, () => {
    interrupted = code;
    void cleanup().finally(() => process.exit(code));
  });
}

async function waitFor(check, label) {
  const end = Date.now() + 90_000;
  while (Date.now() < end) {
    if (interrupted) throw new Error("Test interrupted");
    try {
      if (await check()) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
function runContainer(name, args) {
  if (interrupted) throw new Error("Test interrupted");
  const fullName = `${prefix}-${name}`;
  const id = docker(
    "run",
    "-d",
    "--name",
    fullName,
    "--network",
    prefix,
    ...args,
  );
  containers.push(id);
}
try {
  if (apiPort === webPort)
    throw new Error("API and frontend test ports must differ");
  await assertFreePort(apiPort);
  await assertFreePort(webPort);
  if (interrupted) throw new Error("Test interrupted");
  docker("network", "create", prefix);
  networkCreated = true;
  runContainer("postgres", [
    "-e",
    `POSTGRES_PASSWORD=${postgresPassword}`,
    "-e",
    "POSTGRES_DB=corpord_e2e",
    "postgres:17-alpine",
  ]);
  runContainer("redis", ["redis:7-alpine"]);
  await waitFor(() => {
    docker("exec", `${prefix}-postgres`, "pg_isready", "-U", "postgres");
    return true;
  }, "PostgreSQL");
  const envPath = join(temp, "backend.env");
  writeFileSync(
    envPath,
    Object.entries({
      APP_ENV: "development",
      DB_POSTGRES_HOST: `${prefix}-postgres`,
      DB_POSTGRES_PORT: "5432",
      DB_POSTGRES_USER: "postgres",
      DB_POSTGRES_PASSWORD: postgresPassword,
      DB_POSTGRES_NAME: "corpord_e2e",
      DB_REDIS_HOST: `${prefix}-redis`,
      DB_REDIS_PORT: "6379",
      JWT_SECRET: randomBytes(32).toString("hex"),
      HTTP_PORT: "8080",
      COOKIE_SECURE: "false",
      FRONTEND_URL: web,
      ALLOWED_ORIGINS: web,
      SSO_GOOGLE_ENABLED: "false",
      SSO_YANDEX_ENABLED: "false",
    })
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  docker(
    "run",
    "--rm",
    "--network",
    prefix,
    "--env-file",
    envPath,
    image,
    "./migrate",
  );
  runContainer("backend", [
    "--env-file",
    envPath,
    "-p",
    `127.0.0.1:${apiPort}:8080`,
    image,
  ]);
  await waitFor(async () => (await fetch(`${api}/bus/`)).ok, "backend");
  const registration = await fetch(`${api}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Administrator", email, password }),
  });
  if (!registration.ok)
    throw new Error(`Test admin registration failed: ${registration.status}`);
  // The API deliberately cannot grant roles. Promote only this disposable test user in the disposable DB.
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      `${prefix}-postgres`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "corpord_e2e",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `UPDATE users SET role_id=(SELECT id FROM roles WHERE name='admin') WHERE email='${email}';`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (interrupted) throw new Error("Test interrupted");
  const adminLogin = await fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!adminLogin.ok) throw new Error("Test admin login failed");
  const { access_token } = await adminLogin.json();
  const profile = await fetch(`${api}/users/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profile.ok || (await profile.json()).role !== "admin")
    throw new Error(
      "Backend /users/me must return persisted admin role; apply backend PR #13 or use CORPORD_E2E_BACKEND_IMAGE with the role fix",
    );
  if (interrupted) throw new Error("Test interrupted");
  console.log("Building production frontend for browser verification…");
  const emptyEnvPath = join(temp, "frontend.env");
  writeFileSync(emptyEnvPath, "", { mode: 0o600 });
  execFileSync(
    process.execPath,
    ["node_modules/nuxt/bin/nuxt.mjs", "build", "--dotenv", emptyEnvPath],
    {
      env: {
        ...childEnv,
        NUXT_PUBLIC_API_BASE: "http://127.0.0.1:9/unused-build-time-api",
        NUXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  frontend = spawn(process.execPath, [".output/server/index.mjs"], {
    env: {
      ...childEnv,
      NUXT_PUBLIC_API_BASE: api,
      NITRO_PORT: webPort,
      NITRO_HOST: "127.0.0.1",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let frontendErrors = "";
  frontend.stderr.on("data", (chunk) => {
    frontendErrors = (frontendErrors + chunk).slice(-4000);
  });
  await waitFor(async () => {
    if (frontend.exitCode !== null) throw new Error("Frontend process exited");
    const response = await fetch(web);
    const html = await response.text();
    return (
      response.ok &&
      html.includes(JSON.stringify(api)) &&
      frontend.exitCode === null
    );
  }, "frontend").catch((error) => {
    throw new Error(`${error.message}\n${frontendErrors}`);
  });
  const executable =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : "");
  if (interrupted) throw new Error("Test interrupted");
  testProcess = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    {
      stdio: "inherit",
      env: {
        ...childEnv,
        CORPORD_E2E_BASE_URL: web,
        CORPORD_E2E_API_URL: api,
        CORPORD_E2E_ADMIN_EMAIL: email,
        CORPORD_E2E_ADMIN_PASSWORD: password,
        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: executable,
      },
    },
  );
  process.exitCode = await new Promise((resolve) => {
    testProcess.on("exit", (code) => resolve(code ?? 1));
    testProcess.on("error", () => resolve(1));
  });
} catch (error) {
  // Docker's command error can include test env args. Print only the human-readable message's first line.
  console.error(String(error.message).split("\n")[0]);
  process.exitCode = interrupted || 1;
} finally {
  await cleanup();
}

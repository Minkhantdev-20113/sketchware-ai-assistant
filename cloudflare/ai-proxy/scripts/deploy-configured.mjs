/**
 * Reads API keys from the project root .env.local and deploys the Worker.
 * Requires: npx wrangler login (once)
 *
 * Usage:
 *   cd cloudflare/ai-proxy
 *   npm run deploy:configured
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPath = join(root, ".env.local");
const envExamplePath = join(root, ".env.example");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};

  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return values;
}

function putSecret(name, value) {
  if (!value) {
    console.log(`Skipping ${name} (empty)`);
    return;
  }

  console.log(`Setting Worker secret: ${name}`);
  execSync(`npx wrangler secret put ${name}`, {
    cwd: dirname(fileURLToPath(import.meta.url)),
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    env: process.env,
  });
}

function upsertEnvLocal(key, value) {
  const target = existsSync(envPath) ? envPath : envExamplePath;
  const lines = readFileSync(target, "utf8").split(/\r?\n/);
  let found = false;

  const next = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    next.push(`${key}=${value}`);
  }

  writeFileSync(envPath, `${next.filter(Boolean).join("\n")}\n`, "utf8");
}

const env = loadEnvFile(envPath);

putSecret("OPENROUTER_API_KEY", env.OPENROUTER_API_KEY ?? "");
putSecret("GEMINI_API_KEY", env.GEMINI_API_KEY ?? "");
putSecret("DEEPSEEK_API_KEY", env.DEEPSEEK_API_KEY ?? "");
putSecret("GROQ_API_KEY", env.GROQ_API_KEY ?? "");

console.log("Deploying Worker...");
const deployOutput = execSync("npx wrangler deploy", {
  cwd: dirname(fileURLToPath(import.meta.url)),
  encoding: "utf8",
  stdio: ["inherit", "pipe", "inherit"],
});

console.log(deployOutput);

const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/);
if (urlMatch) {
  upsertEnvLocal("CLOUDFLARE_AI_PROXY_URL", urlMatch[0]);
  console.log(`Updated .env.local with CLOUDFLARE_AI_PROXY_URL=${urlMatch[0]}`);
} else {
  console.log("Deploy finished. Paste the workers.dev URL into .env.local manually.");
}

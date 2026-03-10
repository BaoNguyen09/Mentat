import { existsSync, readFileSync } from "node:fs";

let environmentLoaded = false;

export function loadEnvironment() {
  if (environmentLoaded) {
    return;
  }

  environmentLoaded = true;

  const envUrl = new URL("../../.env", import.meta.url);

  if (!existsSync(envUrl)) {
    return;
  }

  const source = readFileSync(envUrl, "utf8");

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const rawValue = line.slice(separatorIndex + 1).trim();
    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value: string) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

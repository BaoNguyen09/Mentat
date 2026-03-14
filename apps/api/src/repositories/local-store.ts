import type { Profile, ProgressSnapshot, SessionSummary } from "@mentat/types";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface LocalStore {
  profiles: Record<string, Profile>;
  progress: Record<string, ProgressSnapshot>;
  sessions: SessionSummary[];
}

const localStorePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/local-store.json",
);

const defaultStore: LocalStore = {
  profiles: {},
  progress: {},
  sessions: [],
};

let localStoreCache: LocalStore | null = null;

async function ensureLocalStore() {
  await mkdir(path.dirname(localStorePath), { recursive: true });
}

export async function readLocalStore(): Promise<LocalStore> {
  if (localStoreCache) {
    return structuredClone(localStoreCache);
  }

  await ensureLocalStore();

  try {
    const raw = await readFile(localStorePath, "utf8");
    localStoreCache = JSON.parse(raw) as LocalStore;
  } catch {
    localStoreCache = structuredClone(defaultStore);
    await writeLocalStore(localStoreCache);
  }

  return structuredClone(localStoreCache);
}

export async function writeLocalStore(store: LocalStore): Promise<void> {
  await ensureLocalStore();
  localStoreCache = structuredClone(store);
  await writeFile(localStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function updateLocalStore(
  updater: (store: LocalStore) => void | LocalStore,
): Promise<LocalStore> {
  const current = await readLocalStore();
  const updated = updater(current) ?? current;
  await writeLocalStore(updated);
  return structuredClone(updated);
}

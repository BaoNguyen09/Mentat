import type { DomainKnowledgeEntry } from "@mentat/types";

import { readLocalStore, updateLocalStore } from "./local-store.js";

export async function saveKnowledgeEntry(
  entry: DomainKnowledgeEntry,
): Promise<void> {
  await updateLocalStore((store) => {
    store.knowledgeEntries = store.knowledgeEntries
      .filter((current) => current.entryId !== entry.entryId)
      .concat(entry)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  });
}

export async function getKnowledgeEntries(
  userId: string,
): Promise<DomainKnowledgeEntry[]> {
  const store = await readLocalStore();
  return store.knowledgeEntries
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

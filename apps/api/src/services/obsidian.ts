import type { DomainKnowledgeEntry } from "@mentat/types";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const vaultRoot = "C:\\Users\\loqpm\\Documents\\Projects\\Obsidian Vault";
const mentatRoot = path.join(vaultRoot, "Projects", "Mentat");
const knowledgeRoot = path.join(mentatRoot, "Knowledge");
const syncLogPath = path.join(vaultRoot, "Meta", "Sync Log.md");

function sanitizeFileSegment(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "Unknown";
}

function renderEntry(entry: DomainKnowledgeEntry) {
  const keyPoints =
    entry.keyPoints.length > 0
      ? entry.keyPoints.map((point) => `- ${point}`).join("\n")
      : "- No key points extracted yet.";

  return `### ${entry.createdAt}

**Summary:** ${entry.summary}

**Transcript:** ${entry.transcript}

**Key points**
${keyPoints}

**Next action:** ${entry.nextAction ?? "None recorded"}
`;
}

async function writeKnowledgeIndex(
  userId: string,
  entries: DomainKnowledgeEntry[],
  domainPages: string[],
  subdomainPages: string[],
) {
  const indexPath = path.join(knowledgeRoot, "Mentat Knowledge Base.md");
  const content = `# Mentat Knowledge Base

**Back to:** [[Mentat]] | [[Projects Hub]] | [[Home]]
**Source Repo:** \`C:\\Users\\loqpm\\Documents\\GitHub\\Mentat\`
**User:** \`${userId}\`
**Last updated:** ${new Date().toISOString()}

## Overview

This page is the synced knowledge index for Mentat voice and text tracking.

## Domain Pages

${domainPages.map((page) => `- [[${page}]]`).join("\n") || "- None yet."}

## Subdomain Pages

${subdomainPages.map((page) => `- [[${page}]]`).join("\n") || "- None yet."}

## Recent Entries

${entries.slice(0, 10).map((entry) => `- ${entry.domainGroup} / ${entry.subdomain}: ${entry.summary}`).join("\n") || "- None yet."}
`;

  await writeFile(indexPath, `${content}\n`, "utf8");
  return indexPath;
}

export async function syncKnowledgeToObsidian(
  userId: string,
  entries: DomainKnowledgeEntry[],
) {
  await mkdir(knowledgeRoot, { recursive: true });
  await mkdir(path.dirname(syncLogPath), { recursive: true });

  const groupedByDomain = new Map<string, DomainKnowledgeEntry[]>();
  const groupedBySubdomain = new Map<string, DomainKnowledgeEntry[]>();

  for (const entry of entries) {
    const domainKey = sanitizeFileSegment(entry.domainGroup);
    const subdomainKey = `${domainKey} - ${sanitizeFileSegment(entry.subdomain)}`;

    groupedByDomain.set(domainKey, [
      ...(groupedByDomain.get(domainKey) ?? []),
      entry,
    ]);
    groupedBySubdomain.set(subdomainKey, [
      ...(groupedBySubdomain.get(subdomainKey) ?? []),
      entry,
    ]);
  }

  const writtenPages: string[] = [];
  const domainPages: string[] = [];
  const subdomainPages: string[] = [];

  for (const [domainKey, domainEntries] of groupedByDomain.entries()) {
    const pageName = `Domain - ${domainKey}`;
    const pagePath = path.join(knowledgeRoot, `${pageName}.md`);
    const content = `# ${pageName}

**Back to:** [[Mentat Knowledge Base]] | [[Mentat]] | [[Projects Hub]]
**User:** \`${userId}\`

## Entries

${domainEntries.map(renderEntry).join("\n")}
`;

    await writeFile(pagePath, `${content}\n`, "utf8");
    writtenPages.push(pagePath);
    domainPages.push(pageName);
  }

  for (const [subdomainKey, subdomainEntries] of groupedBySubdomain.entries()) {
    const pageName = `Subdomain - ${subdomainKey}`;
    const pagePath = path.join(knowledgeRoot, `${pageName}.md`);
    const content = `# ${pageName}

**Back to:** [[Mentat Knowledge Base]] | [[Mentat]] | [[Projects Hub]]
**User:** \`${userId}\`

## Entries

${subdomainEntries.map(renderEntry).join("\n")}
`;

    await writeFile(pagePath, `${content}\n`, "utf8");
    writtenPages.push(pagePath);
    subdomainPages.push(pageName);
  }

  const indexPath = await writeKnowledgeIndex(
    userId,
    entries,
    domainPages,
    subdomainPages,
  );

  await appendFile(
    syncLogPath,
    `\n- ${new Date().toISOString()} - Mentat knowledge sync for \`${userId}\`: ${writtenPages.length + 1} pages updated\n`,
    "utf8",
  );

  return [indexPath, ...writtenPages];
}

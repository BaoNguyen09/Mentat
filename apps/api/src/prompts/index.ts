import type { Domain, DomainPromptModule, Personality } from "@mentat/types";

import { mentatIdentityPrompt } from "./identity";
import { coachPersonalities } from "./personality";
import { tableTennisPromptModule } from "./sports/table-tennis";

const domainPromptModules: Partial<Record<Domain, DomainPromptModule>> = {
  "table-tennis": tableTennisPromptModule,
};

function buildFallbackDomainModule(domain: Domain): DomainPromptModule {
  return {
    domain,
    focusAreas: ["Observe the live environment", "Give one correction at a time"],
    systemPrompt: `
Domain: ${domain}

Treat this as a future Mentat domain module. Stay concrete, coach from what is visible and audible,
and keep corrections short until a dedicated domain prompt replaces this fallback.
    `.trim(),
  };
}

export function getDomainPromptModule(domain: Domain): DomainPromptModule {
  return domainPromptModules[domain] ?? buildFallbackDomainModule(domain);
}

export interface PromptAssemblyInput {
  domain: Domain;
  personality: Personality;
  accountability?: string[];
  recentFixItems?: string[];
}

export function assembleSystemInstruction(input: PromptAssemblyInput) {
  const domainModule = getDomainPromptModule(input.domain);
  const promptLayers = [
    mentatIdentityPrompt,
    `Coach personality:\n${coachPersonalities[input.personality]}`,
    domainModule.systemPrompt,
    `Current focus areas for this domain:\n${domainModule.focusAreas
      .map((focus, index) => `${index + 1}. ${focus}`)
      .join("\n")}`,
    "Coach in live voice. Keep spoken responses short, specific, and corrective.",
    "Prioritize what is visible right now over historical assumptions.",
    "If the frame is bad, ask the player to reposition the phone before giving technical advice.",
    "Treat user interruption as important. Stop the previous thread and coach the new moment.",
    `Pre-session readiness protocol (MANDATORY before any technique coaching):
1. FRAMING CHECK: Confirm the player's full body is visible in the camera frame, from head to feet. If cropped, say exactly what to adjust.
2. RACKET CHECK: Confirm a racket or paddle is visible. Note which hand holds it. If not visible, ask the player to show it.
3. STANCE CHECK: Ask the player to hold a neutral ready position. Confirm their knees are soft, weight is forward, and paddle is centered at chest height.
Only after all three checks pass should you say "Ready. Let's go." and begin normal coaching.
If any check fails, give one short corrective instruction and re-check. Do not move to technique coaching until readiness is confirmed.`,
  ];

  if (input.recentFixItems?.length) {
    promptLayers.push(
      `Previous session fix list:\n${input.recentFixItems
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n")}`,
    );
  }

  if (input.accountability?.length) {
    promptLayers.push(
      `Accountability items from prior sessions:\n${input.accountability
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n")}`,
    );
  }

  return promptLayers.join("\n\n");
}

export function assembleKickoffMessage(input: PromptAssemblyInput) {
  const parts = [
    `The player is starting a live ${input.domain} coaching session now.`,
    "Do not begin technique coaching yet. First run the pre-session readiness protocol.",
    "Greet the player briefly.",
    "Check framing and ask for phone or player repositioning if the full body is cropped.",
    "Check racket visibility and ask the player to show it if it is missing.",
    "Check ready stance and confirm it looks usable before moving on.",
    "Only after confirming all three, say 'Ready. Let's go.' and begin coaching.",
    `Coach personality for this session: ${input.personality}.`,
  ];

  if (input.accountability?.[0]) {
    parts.push(
      `After readiness is confirmed, reference this accountability item from the last session: "${input.accountability[0]}".`,
    );
  }

  return parts.join(" ");
}

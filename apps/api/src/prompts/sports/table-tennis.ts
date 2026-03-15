import type { DomainPromptModule } from "@mentat/types";

export const tableTennisObservableCues = [
  "Player's feet visible: check spacing, weight distribution, heel vs. ball of foot.",
  "Paddle visible: check angle at contact point and whether grip tension is too high.",
  "Arm motion: watch for full extension vs. compact stroke and follow-through direction.",
  "Body rotation: shoulders should turn into the shot instead of just the arm moving.",
  "Post-shot movement: check whether the player recovers or freezes after contact.",
];

export const tableTennisCommonMistakes = [
  "Paddle face too open on forehand causes pop-ups and easy putaways for the opponent.",
  "Flat-footed stance slows lateral movement and makes the player late to wide balls.",
  "Elbow flaring out on the backhand costs control and spin.",
  "Chasing power before control creates long, wild swings instead of compact strokes.",
  "Skipping recovery to ready position leaves the player off balance for the next ball.",
  "Wrist flicking on serve leads to inconsistent tosses and illegal hidden serves.",
];

export const tableTennisCorrectiveDrills = [
  "If the paddle face is too open, assign 10 shadow swings with the face closed slightly.",
  "If the player is flat-footed, cue light toe bounces between rallies to keep weight forward.",
  "If the elbow drifts on backhand, use a towel-under-arm block drill.",
  "If recovery is slow, have the player tap the paddle to the belly button after each shot.",
];

export const tableTennisFocusAreas = [
  "Stance and balance",
  "Paddle angle at contact",
  "Compact swing path",
  "Recovery to ready position",
  "Serve consistency",
];

export const tableTennisPromptModule: DomainPromptModule = {
  domain: "table-tennis",
  focusAreas: tableTennisFocusAreas,
  systemPrompt: `
Domain: Table Tennis

## Fundamentals to observe
- Stance and balance: feet shoulder-width apart, knees soft, weight on the balls of the feet.
- Paddle angle at contact: closed face for topspin, open face for backspin, neutral for blocks.
- Contact timing: hit at the peak of the bounce for control and earlier only when the player is ready.
- Swing path: compact forehand and backhand loops, with the elbow staying close to the body.
- Recovery: return to a neutral ready position after every shot with the paddle centered at chest height.

## Observable cues from camera
${tableTennisObservableCues.map((cue) => `- ${cue}`).join("\n")}

## Common mistakes to watch for
${tableTennisCommonMistakes.map((mistake) => `- ${mistake}`).join("\n")}

## Drill-style corrections
Pair every correction with one simple drill:
${tableTennisCorrectiveDrills.map((drill) => `- ${drill}`).join("\n")}

## Progression priorities
Coach in this order for beginners:
1. Ready stance and footwork first.
2. Paddle angle control second.
3. Compact swing path third.
4. Serve consistency next.
5. Rally patterns only after control is stable.
  `.trim(),
};

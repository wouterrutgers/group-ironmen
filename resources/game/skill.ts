import type { Distinct } from "../ts/util";

export const Skill = [
  "Agility",
  "Attack",
  "Construction",
  "Cooking",
  "Crafting",
  "Defence",
  "Farming",
  "Firemaking",
  "Fishing",
  "Fletching",
  "Herblore",
  "Hitpoints",
  "Hunter",
  "Magic",
  "Mining",
  "Prayer",
  "Ranged",
  "Runecraft",
  "Slayer",
  "Smithing",
  "Strength",
  "Thieving",
  "Woodcutting",
] as const;
export type Skill = (typeof Skill)[number];
export type Experience = Distinct<number, "Experience">;
export type Level = Distinct<number, "Level">;

const SkillIcons: { skill: Skill | "Overall"; iconURL: string }[] = [
  { skill: "Overall", iconURL: "/ui/3579-0.png" },
  { skill: "Attack", iconURL: "/ui/197-0.png" },
  { skill: "Hitpoints", iconURL: "/ui/203-0.png" },
  { skill: "Mining", iconURL: "/ui/209-0.png" },
  { skill: "Strength", iconURL: "/ui/198-0.png" },
  { skill: "Agility", iconURL: "/ui/204-0.png" },
  { skill: "Smithing", iconURL: "/ui/210-0.png" },
  { skill: "Defence", iconURL: "/ui/199-0.png" },
  { skill: "Herblore", iconURL: "/ui/205-0.png" },
  { skill: "Fishing", iconURL: "/ui/211-0.png" },
  { skill: "Ranged", iconURL: "/ui/200-0.png" },
  { skill: "Thieving", iconURL: "/ui/206-0.png" },
  { skill: "Cooking", iconURL: "/ui/212-0.png" },
  { skill: "Prayer", iconURL: "/ui/201-0.png" },
  { skill: "Crafting", iconURL: "/ui/207-0.png" },
  { skill: "Firemaking", iconURL: "/ui/213-0.png" },
  { skill: "Magic", iconURL: "/ui/202-0.png" },
  { skill: "Fletching", iconURL: "/ui/208-0.png" },
  { skill: "Woodcutting", iconURL: "/ui/214-0.png" },
  { skill: "Runecraft", iconURL: "/ui/215-0.png" },
  { skill: "Slayer", iconURL: "/ui/216-0.png" },
  { skill: "Farming", iconURL: "/ui/217-0.png" },
  { skill: "Construction", iconURL: "/ui/221-0.png" },
  { skill: "Hunter", iconURL: "/ui/220-0.png" },
];
export const SkillIconsBySkill = new Map<Skill | "Overall", URL>(
  SkillIcons.map(({ skill, iconURL }) => [skill, new URL(iconURL, import.meta.url)] as [Skill, URL]),
);

const levelLookup = new Map<number, number>();
{
  let xp = 0;
  for (let L = 1; L <= 126; L++) {
    // https://oldschool.runescape.wiki/w/Experience
    levelLookup.set(L, Math.floor(xp));
    xp += 0.25 * Math.floor(L + 300 * 2 ** (L / 7));
  }
}

export const computeVirtualLevelFromXP = (xp: Experience | 0): Level => {
  let virtualLevel = 1;
  while (xp >= (levelLookup.get(virtualLevel + 1) ?? Infinity)) virtualLevel += 1;
  return virtualLevel as Level;
};

export interface ExperienceDecomposition {
  // The level a player would have if levels were not capped at 99.
  levelVirtual: Level;
  // The level of a player from 1 to 99.
  levelReal: Level;
  // The experience total that gave the current level.
  xpMilestoneOfCurrent: Experience;
  // The experience total that when hit, will give the next level.
  xpMilestoneOfNext: Experience;
  // The experience total needed to hit max level.
  xpDeltaFromMax: Experience;
}

const LEVEL_MAX = 99;

export const decomposeExperience = (xp: Experience | 0): ExperienceDecomposition => {
  const levelVirtual = computeVirtualLevelFromXP(xp);
  const levelReal = Math.min(levelVirtual, LEVEL_MAX);
  const xpMilestoneOfCurrent = levelLookup.get(levelVirtual) ?? 0;
  const xpMilestoneOfNext = levelLookup.get(levelVirtual + 1) ?? 0;

  return {
    levelVirtual: levelVirtual,
    levelReal: levelReal as Level,
    xpMilestoneOfCurrent: xpMilestoneOfCurrent as Experience,
    xpMilestoneOfNext: xpMilestoneOfNext as Experience,
    xpDeltaFromMax: levelLookup.get(LEVEL_MAX)! as Experience,
  };
};

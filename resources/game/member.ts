import type { Distinct } from "../ts/util";
import type { DiaryRegion, DiaryTier } from "./diaries";
import type { EquipmentSlot } from "./equipment";
import type { ItemID, ItemStack } from "./items";
import type { QuestID, QuestStatus } from "./quests";
import type { Experience, Skill } from "./skill";
import * as CollectionLog from "./collection-log";
import type { WikiPosition2D } from "../components/canvas-map/coordinates";

export type Name = Distinct<string, "Member.Name">;

export interface State {
  lastUpdated: Date;
  bank: ItemCollection;
  runePouch: ItemCollection;
  seedVault: ItemCollection;
  equipment: Equipment;
  inventory: Inventory;
  coordinates?: { coords: WikiPosition2D; plane: number };
  interacting?: NPCInteraction;
  stats?: Stats;
  skills?: Skills;
  quests?: Quests;
  diaries?: Diaries;
  collection?: Collection;
}

export interface Position {
  coords: WikiPosition2D;
  plane: number;
}
export type ItemCollection = Map<ItemID, number>;
export type Equipment = Map<EquipmentSlot, ItemStack>;
export type Inventory = (ItemStack | undefined)[];
export type Skills = Record<Skill, Experience>;
export type Quests = Map<QuestID, QuestStatus>;
export type Diaries = Record<DiaryRegion, Record<DiaryTier, boolean[]>>;
export interface Collection {
  obtainedItems: Map<CollectionLog.ItemIDDeduped, number>;
  pageStats: Map<CollectionLog.PageName, { completions: number[] }>;
}

/**
 * An instance of a member gaining experience.
 */
export interface ExperienceDrop {
  /**
   * A unique ID for the drop. This is used as a key for the DOM nodes, so they
   * are tracked uniquely and have their own CSS animations.
   */
  id: number;

  /**
   * The skill to display the icon for.
   */
  skill: Skill;

  /**
   * The amount of xp in the drop.
   */
  amount: Experience;

  /**
   * Age of the drop, for deleting when it gets old
   */
  creationTimeMS: number;

  /**
   * A random seed between 0 and 1, that can be used for randomly distributed
   * yet deterministic variations between xp drops.
   */
  seed: number;
}

export interface NPCInteraction {
  /**
   * Name of the NPC
   */
  name: string;

  /**
   * The ratio of the NPC's health currently, from 0 to 1. Undefined if the NPC
   * has no hitpoints, such as for a talkative NPC in a town.
   *
   * OSRS does not share actual hitpoints to the client, so we just have the
   * ratio.
   */
  healthRatio: number | undefined;

  /**
   * Position in the world the NPC was interacted with.
   */
  location: {
    x: number;
    y: number;
    plane: number;
  };

  /**
   * When the NPC was interacted with.
   */
  lastUpdated: Date;
}

export interface Stats {
  health: { current: number; max: number };
  run: { current: number; max: number };
  prayer: { current: number; max: number };
  world: number;
}

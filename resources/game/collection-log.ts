import type { Distinct } from "../ts/util";
import type { ItemID } from "./items";

export const TabName = ["Bosses", "Raids", "Clues", "Minigames", "Other"] as const;
export type TabName = (typeof TabName)[number];
export type PageName = Distinct<string, "CollectionLog.PageName">;
export interface Page {
  name: PageName;
  completionLabels: string[];
  items: ItemID[];
}
export interface CollectionLogInfo {
  /**
   * This is the total amount of unlockable slots.
   *
   * This is different than going through and totalling each page's items!
   * Duplicate item IDs across pages (such as the dragon pickaxe in all the
   * wilderness posses) are not double counted. Also, there are some unique item
   * IDs that count for each other, such as Motherlode Mine vs Volcanic
   * Mine prospector's gear.
   *
   * Per-page unlock count can safely be counted as the length of the items array.
   */
  uniqueSlots: number;

  /**
   * All tabs, with all of their pages.
   */
  tabs: Map<TabName, Page[]>;
}

/**
 * The collection log has duplicate versions of items on different pages with
 * different items ids. Where it matters, collection log storage structures will
 * use the deduped ID instead, which must be obtained by calling `deduplicateItemID`.
 */
export type ItemIDDeduped = Distinct<number, "ItemIDDeduped">;
const duplicateItemIDLookup = new Map<ItemID, ItemIDDeduped>([
  // Duplicate mining outfit from volcanic mine and motherlode mine pages
  [29472, 12013], // Prospector helmet
  [29474, 12014], // Prospector jacket
  [29476, 12015], // Prospector legs
  [29478, 12016], // Prospector boots
] as [ItemID, ItemIDDeduped][]);
export const deduplicateItemID = (id: ItemID): ItemIDDeduped =>
  duplicateItemIDLookup.get(id) ?? (id as number as ItemIDDeduped);

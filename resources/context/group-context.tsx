import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import * as Member from "../game/member";
import { Context as APIContext } from "./api-context";
import type { ItemID, ItemStack } from "../game/items";
import type { GroupStateUpdate } from "../api/api";
import { Skill, type Experience } from "../game/skill";

interface GroupState {
  items: Map<ItemID, Map<Member.Name, number>>;
  memberStates: Map<Member.Name, Member.State>;
  memberNames: Set<Member.Name>;
  xpDropCounter: number;
  xpDrops: Map<Member.Name, Member.ExperienceDrop[]>;
}

/* eslint-disable react-refresh/only-export-components */

/**
 * Contains all items held by the group, indexed by ItemID then member name.
 */
export const GroupItemsContext = createContext<GroupState["items"]>(new Map());

/**
 * Contains all the current states of each member of the group, such as their
 * stats and inventories.
 */
export const GroupMemberStatesContext = createContext<GroupState["memberStates"]>(new Map());

/**
 * Contains all names of members known. Useful for minimal rerenders since this
 * updates rarely.
 */
export const GroupMemberNamesContext = createContext<GroupState["memberNames"]>(new Set());

/**
 * Contains all the xp drops of the group.
 */
export const GroupXPDropsContext = createContext<GroupState["xpDrops"]>(new Map());

// TODO: many of these are candidates to be split off like the items, to reduce
// excessive updates.

// TODO: XPDrops is a good candidate for the reducer pattern of dispatched
// actions e.g. add drop, delete drop.

type GroupMemberStateSelector<T> = (state: GroupState["memberStates"] | undefined) => T;
export const useGroupMemberContext = <T,>(selector: GroupMemberStateSelector<T>): T => {
  const state = useContext(GroupMemberStatesContext);

  return selector(state);
};

// Selectors for per member state
export const useMemberLastUpdatedContext = (member: Member.Name): Date | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.lastUpdated);
export const useMemberBankContext = (member: Member.Name): Member.ItemCollection | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.bank);
export const useMemberRunePouchContext = (member: Member.Name): Member.ItemCollection | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.runePouch);
export const useMemberSeedVaultContext = (member: Member.Name): Member.ItemCollection | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.seedVault);
export const useMemberEquipmentContext = (member: Member.Name): Member.Equipment | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.equipment);
export const useMemberInventoryContext = (member: Member.Name): Member.Inventory | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.inventory);
export const useMemberCoordinatesContext = (member: Member.Name): Member.Position | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.coordinates);
export const useMemberInteractingContext = (member: Member.Name): Member.NPCInteraction | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.interacting);
export const useMemberStatsContext = (member: Member.Name): Member.Stats | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.stats);
export const useMemberSkillsContext = (member: Member.Name): Member.Skills | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.skills);
export const useMemberQuestsContext = (member: Member.Name): Member.Quests | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.quests);
export const useMemberDiariesContext = (member: Member.Name): Member.Diaries | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.diaries);
export const useMemberCollectionContext = (member: Member.Name): Member.Collection | undefined =>
  useGroupMemberContext((state) => state?.get(member)?.collection);

/* eslint-enable react-refresh/only-export-components */

/**
 * Taking in the new group state, perform some diff checking and update
 * sparingly. This method also aggregates the items for the group.
 *
 * A lot of these checks should probably be done by the backend and diffs
 * performed in the API class, but for now we can just do the checks here.
 */
const reducer = (oldState: GroupState, stateUpdate: GroupStateUpdate): GroupState => {
  const newState: Partial<GroupState> = {};

  let updated = false;

  {
    const newMemberNames = new Set<Member.Name>(stateUpdate.keys());
    if (newMemberNames.size !== oldState.memberNames.size || newMemberNames.difference(oldState.memberNames).size > 0) {
      newState.memberNames = newMemberNames;
      updated = true;
    }
  }

  {
    const newMemberStates = new Map(oldState.memberStates);
    for (const [member, memberStateUpdate] of stateUpdate) {
      const memberState: Member.State = oldState.memberStates.get(member) ?? {
        bank: new Map(),
        equipment: new Map(),
        inventory: [] satisfies Member.Inventory,
        lastUpdated: new Date(0),
        runePouch: new Map(),
        seedVault: new Map(),
      };

      newMemberStates.set(member, { ...memberState, ...memberStateUpdate });
      newState.memberStates = newMemberStates;
      updated = true;
    }
  }

  {
    const newItems = new Map<ItemID, Map<Member.Name, number>>();
    const incrementItemCount = (memberName: Member.Name, { itemID, quantity }: ItemStack): void => {
      if (!newItems.has(itemID)) newItems.set(itemID, new Map<Member.Name, number>());
      const itemView = newItems.get(itemID)!;

      const oldQuantity = itemView.get(memberName) ?? 0;
      itemView.set(memberName, oldQuantity + quantity);
    };

    newState.memberStates?.forEach(({ bank, equipment, inventory, runePouch, seedVault }, memberName) => {
      // Each item storage is slightly different, so we need to iterate them different.
      [bank, runePouch, seedVault].forEach((storageArea) =>
        storageArea.forEach((quantity, itemID) => {
          incrementItemCount(memberName, { quantity, itemID });
        }),
      );
      inventory
        .filter((item) => item !== undefined)
        .forEach((item) => {
          incrementItemCount(memberName, item);
        });
      equipment.forEach((item) => {
        incrementItemCount(memberName, item);
      });
    });

    let newAndOldItemsEqual = true;

    if (newItems.size !== oldState.items.size) {
      newAndOldItemsEqual = false;
    }

    for (const [itemID, oldQuantityPerMember] of oldState.items) {
      const newQuantityPerMember = newItems.get(itemID);
      if (!newQuantityPerMember) {
        newAndOldItemsEqual = false;
        continue;
      }

      if (oldQuantityPerMember.size !== newQuantityPerMember.size) {
        newAndOldItemsEqual = false;
        continue;
      }

      let quantitiesAllEqual = true;
      for (const [member, oldQuantity] of oldQuantityPerMember) {
        const newQuantity = newQuantityPerMember.get(member);
        if (newQuantity !== oldQuantity) {
          newAndOldItemsEqual = false;
          quantitiesAllEqual = false;
          break;
        }
      }
      if (!quantitiesAllEqual) continue;

      newItems.set(itemID, oldQuantityPerMember);
    }

    if (!newAndOldItemsEqual) {
      updated = true;
      newState.items = newItems;
    }
  }

  {
    const newXPDrops = new Map(oldState.xpDrops);
    for (const [member, { skills: newSkills }] of stateUpdate) {
      const oldSkills = oldState.memberStates.get(member)?.skills;
      if (!oldSkills || !newSkills) {
        continue;
      }

      if (!newXPDrops.has(member)) {
        newXPDrops.set(member, []);
      }
      const drops = newXPDrops.get(member)!;

      for (const skill of Skill) {
        const delta = newSkills[skill] - oldSkills[skill];
        if (delta <= 0) continue;

        const counter = newState.xpDropCounter ?? oldState.xpDropCounter;
        drops.push({
          id: counter,
          skill: skill,
          amount: delta as Experience,
          creationTimeMS: performance.now(),
          seed: Math.random(),
        });
        newState.xpDropCounter = counter + 1;
        newState.xpDrops = newXPDrops;
        updated = true;
      }
    }
  }

  if (!updated) {
    return oldState;
  }

  {
    // Cleanup old xp drops.

    const nowMS = performance.now();
    // Should match animation-duration in xpdropper CSS
    const ANIMATION_TIME_MS = 8000;

    if (newState.xpDrops) {
      for (const [member, drops] of newState.xpDrops) {
        const countBefore = drops.length;
        const newDrops = drops.filter((drop) => {
          const age = nowMS - drop.creationTimeMS;
          return age < ANIMATION_TIME_MS;
        });
        const countAfter = newDrops.length;
        if (countBefore === countAfter) continue;

        newState.xpDrops.set(member, newDrops);
      }
    }
  }

  return { ...oldState, ...newState };
};

/**
 * The provider for {@link GroupItemsContext}, {@link GroupMemberStatesContext},
 * {@link GroupMemberStatesContext}, and {@link GroupXPDropsContext}.
 */
export const GroupProvider = ({ children }: { children: ReactNode }): ReactNode => {
  const [contexts, updateContexts] = useReducer(reducer, {
    items: new Map(),
    memberStates: new Map(),
    memberNames: new Set<Member.Name>(),
    xpDropCounter: 0,
    xpDrops: new Map(),
  });
  const { setUpdateCallbacks } = useContext(APIContext);

  useEffect(() => {
    if (!setUpdateCallbacks) return;

    setUpdateCallbacks({ onGroupUpdate: updateContexts });
  }, [setUpdateCallbacks]);

  const { items, memberStates, memberNames, xpDrops } = contexts;

  return (
    <GroupMemberNamesContext value={memberNames}>
      <GroupItemsContext value={items}>
        <GroupMemberStatesContext value={memberStates}>
          <GroupXPDropsContext value={xpDrops}>{children}</GroupXPDropsContext>
        </GroupMemberStatesContext>
      </GroupItemsContext>
    </GroupMemberNamesContext>
  );
};

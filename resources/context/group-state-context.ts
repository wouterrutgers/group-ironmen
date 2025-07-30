import { createContext, useContext } from "react";
import type { GroupState } from "../api/api";
import type * as Member from "../game/member";

type GroupStateSelector<T> = (state: GroupState | undefined) => T;

export const GroupStateContext = createContext<GroupState | undefined>(undefined);
export const useGroupStateContext = <T>(selector: GroupStateSelector<T>): T => {
  const state = useContext(GroupStateContext);

  return selector(state);
};

export const useGroupListMembersContext = (includeHidden = false): Member.Name[] =>
  useGroupStateContext((state) =>
    [...(state?.members.keys().filter((member) => includeHidden || member !== "@SHARED") ?? [])].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

export const useMemberLastUpdatedContext = (member: Member.Name): Date | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.lastUpdated);
export const useMemberBankContext = (member: Member.Name): Member.ItemCollection | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.bank);
export const useMemberRunePouchContext = (member: Member.Name): Member.ItemCollection | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.runePouch);
export const useMemberSeedVaultContext = (member: Member.Name): Member.ItemCollection | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.seedVault);
export const useMemberEquipmentContext = (member: Member.Name): Member.Equipment | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.equipment);
export const useMemberInventoryContext = (member: Member.Name): Member.Inventory | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.inventory);
export const useMemberCoordinatesContext = (member: Member.Name): Member.Position | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.coordinates);
export const useMemberInteractingContext = (member: Member.Name): Member.NPCInteraction | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.interacting);
export const useMemberStatsContext = (member: Member.Name): Member.Stats | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.stats);
export const useMemberSkillsContext = (member: Member.Name): Member.Skills | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.skills);
export const useMemberQuestsContext = (member: Member.Name): Member.Quests | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.quests);
export const useMemberDiariesContext = (member: Member.Name): Member.Diaries | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.diaries);
export const useMemberCollectionContext = (member: Member.Name): Member.Collection | undefined =>
  useGroupStateContext((state) => state?.members.get(member)?.collection);
export const useMemberXPDropsContext = (member: Member.Name): Member.ExperienceDrop[] | undefined =>
  useGroupStateContext((state) => state?.xpDrops.get(member));

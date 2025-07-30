import { fetchItemDataJSON, type ItemID, type ItemsDatabase, type ItemStack } from "../game/items";
import { fetchQuestDataJSON, type QuestDatabase, type QuestID, type QuestStatus } from "../game/quests";
import { fetchDiaryDataJSON, type DiaryDatabase } from "../game/diaries";
import type * as Member from "../game/member";
import { Vec2D, type WikiPosition2D } from "../components/canvas-map/coordinates";
import type { CollectionLogInfo } from "../game/collection-log";
import { Skill, type Experience } from "../game/skill";
import type { GroupCredentials } from "./credentials";
import { fetchGEPrices, type GEPrices } from "./requests/ge-prices";
import { fetchGroupData, SkillsInBackendOrder, type Response as GetGroupDataResponse } from "./requests/group-data";
import { fetchGroupCollectionLogs, type Response as GetGroupCollectionLogsResponse } from "./requests/collection-log";
import { fetchCollectionLogInfo } from "./requests/collection-log-info";
import * as RequestSkillData from "./requests/skill-data";
import * as RequestCreateGroup from "./requests/create-group";
import * as RequestAddGroupMember from "./requests/add-group-member";
import * as RequestDeleteGroupMember from "./requests/delete-group-member";
import * as RequestRenameGroupMember from "./requests/rename-group-member";

export interface GroupState {
  items: Map<ItemID, Map<Member.Name, number>>;
  members: Map<Member.Name, Member.State>;
  xpDrops: Map<Member.Name, Member.ExperienceDrop[]>;
}

export interface GameData {
  items?: ItemsDatabase;
  quests?: QuestDatabase;
  diaries?: DiaryDatabase;
  gePrices?: GEPrices;
  collectionLogInfo?: CollectionLogInfo;
}

interface UpdateCallbacks {
  onGroupUpdate: (group: GroupState) => void;
  onGameDataUpdate: (data: GameData) => void;
  onPlayerPositionsUpdate: (positions: { player: Member.Name; coords: WikiPosition2D; plane: number }[]) => void;
}
export default class Api {
  private baseURL: string;
  private closed: boolean;
  private credentials: GroupCredentials;

  private getGroupDataPromise?: Promise<void>;
  private getGroupCollectionLogsPromise?: Promise<void>;

  private groupDataValidUpToDate?: Date;
  private group: GroupState;

  private xpDropCleanupInterval: ReturnType<Window["setInterval"]> | undefined;
  private xpDropCounter = 0;

  private gameData: GameData = {};

  public isOpen(): boolean {
    return !this.closed;
  }

  private updateGroupData(response: GetGroupDataResponse): void {
    let updatedMisc = false;
    let updatedItems = false;
    let updatedCoordinates = false;

    const knownNames: Member.Name[] = [];

    for (const {
      name,
      coordinates,
      bank,
      equipment,
      inventory,
      rune_pouch,
      seed_vault,
      interacting,
      stats,
      last_updated,
      skills,
      quests,
      diary_vars,
    } of response) {
      if (!this.group.members.has(name)) {
        updatedMisc = true;
        this.group.members.set(name, {
          bank: new Map(),
          equipment: new Map(),
          inventory: [],
          runePouch: new Map(),
          seedVault: new Map(),
          lastUpdated: new Date(0),
        });
      }
      knownNames.push(name);
      const memberData = this.group.members.get(name)!;

      if (bank) {
        memberData.bank = new Map(bank);
        updatedItems = true;
      }

      if (equipment) {
        memberData.equipment = structuredClone(equipment);
        updatedItems = true;
      }

      if (inventory) {
        memberData.inventory = structuredClone(inventory);
        updatedItems = true;
      }

      if (rune_pouch) {
        memberData.runePouch = new Map(rune_pouch);
        updatedItems = true;
      }

      if (seed_vault) {
        memberData.seedVault = new Map(seed_vault);
        updatedItems = true;
      }

      if (interacting) {
        memberData.interacting = structuredClone(interacting);
        updatedMisc = true;
      }

      if (stats) {
        memberData.stats = structuredClone(stats);
        updatedMisc = true;
      }

      if (last_updated) {
        memberData.lastUpdated = structuredClone(last_updated);
        updatedMisc = true;
      }

      if (skills) {
        if (!this.group.xpDrops.has(name)) {
          this.group.xpDrops.set(name, []);
        }
        const drops = this.group.xpDrops.get(name)!;
        for (const skill of Skill) {
          if (!memberData?.skills) continue;

          const delta = skills[skill] - memberData.skills[skill];
          if (delta <= 0) continue;

          drops.push({
            id: this.xpDropCounter,
            skill: skill,
            amount: delta as Experience,
            creationTimeMS: performance.now(),
            seed: Math.random(),
          });
          this.xpDropCounter += 1;
          updatedMisc = true;
        }

        memberData.skills = structuredClone(skills);
        updatedMisc = true;
      }

      if (quests && this.gameData?.quests) {
        const questsByID = new Map<QuestID, QuestStatus>();
        // Resolve the IDs for the flattened quest progress sent by the backend
        this.gameData.quests.entries().forEach(([id, _], index) => {
          questsByID.set(id, quests.at(index) ?? "NOT_STARTED");
        });
        memberData.quests = questsByID;
        updatedMisc = true;
      }

      if (diary_vars) {
        memberData.diaries = structuredClone(diary_vars);
        updatedMisc = true;
      }

      if (coordinates) {
        memberData.coordinates = {
          coords: Vec2D.create<WikiPosition2D>({
            x: coordinates.x,
            y: coordinates.y,
          }),
          plane: coordinates.plane,
        };
        updatedCoordinates = true;
      }
    }

    for (const staleMember of this.group.members.keys().filter((member) => !knownNames.includes(member))) {
      this.group.members.delete(staleMember);
      updatedMisc = true;
    }
    for (const staleMember of this.group.xpDrops.keys().filter((member) => !knownNames.includes(member))) {
      this.group.members.delete(staleMember);
      updatedMisc = true;
    }

    // Backend always sends the entirety of the items, in each category that changes.
    // So to simplify and avoid desync, we rebuild the entirety of the items view whenever there is an update.
    // In the future, we may want to diff the amounts and try to update sparingly.
    if (updatedItems) {
      const sumOfAllItems = new Map<ItemID, Map<Member.Name, number>>();
      const incrementItemCount = (memberName: Member.Name, { itemID, quantity }: ItemStack): void => {
        if (!sumOfAllItems.has(itemID)) sumOfAllItems.set(itemID, new Map<Member.Name, number>());
        const itemView = sumOfAllItems.get(itemID)!;

        const oldQuantity = itemView.get(memberName) ?? 0;
        itemView.set(memberName, oldQuantity + quantity);
      };

      this.group.members.forEach(({ bank, equipment, inventory, runePouch, seedVault }, memberName) => {
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

      this.group.items = sumOfAllItems;
    }

    if (updatedCoordinates) {
      const positions = [];
      for (const [member, { coordinates }] of this.group.members) {
        if (!coordinates) continue;
        positions.push({ player: member, coords: coordinates.coords, plane: coordinates.plane });
      }
      this.callbacks?.onPlayerPositionsUpdate?.(positions);
    }

    if (updatedMisc || updatedItems) {
      this.callbacks?.onGroupUpdate?.(this.group);
    }
  }

  private updateGroupCollectionLogs(response: GetGroupCollectionLogsResponse): void {
    let updatedLogs = false;

    Object.entries(response).forEach(([member, collection]) => {
      if (!this.group.members.has(member as Member.Name) || !collection) {
        return;
      }

      // TODO: Don't do shallow copy (does it matter?)
      this.group.members.get(member as Member.Name)!.collection = {
        pageStats: new Map(collection.pageStats),
        obtainedItems: new Map(collection.obtainedItems),
      };
      updatedLogs = true;
    });

    if (updatedLogs) {
      this.callbacks?.onGroupUpdate?.(this.group);
    }
  }

  private callbacks: Partial<UpdateCallbacks> = {};

  public overwriteSomeUpdateCallbacks(callbacks: Partial<UpdateCallbacks>): void {
    Object.assign(this.callbacks, callbacks);

    this.callbacks.onGameDataUpdate?.(this.gameData);
    this.callbacks.onGroupUpdate?.(this.group);
  }

  private queueGetGameData(): void {
    if (!this.gameData.quests) {
      fetchQuestDataJSON()
        .then((data) => {
          this.gameData.quests = data;
          this.callbacks?.onGameDataUpdate?.(this.gameData);
        })
        .catch((reason) => console.error("Failed to get quest data for API", reason));
    }
    if (!this.gameData.items) {
      fetchItemDataJSON()
        .then((data) => {
          this.gameData.items = data;
          this.callbacks?.onGameDataUpdate?.(this.gameData);
        })
        .catch((reason) => console.error("Failed to get item data for API", reason));
    }
    if (!this.gameData.diaries) {
      fetchDiaryDataJSON()
        .then((data) => {
          this.gameData.diaries = data;
          this.callbacks?.onGameDataUpdate?.(this.gameData);
        })
        .catch((reason) => console.error("Failed to get diary data for API", reason));
    }
    if (!this.gameData.gePrices) {
      fetchGEPrices({ baseURL: this.baseURL })
        .then((data) => {
          this.gameData.gePrices = data;
          this.callbacks?.onGameDataUpdate?.(this.gameData);
        })
        .catch((reason) => console.error("Failed to get grand exchange data for API", reason));
    }
    if (!this.gameData.collectionLogInfo) {
      fetchCollectionLogInfo({ baseURL: this.baseURL })
        .then((response) => {
          this.gameData.collectionLogInfo = response;
          this.callbacks?.onGameDataUpdate?.(this.gameData);
        })
        .catch((reason) => console.error("Failed to get collection log info for API", reason));
    }
  }

  private queueFetchGroupData(): void {
    const FETCH_INTERVAL_MS = 1000;
    const fetchDate = new Date((this.groupDataValidUpToDate?.getTime() ?? 0) + 1);

    this.getGroupDataPromise ??= fetchGroupData({
      baseURL: this.baseURL,
      credentials: this.credentials,
      fromTime: fetchDate,
    })
      .then((response) => {
        this.updateGroupData(response);

        const mostRecentLastUpdatedTimestamp = response.reduce<Date>((previousNewest, { last_updated }) => {
          if (!last_updated) return previousNewest;
          const memberDate = new Date(last_updated);
          if (memberDate < previousNewest) return previousNewest;
          return memberDate;
        }, new Date(0));

        this.groupDataValidUpToDate = mostRecentLastUpdatedTimestamp;
      })
      .then(() => {
        if (this.closed) return;

        window.setTimeout(() => {
          this.getGroupDataPromise = undefined;
          this.queueFetchGroupData();
        }, FETCH_INTERVAL_MS);
      });
  }

  private queueFetchGroupCollectionLogs(): void {
    const FETCH_INTERVAL_MS = 10000;

    this.getGroupCollectionLogsPromise ??= fetchGroupCollectionLogs({
      baseURL: this.baseURL,
      credentials: this.credentials,
    })
      .then((response) => {
        this.updateGroupCollectionLogs(response);
      })
      .then(() => {
        if (this.closed) return;

        window.setTimeout(() => {
          this.getGroupCollectionLogsPromise = undefined;
          this.queueFetchGroupCollectionLogs();
        }, FETCH_INTERVAL_MS);
      });
  }

  private cleanupXPDrops(): void {
    const nowMS = performance.now();
    // Should match animation-duration in the CSS
    const ANIMATION_TIME_MS = 8000;

    const newDropsByMember = new Map<Member.Name, Member.ExperienceDrop[]>();

    for (const [member, drops] of this.group.xpDrops) {
      const countBefore = drops.length;
      const newDrops = drops.filter((drop) => {
        const age = nowMS - drop.creationTimeMS;
        return age < ANIMATION_TIME_MS;
      });
      const countAfter = newDrops.length;
      if (countBefore === countAfter) continue;

      newDropsByMember.set(member, newDrops);
    }

    if (newDropsByMember.size <= 0) return;

    for (const [member, newDrops] of newDropsByMember) {
      this.group.xpDrops.set(member, newDrops);
    }

    this.callbacks?.onGroupUpdate?.(this.group);
  }

  close(): void {
    this.callbacks = {};
    this.closed = true;

    this.getGroupDataPromise = undefined;
    this.getGroupCollectionLogsPromise = undefined;

    this.groupDataValidUpToDate = new Date(0);
    this.group = { items: new Map(), members: new Map(), xpDrops: new Map() };

    window.clearInterval(this.xpDropCleanupInterval);
    this.xpDropCounter = 0;

    this.gameData = {};
  }

  constructor(credentials: GroupCredentials) {
    this.baseURL = __API_URL__;
    this.credentials = credentials;
    this.closed = false;
    this.group = { items: new Map(), members: new Map(), xpDrops: new Map() };

    this.queueGetGameData();
    this.queueFetchGroupData();
    if (this.getGroupDataPromise) {
      void this.getGroupDataPromise.then(() => this.queueFetchGroupCollectionLogs());
    }

    window.setInterval(() => this.cleanupXPDrops(), 4000);
  }

  static async fetchAmILoggedIn({ name, token }: GroupCredentials): Promise<Response> {
    const url = `${__API_URL__}/group/${name}/am-i-logged-in`;
    return fetch(url, {
      headers: { Authorization: token },
    });
  }
  static async fetchCreateGroup(groupName: string, memberNames: Member.Name[]): Promise<RequestCreateGroup.Response> {
    return RequestCreateGroup.fetchCreateGroup(groupName, memberNames);
  }

  async fetchSkillData(period: RequestSkillData.AggregatePeriod): Promise<RequestSkillData.Response> {
    if (this.credentials === undefined) return Promise.reject(new Error("No active API connection."));

    return RequestSkillData.fetchSkillData({ baseURL: this.baseURL, credentials: this.credentials, period }).then(
      (data) => {
        for (const member of data.keys()) {
          const skillDataForMember = data.get(member) ?? [];

          const currentState = this.group.members.get(member);
          if (!currentState?.skills) continue;

          const skillsFlat: Experience[] = [];
          for (const skill of SkillsInBackendOrder) {
            skillsFlat.push(currentState.skills[skill]);
          }

          skillDataForMember.push({
            time: new Date(Date.now()),
            data: skillsFlat,
          });
        }
        return data;
      },
    );
  }

  async addGroupMember(member: Member.Name): Promise<RequestAddGroupMember.Response> {
    if (this.credentials === undefined) return Promise.reject(new Error("No active API connection."));
    return RequestAddGroupMember.addGroupMember({ baseURL: this.baseURL, credentials: this.credentials, member });
  }
  async renameGroupMember({
    oldName,
    newName,
  }: {
    oldName: Member.Name;
    newName: Member.Name;
  }): Promise<RequestRenameGroupMember.Response> {
    if (this.credentials === undefined) return Promise.reject(new Error("No active API connection."));
    return RequestRenameGroupMember.renameGroupMember({
      baseURL: this.baseURL,
      credentials: this.credentials,
      oldName,
      newName,
    });
  }
  async deleteGroupMember(member: Member.Name): Promise<RequestDeleteGroupMember.Response> {
    if (this.credentials === undefined) return Promise.reject(new Error("No active API connection."));
    return RequestDeleteGroupMember.deleteGroupMember({ baseURL: this.baseURL, credentials: this.credentials, member });
  }
}

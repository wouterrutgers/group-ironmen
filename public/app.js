// resources/components/appearance.js
var Appearance = class {
  constructor() {
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        this.updateTheme();
      });
    }
    this.updateLayout();
  }
  setLayout(layout) {
    localStorage.setItem("layout-direction", layout);
    this.updateLayout();
  }
  getLayout() {
    return localStorage.getItem("layout-direction");
  }
  updateLayout() {
    const layoutDirection = this.getLayout();
    if (layoutDirection === "row-reverse") document.querySelector(".authed-section").style.flexDirection = "row";
    else {
      const authedSection = document.querySelector(".authed-section");
      if (authedSection) authedSection.style.flexDirection = "row-reverse";
    }
  }
  setTheme(theme) {
    localStorage.setItem("theme", theme);
    this.updateTheme();
  }
  getTheme() {
    return window.getTheme();
  }
  updateTheme() {
    window.updateTheme();
  }
};
var appearance = new Appearance();

// resources/components/data/pubsub.js
var PubSub = class {
  constructor() {
    this.subscribers = /* @__PURE__ */ new Map();
    this.mostRecentPublish = /* @__PURE__ */ new Map();
  }
  subscribe(dataName, subscriber, receiveMostRecent = true) {
    if (!this.subscribers.has(dataName)) {
      this.subscribers.set(dataName, /* @__PURE__ */ new Set());
    }
    this.subscribers.get(dataName).add(subscriber);
    if (receiveMostRecent && this.mostRecentPublish.has(dataName)) {
      subscriber(...this.mostRecentPublish.get(dataName));
    }
  }
  unsubscribe(dataName, subscriber) {
    if (!this.subscribers.has(dataName)) {
      return;
    }
    this.subscribers.get(dataName).delete(subscriber);
  }
  publish(dataName, ...args) {
    this.mostRecentPublish.set(dataName, args);
    if (!this.subscribers.has(dataName)) {
      return;
    }
    for (const subscriber of this.subscribers.get(dataName)) {
      subscriber(...args);
    }
  }
  unpublishAll() {
    this.mostRecentPublish.clear();
  }
  unpublish(dataName) {
    this.mostRecentPublish.delete(dataName);
  }
  getMostRecent(dataName) {
    return this.mostRecentPublish.get(dataName);
  }
  anyoneListening(dataName) {
    return this.subscribers.has(dataName) && this.subscribers.get(dataName).size > 0;
  }
  waitUntilNextEvent(event, receiveMostRecent = true) {
    return new Promise((resolve) => {
      const subscriber = () => {
        this.unsubscribe(event, subscriber);
        resolve();
      };
      this.subscribe(event, subscriber, receiveMostRecent);
    });
  }
  waitForAllEvents(...events) {
    const waits = [];
    for (const event of events) {
      waits.push(this.waitUntilNextEvent(event));
    }
    return Promise.all(waits);
  }
};
var pubsub = new PubSub();

// resources/components/rs-tooltip/tooltip-manager.js
var TooltipManager = class {
  get globalTooltip() {
    if (this._globalTooltip) return this._globalTooltip;
    this._globalTooltip = document.querySelector("rs-tooltip");
    return this._globalTooltip;
  }
  showTooltip(tooltipText) {
    this.globalTooltip.showTooltip(tooltipText);
  }
  hideTooltip() {
    this.globalTooltip.hideTooltip();
  }
};
var tooltipManager = new TooltipManager();

// resources/components/base-element/base-element.js
var BaseElement = class extends HTMLElement {
  constructor() {
    super();
    this.eventUnbinders = /* @__PURE__ */ new Set();
    this.eventListeners = /* @__PURE__ */ new Map();
  }
  connectedCallback() {
  }
  disconnectedCallback() {
    this.unbindEvents();
    if (this.showingTooltip) {
      this.showingTooltip = false;
      tooltipManager.hideTooltip();
    }
  }
  enableTooltip() {
    this.eventListener(this, "mouseover", this.handleMouseOver.bind(this));
    this.eventListener(this, "mouseout", this.handleMouseOut.bind(this));
  }
  updateTooltip(tooltipText) {
    this.tooltipText = tooltipText;
    if (this.showingTooltip) {
      tooltipManager.showTooltip(tooltipText);
    }
  }
  handleMouseOver(mouseEvent) {
    const tooltipText = this.tooltipText || this.getAttribute("tooltip-text");
    if (tooltipText) {
      this.showingTooltip = true;
      this.updateTooltip(tooltipText.trim());
      mouseEvent.stopPropagation();
    }
  }
  handleMouseOut() {
    this.showingTooltip = false;
    tooltipManager.hideTooltip();
  }
  unbindEvents() {
    this.eventUnbinders.forEach((eventUnbinder) => {
      eventUnbinder();
    });
    this.eventUnbinders = /* @__PURE__ */ new Set();
    this.eventListeners = /* @__PURE__ */ new Map();
  }
  eventListener(subject, eventName, handler, options = {}) {
    if (!this.isConnected) return;
    if (!this.eventListeners.has(subject)) this.eventListeners.set(subject, /* @__PURE__ */ new Set());
    if (!this.eventListeners.get(subject).has(eventName)) {
      this.eventListeners.get(subject).add(eventName);
      subject.addEventListener(
        eventName,
        handler,
        Object.assign(
          {
            passive: true
          },
          options
        )
      );
      this.eventUnbinders.add(() => subject.removeEventListener(eventName, handler));
    }
  }
  subscribe(dataName, handler) {
    if (!this.isConnected) return;
    pubsub.subscribe(dataName, handler);
    this.eventUnbinders.add(() => pubsub.unsubscribe(dataName, handler));
  }
  subscribeOnce(dataName, _handler) {
    let handler = (...args) => {
      if (this.eventUnbinders.has(unbinder)) {
        this.eventUnbinders.delete(unbinder);
        unbinder();
      }
      _handler(...args);
    };
    let unbinder = () => pubsub.unsubscribe(dataName, handler);
    this.eventUnbinders.add(unbinder);
    pubsub.subscribe(dataName, handler);
  }
  html() {
    return "";
  }
  render() {
    this.innerHTML = this.html();
  }
};

// resources/components/data/storage.js
var Storage = class {
  storeGroup(groupName, groupToken) {
    localStorage.setItem("groupName", groupName);
    localStorage.setItem("groupToken", groupToken);
  }
  getGroup() {
    return {
      groupName: localStorage.getItem("groupName"),
      groupToken: localStorage.getItem("groupToken")
    };
  }
  clearGroup() {
    localStorage.removeItem("groupName");
    localStorage.removeItem("groupToken");
  }
};
var storage = new Storage();

// resources/components/men-homepage/men-homepage.js
var MenHomepage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<social-links></social-links>

<div class="men-homepage__container">
  <h1>GroupIron.men</h1>
  <div class="men-homepage__links">
    <men-link link-href="/create-group">
      <button class="men-button">Get started</button>
    </men-link>
    <men-link link-href="/demo">
      <button class="men-button">Demo</button>
    </men-link>
    ${this.hasLogin ? `
    <men-link link-href="/group">
      <button class="men-button">Go to group</button>
    </men-link>
    ` : `
    <men-link link-href="/login">
      <button class="men-button">Login</button>
    </men-link>
    `}
  </div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  get hasLogin() {
    const group = storage.getGroup();
    return group && group.groupName && group.groupToken && group.groupName !== "@EXAMPLE";
  }
};
customElements.define("men-homepage", MenHomepage);

// resources/components/wrap-routes/wrap-routes.js
var WrapRoutes = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    this.template = this.querySelector("template");
    this.path = this.getAttribute("route-path");
    this.active = false;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  enable() {
    if (!this.active) {
      this.active = true;
      this.appendChild(this.template.cloneNode(true).content);
      this.style.display = "flex";
    }
  }
  disable() {
    if (this.active) {
      this.active = false;
      this.innerHTML = "";
      this.style.display = "none";
    }
  }
};
customElements.define("wrap-routes", WrapRoutes);

// resources/components/utility.js
var Utility = class {
  constructor() {
    this.tagRegexp = /<[^>]*>/gi;
    this.loadImages();
  }
  async loadImages() {
    this.images = {};
    const localData = localStorage.getItem("images");
    if (localData) {
      this.images = JSON.parse(localData);
    }
    const response = await fetch("/data/images.json");
    const data = await response.json();
    this.images = data;
    localStorage.setItem("images", JSON.stringify(data));
  }
  callOnInterval(fn, interval, callImmediate = true) {
    if (callImmediate) {
      fn();
    }
    let nextCall = Date.now() + interval;
    return setInterval(async () => {
      const now = Date.now();
      if (now >= nextCall && document.visibilityState === "visible") {
        nextCall = Infinity;
        try {
          await fn();
        } catch (error) {
          console.error(error);
        }
        nextCall = Date.now() + interval;
      }
    }, Math.max(interval / 10, 10));
  }
  formatShortQuantity(quantity) {
    if (quantity >= 1e9) {
      return Math.floor(quantity / 1e9) + "B";
    } else if (quantity >= 1e7) {
      return Math.floor(quantity / 1e6) + "M";
    } else if (quantity >= 1e5) {
      return Math.floor(quantity / 1e3) + "K";
    }
    return quantity;
  }
  formatVeryShortQuantity(quantity) {
    if (quantity >= 1e3 && quantity < 1e5) {
      return Math.floor(quantity / 1e3) + "K";
    }
    return this.formatShortQuantity(quantity);
  }
  removeArticles(str) {
    const articles = ["a", "the", "an"];
    const words = str.split(" ");
    if (words.length <= 1) return str;
    if (articles.includes(words[0].toLowerCase())) {
      return words.splice(1).join(" ");
    }
    return str;
  }
  timeSinceLastUpdate(lastUpdated) {
    lastUpdated = new Date(lastUpdated);
    const now = /* @__PURE__ */ new Date();
    return now.getTime() - lastUpdated.getTime();
  }
  throttle(fn, interval) {
    let pause = false;
    return () => {
      if (pause) return;
      pause = true;
      setTimeout(() => {
        fn();
        pause = false;
      }, interval);
    };
  }
  setsEqual(a, b) {
    if (!a || !b) return false;
    return a.size === b.size && [...a].every((x) => b.has(x));
  }
  isBitSet(n, offset) {
    const mask = 1 << offset;
    return (n & mask) !== 0;
  }
  average(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; ++i) {
      sum += arr[i];
    }
    return sum / arr.length;
  }
  removeTags(s) {
    return s?.replace(this.tagRegexp, "");
  }
  image(src) {
    return `${src}?id=${this.images[src]}`;
  }
};
var utility = new Utility();

// resources/components/data/quest.js
var QuestState = {
  IN_PROGRESS: "IN_PROGRESS",
  NOT_STARTED: "NOT_STARTED",
  FINISHED: "FINISHED"
};
var Quest = class _Quest {
  constructor(id, state) {
    this.id = id;
    if (QuestState[state] === void 0) {
      console.error(`Unrecognized quest state ${state}`);
    }
    this.state = state;
  }
  get name() {
    return _Quest.questData[this.id].name || "UNKNOWN_QUEST";
  }
  get difficulty() {
    return _Quest.questData[this.id].difficulty;
  }
  get icon() {
    const difficulty = this.difficulty;
    switch (difficulty) {
      case "Novice":
        return utility.image("/icons/3399-0.png");
      case "Intermediate":
        return utility.image("/icons/3400-0.png");
      case "Experienced":
        return utility.image("/icons/3402-0.png");
      case "Master":
        return utility.image("/icons/3403-0.png");
      case "Grandmaster":
        return utility.image("/icons/3404-0.png");
      case "Special":
        return utility.image("/icons/3404-0.png");
    }
    console.error(`Unknown quest difficulty for icon ${difficulty}`);
    return "";
  }
  get wikiLink() {
    const name = this.name;
    const wikiName = name.replaceAll(" ", "_");
    return `https://oldschool.runescape.wiki/w/${wikiName}/Quick_guide`;
  }
  get points() {
    if (this.state === QuestState.FINISHED) {
      return _Quest.questData[this.id]?.points || 0;
    }
    return 0;
  }
  static parseQuestData(data) {
    const result = {};
    if (data) {
      for (const [questId, questState] of Object.entries(data)) {
        result[questId] = new _Quest(questId, questState);
      }
    }
    return result;
  }
  static async loadQuests() {
    const response = await fetch("/data/quest_data.json");
    _Quest.questData = await response.json();
    _Quest.freeToPlayQuests = {};
    _Quest.memberQuests = {};
    _Quest.miniQuests = {};
    _Quest.lookupByName = /* @__PURE__ */ new Map();
    _Quest.questIds = Object.keys(_Quest.questData).map((s) => parseInt(s)).sort((a, b) => a - b);
    let totalQuestPoints = 0;
    for (const [questId, questData] of Object.entries(_Quest.questData)) {
      questData.sortName = utility.removeArticles(questData.name);
      questData.points = parseInt(questData.points);
      totalQuestPoints += questData.points;
      if (questData.miniquest) {
        _Quest.miniQuests[questId] = questData;
      } else if (questData.member === false) {
        _Quest.freeToPlayQuests[questId] = questData;
      } else {
        _Quest.memberQuests[questId] = questData;
      }
      _Quest.lookupByName.set(questData.name, questId);
    }
    _Quest.totalPoints = totalQuestPoints;
    pubsub.publish("quest-data-loaded");
  }
  static randomQuestStates() {
    if (!_Quest.questData) return;
    const result = [];
    const states = Object.keys(QuestState);
    let amount = 0;
    for (const questId of Object.keys(_Quest.questData)) {
      amount = Math.max(parseInt(questId), amount);
    }
    for (let i = 0; i < amount; ++i) {
      result.push(Math.floor(Math.random() * states.length));
    }
    return result;
  }
};

// resources/components/data/item.js
var Item = class _Item {
  constructor(id, quantity) {
    if (typeof id === "string") {
      this.id = parseInt(id);
    } else {
      this.id = id;
    }
    this.quantity = quantity;
    this.visible = true;
  }
  static imageUrl(itemId, quantity) {
    const itemDetails = _Item.itemDetails[itemId];
    let imageId = itemDetails.id;
    if (itemDetails.stacks) {
      for (const stack of itemDetails.stacks) {
        if (quantity >= stack.count) {
          imageId = stack.id;
        }
      }
    }
    return utility.image(`/icons/items/${imageId}.webp`);
  }
  static itemName(itemId) {
    return _Item.itemDetails[itemId].name;
  }
  static shortQuantity(quantity) {
    return utility.formatShortQuantity(quantity);
  }
  static veryShortQuantity(quantity) {
    return utility.formatVeryShortQuantity(quantity);
  }
  get imageUrl() {
    return _Item.imageUrl(this.id, this.quantity);
  }
  get shortQuantity() {
    return _Item.shortQuantity(this.quantity);
  }
  get veryShortQuantity() {
    return _Item.veryShortQuantity(this.quantity);
  }
  get name() {
    return _Item.itemDetails[this.id].name;
  }
  get wikiLink() {
    return `https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${this.id}`;
  }
  get highAlch() {
    return _Item.itemDetails[this.id].highalch;
  }
  get gePrice() {
    if (this.id == 995) {
      return 1;
    }
    if (this.id == 13204) {
      return 1e3;
    }
    const mapping = _Item.itemDetails[this.id].mapping;
    if (!mapping) {
      return _Item.gePrices[this.id] || 0;
    }
    return mapping.reduce((total, mapping2) => {
      return total + new _Item(mapping2.id, 1).gePrice * mapping2.quantity;
    }, 0);
  }
  isValid() {
    return this.id > 0;
  }
  isRunePouch() {
    return this.quantity === 1 && (this.id === 12791 || this.id === 27281);
  }
  static parseItemData(data) {
    const result = [];
    for (let i = 0; i < data.length; ++i) {
      if (data[i].id <= 0) {
        result.push(new _Item(0, 0));
        continue;
      }
      if (!_Item.itemDetails[data[i].id]) {
        console.warn(`Unrecognized item id: ${data[i].id}`);
        continue;
      }
      const item = new _Item(data[i].id, data[i].quantity);
      result.push(item);
    }
    return result;
  }
  static async loadItems() {
    const response = await fetch("/data/item_data.json");
    _Item.itemDetails = await response.json();
    for (const [itemId, itemDetails] of Object.entries(_Item.itemDetails)) {
      const stacks = itemDetails.stacks;
      itemDetails.stacks = stacks ? stacks.map((stack) => ({ id: stack[1], count: stack[0] })) : null;
      itemDetails.id = itemId;
    }
    pubsub.publish("item-data-loaded");
  }
  static async loadGePrices() {
    const response = await api.getGePrices();
    _Item.gePrices = await response.json();
  }
  static randomItem(quantity = null) {
    const keys = Object.keys(_Item.itemDetails);
    const key = keys[keys.length * Math.random() << 0];
    const item = _Item.itemDetails[key];
    return [item.id, quantity ? quantity : Math.round(Math.random() * 1e5 + 1)];
  }
  static randomItems(count, quantity) {
    let result = [];
    for (let i = 0; i < count; ++i) {
      result.push(..._Item.randomItem(quantity));
    }
    return result;
  }
};

// resources/components/data/skill.js
var SkillName = {
  Agility: "Agility",
  Attack: "Attack",
  Construction: "Construction",
  Cooking: "Cooking",
  Crafting: "Crafting",
  Defence: "Defence",
  Farming: "Farming",
  Firemaking: "Firemaking",
  Fishing: "Fishing",
  Fletching: "Fletching",
  Herblore: "Herblore",
  Hitpoints: "Hitpoints",
  Hunter: "Hunter",
  Magic: "Magic",
  Mining: "Mining",
  Overall: "Overall",
  Prayer: "Prayer",
  Ranged: "Ranged",
  Runecraft: "Runecraft",
  Slayer: "Slayer",
  Smithing: "Smithing",
  Strength: "Strength",
  Thieving: "Thieving",
  Woodcutting: "Woodcutting"
};
var levelLookup = /* @__PURE__ */ new Map();
levelLookup.set(1, 0);
function xpForLevel(level) {
  let xp = 0;
  for (let i = 1; i <= level; ++i) {
    xp += Math.floor(i + 300 * 2 ** (i / 7));
  }
  return Math.floor(0.25 * xp);
}
for (let i = 1; i <= 126; ++i) {
  levelLookup.set(i + 1, xpForLevel(i));
}
var Skill = class _Skill {
  constructor(name, xp) {
    this.name = SkillName[name];
    this.xp = xp;
    this.level = this.calculateLevel();
  }
  static getIcon(skillName) {
    switch (skillName) {
      case SkillName.Attack:
        return "/ui/197-0.png";
      case SkillName.Strength:
        return "/ui/198-0.png";
      case SkillName.Defence:
        return "/ui/199-0.png";
      case SkillName.Ranged:
        return "/ui/200-0.png";
      case SkillName.Prayer:
        return "/ui/201-0.png";
      case SkillName.Magic:
        return "/ui/202-0.png";
      case SkillName.Hitpoints:
        return "/ui/203-0.png";
      case SkillName.Agility:
        return "/ui/204-0.png";
      case SkillName.Herblore:
        return "/ui/205-0.png";
      case SkillName.Thieving:
        return "/ui/206-0.png";
      case SkillName.Crafting:
        return "/ui/207-0.png";
      case SkillName.Fletching:
        return "/ui/208-0.png";
      case SkillName.Mining:
        return "/ui/209-0.png";
      case SkillName.Smithing:
        return "/ui/210-0.png";
      case SkillName.Fishing:
        return "/ui/211-0.png";
      case SkillName.Cooking:
        return "/ui/212-0.png";
      case SkillName.Firemaking:
        return "/ui/213-0.png";
      case SkillName.Woodcutting:
        return "/ui/214-0.png";
      case SkillName.Runecraft:
        return "/ui/215-0.png";
      case SkillName.Slayer:
        return "/ui/216-0.png";
      case SkillName.Farming:
        return "/ui/217-0.png";
      case SkillName.Hunter:
        return "/ui/220-0.png";
      case SkillName.Construction:
        return "/ui/221-0.png";
    }
    return "";
  }
  get icon() {
    return _Skill.getIcon(this.name);
  }
  calculateLevel() {
    if (this.name === SkillName.Overall) return this.level;
    for (let i = 1; i <= 126; ++i) {
      const start = levelLookup.get(i);
      const end = levelLookup.get(i + 1);
      if (this.xp >= start && this.xp < end) {
        return i;
      }
    }
    return 1;
  }
  get levelProgress() {
    const currentLevel = this.level;
    const start = levelLookup.get(currentLevel);
    const end = levelLookup.get(currentLevel + 1);
    const xpInLevel = this.xp - start;
    return xpInLevel / (end - start);
  }
  get xpUntilNextLevel() {
    const nextLevelXp = levelLookup.get(this.level + 1);
    return nextLevelXp - this.xp;
  }
  static parseSkillData(skills) {
    const result = {};
    let overallLevel = 0;
    for (const [name, xp] of Object.entries(skills)) {
      const skill = new _Skill(name, xp);
      result[name] = skill;
      if (name !== SkillName.Overall) overallLevel += Math.min(99, skill.level);
    }
    result[SkillName.Overall].level = overallLevel;
    return result;
  }
};

// resources/components/data/diaries.js
var AchievementDiary = class _AchievementDiary {
  constructor(completion) {
    this.completion = completion;
  }
  static randomDiaries() {
    return Array.from({ length: 62 }, () => Math.floor(Math.random() * 2 ** 32));
  }
  static async loadDiaries() {
    const response = await fetch("/data/diary_data.json");
    _AchievementDiary.diaries = await response.json();
  }
  static parseDiaryData(diary_vars) {
    const result = {
      Ardougne: {},
      Desert: {},
      Falador: {},
      Fremennik: {},
      Kandarin: {},
      Karamja: {},
      "Kourend & Kebos": {},
      "Lumbridge & Draynor": {},
      Morytania: {},
      Varrock: {},
      "Western Provinces": {},
      Wilderness: {}
    };
    result["Ardougne"]["Easy"] = [
      utility.isBitSet(diary_vars[0], 0),
      utility.isBitSet(diary_vars[0], 1),
      utility.isBitSet(diary_vars[0], 2),
      utility.isBitSet(diary_vars[0], 4),
      utility.isBitSet(diary_vars[0], 5),
      utility.isBitSet(diary_vars[0], 6),
      utility.isBitSet(diary_vars[0], 7),
      utility.isBitSet(diary_vars[0], 9),
      utility.isBitSet(diary_vars[0], 11),
      utility.isBitSet(diary_vars[0], 12)
    ];
    result["Ardougne"]["Medium"] = [
      utility.isBitSet(diary_vars[0], 13),
      utility.isBitSet(diary_vars[0], 14),
      utility.isBitSet(diary_vars[0], 15),
      utility.isBitSet(diary_vars[0], 16),
      utility.isBitSet(diary_vars[0], 17),
      utility.isBitSet(diary_vars[0], 18),
      utility.isBitSet(diary_vars[0], 19),
      utility.isBitSet(diary_vars[0], 20),
      utility.isBitSet(diary_vars[0], 21),
      utility.isBitSet(diary_vars[0], 23),
      utility.isBitSet(diary_vars[0], 24),
      utility.isBitSet(diary_vars[0], 25)
    ];
    result["Ardougne"]["Hard"] = [
      utility.isBitSet(diary_vars[0], 26),
      utility.isBitSet(diary_vars[0], 27),
      utility.isBitSet(diary_vars[0], 28),
      utility.isBitSet(diary_vars[0], 29),
      utility.isBitSet(diary_vars[0], 30),
      utility.isBitSet(diary_vars[0], 31),
      utility.isBitSet(diary_vars[1], 0),
      utility.isBitSet(diary_vars[1], 1),
      utility.isBitSet(diary_vars[1], 2),
      utility.isBitSet(diary_vars[1], 3),
      utility.isBitSet(diary_vars[1], 4),
      utility.isBitSet(diary_vars[1], 5)
    ];
    result["Ardougne"]["Elite"] = [
      utility.isBitSet(diary_vars[1], 6),
      utility.isBitSet(diary_vars[1], 7),
      utility.isBitSet(diary_vars[1], 9),
      utility.isBitSet(diary_vars[1], 8),
      utility.isBitSet(diary_vars[1], 10),
      utility.isBitSet(diary_vars[1], 11),
      utility.isBitSet(diary_vars[1], 12),
      utility.isBitSet(diary_vars[1], 13)
    ];
    result["Desert"]["Easy"] = [
      utility.isBitSet(diary_vars[2], 1),
      utility.isBitSet(diary_vars[2], 2),
      utility.isBitSet(diary_vars[2], 3),
      utility.isBitSet(diary_vars[2], 4),
      utility.isBitSet(diary_vars[2], 5),
      utility.isBitSet(diary_vars[2], 6),
      utility.isBitSet(diary_vars[2], 7),
      utility.isBitSet(diary_vars[2], 8),
      utility.isBitSet(diary_vars[2], 9),
      utility.isBitSet(diary_vars[2], 10),
      utility.isBitSet(diary_vars[2], 11)
    ];
    result["Desert"]["Medium"] = [
      utility.isBitSet(diary_vars[2], 12),
      utility.isBitSet(diary_vars[2], 13),
      utility.isBitSet(diary_vars[2], 14),
      utility.isBitSet(diary_vars[2], 15),
      utility.isBitSet(diary_vars[2], 16),
      utility.isBitSet(diary_vars[2], 17),
      utility.isBitSet(diary_vars[2], 18),
      utility.isBitSet(diary_vars[2], 19),
      utility.isBitSet(diary_vars[2], 20),
      utility.isBitSet(diary_vars[2], 21),
      utility.isBitSet(diary_vars[2], 22) || utility.isBitSet(diary_vars[3], 9),
      utility.isBitSet(diary_vars[2], 23)
    ];
    result["Desert"]["Hard"] = [
      utility.isBitSet(diary_vars[2], 24),
      utility.isBitSet(diary_vars[2], 25),
      utility.isBitSet(diary_vars[2], 26),
      utility.isBitSet(diary_vars[2], 27),
      utility.isBitSet(diary_vars[2], 28),
      utility.isBitSet(diary_vars[2], 29),
      utility.isBitSet(diary_vars[2], 30),
      utility.isBitSet(diary_vars[2], 31),
      utility.isBitSet(diary_vars[3], 0),
      utility.isBitSet(diary_vars[3], 1)
    ];
    result["Desert"]["Elite"] = [
      utility.isBitSet(diary_vars[3], 2),
      utility.isBitSet(diary_vars[3], 4),
      utility.isBitSet(diary_vars[3], 5),
      utility.isBitSet(diary_vars[3], 6),
      utility.isBitSet(diary_vars[3], 7),
      utility.isBitSet(diary_vars[3], 8)
    ];
    result["Falador"]["Easy"] = [
      utility.isBitSet(diary_vars[4], 0),
      utility.isBitSet(diary_vars[4], 1),
      utility.isBitSet(diary_vars[4], 2),
      utility.isBitSet(diary_vars[4], 3),
      utility.isBitSet(diary_vars[4], 4),
      utility.isBitSet(diary_vars[4], 5),
      utility.isBitSet(diary_vars[4], 6),
      utility.isBitSet(diary_vars[4], 7),
      utility.isBitSet(diary_vars[4], 8),
      utility.isBitSet(diary_vars[4], 9),
      utility.isBitSet(diary_vars[4], 10)
    ];
    result["Falador"]["Medium"] = [
      utility.isBitSet(diary_vars[4], 11),
      utility.isBitSet(diary_vars[4], 12),
      utility.isBitSet(diary_vars[4], 13),
      utility.isBitSet(diary_vars[4], 14),
      utility.isBitSet(diary_vars[4], 15),
      utility.isBitSet(diary_vars[4], 16),
      utility.isBitSet(diary_vars[4], 17),
      utility.isBitSet(diary_vars[4], 18),
      utility.isBitSet(diary_vars[4], 20),
      utility.isBitSet(diary_vars[4], 21),
      utility.isBitSet(diary_vars[4], 22),
      utility.isBitSet(diary_vars[4], 23),
      utility.isBitSet(diary_vars[4], 24),
      utility.isBitSet(diary_vars[4], 25)
    ];
    result["Falador"]["Hard"] = [
      utility.isBitSet(diary_vars[4], 26),
      utility.isBitSet(diary_vars[4], 27),
      utility.isBitSet(diary_vars[4], 28),
      utility.isBitSet(diary_vars[4], 29),
      utility.isBitSet(diary_vars[4], 30),
      utility.isBitSet(diary_vars[4], 31),
      utility.isBitSet(diary_vars[5], 0),
      utility.isBitSet(diary_vars[5], 1),
      utility.isBitSet(diary_vars[5], 2),
      utility.isBitSet(diary_vars[5], 3),
      utility.isBitSet(diary_vars[5], 4)
    ];
    result["Falador"]["Elite"] = [
      utility.isBitSet(diary_vars[5], 5),
      utility.isBitSet(diary_vars[5], 6),
      utility.isBitSet(diary_vars[5], 7),
      utility.isBitSet(diary_vars[5], 8),
      utility.isBitSet(diary_vars[5], 9),
      utility.isBitSet(diary_vars[5], 10)
    ];
    result["Fremennik"]["Easy"] = [
      utility.isBitSet(diary_vars[6], 1),
      utility.isBitSet(diary_vars[6], 2),
      utility.isBitSet(diary_vars[6], 3),
      utility.isBitSet(diary_vars[6], 4),
      utility.isBitSet(diary_vars[6], 5),
      utility.isBitSet(diary_vars[6], 6),
      utility.isBitSet(diary_vars[6], 7),
      utility.isBitSet(diary_vars[6], 8),
      utility.isBitSet(diary_vars[6], 9),
      utility.isBitSet(diary_vars[6], 10)
    ];
    result["Fremennik"]["Medium"] = [
      utility.isBitSet(diary_vars[6], 11),
      utility.isBitSet(diary_vars[6], 12),
      utility.isBitSet(diary_vars[6], 13),
      utility.isBitSet(diary_vars[6], 14),
      utility.isBitSet(diary_vars[6], 15),
      utility.isBitSet(diary_vars[6], 17),
      utility.isBitSet(diary_vars[6], 18),
      utility.isBitSet(diary_vars[6], 19),
      utility.isBitSet(diary_vars[6], 20)
    ];
    result["Fremennik"]["Hard"] = [
      utility.isBitSet(diary_vars[6], 21),
      utility.isBitSet(diary_vars[6], 23),
      utility.isBitSet(diary_vars[6], 24),
      utility.isBitSet(diary_vars[6], 25),
      utility.isBitSet(diary_vars[6], 26),
      utility.isBitSet(diary_vars[6], 27),
      utility.isBitSet(diary_vars[6], 28),
      utility.isBitSet(diary_vars[6], 29),
      utility.isBitSet(diary_vars[6], 30)
    ];
    result["Fremennik"]["Elite"] = [
      utility.isBitSet(diary_vars[6], 31),
      utility.isBitSet(diary_vars[7], 0),
      utility.isBitSet(diary_vars[7], 1),
      utility.isBitSet(diary_vars[7], 2),
      utility.isBitSet(diary_vars[7], 3),
      utility.isBitSet(diary_vars[7], 4)
    ];
    result["Kandarin"]["Easy"] = [
      utility.isBitSet(diary_vars[8], 1),
      utility.isBitSet(diary_vars[8], 2),
      utility.isBitSet(diary_vars[8], 3),
      utility.isBitSet(diary_vars[8], 4),
      utility.isBitSet(diary_vars[8], 5),
      utility.isBitSet(diary_vars[8], 6),
      utility.isBitSet(diary_vars[8], 7),
      utility.isBitSet(diary_vars[8], 8),
      utility.isBitSet(diary_vars[8], 9),
      utility.isBitSet(diary_vars[8], 10),
      utility.isBitSet(diary_vars[8], 11)
    ];
    result["Kandarin"]["Medium"] = [
      utility.isBitSet(diary_vars[8], 12),
      utility.isBitSet(diary_vars[8], 13),
      utility.isBitSet(diary_vars[8], 14),
      utility.isBitSet(diary_vars[8], 15),
      utility.isBitSet(diary_vars[8], 16),
      utility.isBitSet(diary_vars[8], 17),
      utility.isBitSet(diary_vars[8], 18),
      utility.isBitSet(diary_vars[8], 19),
      utility.isBitSet(diary_vars[8], 20),
      utility.isBitSet(diary_vars[8], 21),
      utility.isBitSet(diary_vars[8], 22),
      utility.isBitSet(diary_vars[8], 23),
      utility.isBitSet(diary_vars[8], 24),
      utility.isBitSet(diary_vars[8], 25)
    ];
    result["Kandarin"]["Hard"] = [
      utility.isBitSet(diary_vars[8], 26),
      utility.isBitSet(diary_vars[8], 27),
      utility.isBitSet(diary_vars[8], 28),
      utility.isBitSet(diary_vars[8], 29),
      utility.isBitSet(diary_vars[8], 30),
      utility.isBitSet(diary_vars[8], 31),
      utility.isBitSet(diary_vars[9], 0),
      utility.isBitSet(diary_vars[9], 1),
      utility.isBitSet(diary_vars[9], 2),
      utility.isBitSet(diary_vars[9], 3),
      utility.isBitSet(diary_vars[9], 4)
    ];
    result["Kandarin"]["Elite"] = [
      utility.isBitSet(diary_vars[9], 5),
      utility.isBitSet(diary_vars[9], 6),
      utility.isBitSet(diary_vars[9], 7),
      utility.isBitSet(diary_vars[9], 8),
      utility.isBitSet(diary_vars[9], 9),
      utility.isBitSet(diary_vars[9], 10),
      utility.isBitSet(diary_vars[9], 11)
    ];
    result["Karamja"]["Easy"] = [
      diary_vars[23] === 5,
      diary_vars[24] === 1,
      diary_vars[25] === 1,
      diary_vars[26] === 1,
      diary_vars[27] === 1,
      diary_vars[28] === 1,
      diary_vars[29] === 1,
      diary_vars[30] === 5,
      diary_vars[31] === 1,
      diary_vars[32] === 1
    ];
    result["Karamja"]["Medium"] = [
      diary_vars[33] === 1,
      diary_vars[34] === 1,
      diary_vars[35] === 1,
      diary_vars[36] === 1,
      diary_vars[37] === 1,
      diary_vars[38] === 1,
      diary_vars[39] === 1,
      diary_vars[40] === 1,
      diary_vars[41] === 1,
      diary_vars[42] === 1,
      diary_vars[43] === 1,
      diary_vars[44] === 1,
      diary_vars[45] === 1,
      diary_vars[46] === 1,
      diary_vars[47] === 1,
      diary_vars[48] === 1,
      diary_vars[49] === 1,
      diary_vars[50] === 1,
      diary_vars[51] === 1
    ];
    result["Karamja"]["Hard"] = [
      diary_vars[52] === 1,
      diary_vars[53] === 1,
      diary_vars[54] === 1,
      diary_vars[55] === 1,
      diary_vars[56] === 1,
      diary_vars[57] === 1,
      diary_vars[58] === 1,
      diary_vars[59] === 5,
      diary_vars[60] === 1,
      diary_vars[61] === 1
    ];
    result["Karamja"]["Elite"] = [
      utility.isBitSet(diary_vars[10], 1),
      utility.isBitSet(diary_vars[10], 2),
      utility.isBitSet(diary_vars[10], 3),
      utility.isBitSet(diary_vars[10], 4),
      utility.isBitSet(diary_vars[10], 5)
    ];
    result["Kourend & Kebos"]["Easy"] = [
      utility.isBitSet(diary_vars[11], 1),
      utility.isBitSet(diary_vars[11], 2),
      utility.isBitSet(diary_vars[11], 3),
      utility.isBitSet(diary_vars[11], 4),
      utility.isBitSet(diary_vars[11], 5),
      utility.isBitSet(diary_vars[11], 6),
      utility.isBitSet(diary_vars[11], 7),
      utility.isBitSet(diary_vars[11], 8),
      utility.isBitSet(diary_vars[11], 9),
      utility.isBitSet(diary_vars[11], 10),
      utility.isBitSet(diary_vars[11], 11),
      utility.isBitSet(diary_vars[11], 12)
    ];
    result["Kourend & Kebos"]["Medium"] = [
      utility.isBitSet(diary_vars[11], 25),
      utility.isBitSet(diary_vars[11], 13),
      utility.isBitSet(diary_vars[11], 14),
      utility.isBitSet(diary_vars[11], 15),
      utility.isBitSet(diary_vars[11], 21),
      utility.isBitSet(diary_vars[11], 16),
      utility.isBitSet(diary_vars[11], 17),
      utility.isBitSet(diary_vars[11], 18),
      utility.isBitSet(diary_vars[11], 19),
      utility.isBitSet(diary_vars[11], 22),
      utility.isBitSet(diary_vars[11], 20),
      utility.isBitSet(diary_vars[11], 23),
      utility.isBitSet(diary_vars[11], 24)
    ];
    result["Kourend & Kebos"]["Hard"] = [
      utility.isBitSet(diary_vars[11], 26),
      utility.isBitSet(diary_vars[11], 27),
      utility.isBitSet(diary_vars[11], 28),
      utility.isBitSet(diary_vars[11], 29),
      utility.isBitSet(diary_vars[11], 31),
      utility.isBitSet(diary_vars[11], 30),
      utility.isBitSet(diary_vars[12], 0),
      utility.isBitSet(diary_vars[12], 1),
      utility.isBitSet(diary_vars[12], 2),
      utility.isBitSet(diary_vars[12], 3)
    ];
    result["Kourend & Kebos"]["Elite"] = [
      utility.isBitSet(diary_vars[12], 4),
      utility.isBitSet(diary_vars[12], 5),
      utility.isBitSet(diary_vars[12], 6),
      utility.isBitSet(diary_vars[12], 7),
      utility.isBitSet(diary_vars[12], 8),
      utility.isBitSet(diary_vars[12], 9),
      utility.isBitSet(diary_vars[12], 10),
      utility.isBitSet(diary_vars[12], 11)
    ];
    result["Lumbridge & Draynor"]["Easy"] = [
      utility.isBitSet(diary_vars[13], 1),
      utility.isBitSet(diary_vars[13], 2),
      utility.isBitSet(diary_vars[13], 3),
      utility.isBitSet(diary_vars[13], 4),
      utility.isBitSet(diary_vars[13], 5),
      utility.isBitSet(diary_vars[13], 6),
      utility.isBitSet(diary_vars[13], 7),
      utility.isBitSet(diary_vars[13], 8),
      utility.isBitSet(diary_vars[13], 9),
      utility.isBitSet(diary_vars[13], 10),
      utility.isBitSet(diary_vars[13], 11),
      utility.isBitSet(diary_vars[13], 12)
    ];
    result["Lumbridge & Draynor"]["Medium"] = [
      utility.isBitSet(diary_vars[13], 13),
      utility.isBitSet(diary_vars[13], 14),
      utility.isBitSet(diary_vars[13], 15),
      utility.isBitSet(diary_vars[13], 16),
      utility.isBitSet(diary_vars[13], 17),
      utility.isBitSet(diary_vars[13], 18),
      utility.isBitSet(diary_vars[13], 19),
      utility.isBitSet(diary_vars[13], 20),
      utility.isBitSet(diary_vars[13], 21),
      utility.isBitSet(diary_vars[13], 22),
      utility.isBitSet(diary_vars[13], 23),
      utility.isBitSet(diary_vars[13], 24)
    ];
    result["Lumbridge & Draynor"]["Hard"] = [
      utility.isBitSet(diary_vars[13], 25),
      utility.isBitSet(diary_vars[13], 26),
      utility.isBitSet(diary_vars[13], 27),
      utility.isBitSet(diary_vars[13], 28),
      utility.isBitSet(diary_vars[13], 29),
      utility.isBitSet(diary_vars[13], 30),
      utility.isBitSet(diary_vars[13], 31),
      utility.isBitSet(diary_vars[14], 0),
      utility.isBitSet(diary_vars[14], 1),
      utility.isBitSet(diary_vars[14], 2),
      utility.isBitSet(diary_vars[14], 3)
    ];
    result["Lumbridge & Draynor"]["Elite"] = [
      utility.isBitSet(diary_vars[14], 4),
      utility.isBitSet(diary_vars[14], 5),
      utility.isBitSet(diary_vars[14], 6),
      utility.isBitSet(diary_vars[14], 7),
      utility.isBitSet(diary_vars[14], 8),
      utility.isBitSet(diary_vars[14], 9)
    ];
    result["Morytania"]["Easy"] = [
      utility.isBitSet(diary_vars[15], 1),
      utility.isBitSet(diary_vars[15], 2),
      utility.isBitSet(diary_vars[15], 3),
      utility.isBitSet(diary_vars[15], 4),
      utility.isBitSet(diary_vars[15], 5),
      utility.isBitSet(diary_vars[15], 6),
      utility.isBitSet(diary_vars[15], 7),
      utility.isBitSet(diary_vars[15], 8),
      utility.isBitSet(diary_vars[15], 9),
      utility.isBitSet(diary_vars[15], 10),
      utility.isBitSet(diary_vars[15], 11)
    ];
    result["Morytania"]["Medium"] = [
      utility.isBitSet(diary_vars[15], 12),
      utility.isBitSet(diary_vars[15], 13),
      utility.isBitSet(diary_vars[15], 14),
      utility.isBitSet(diary_vars[15], 15),
      utility.isBitSet(diary_vars[15], 16),
      utility.isBitSet(diary_vars[15], 17),
      utility.isBitSet(diary_vars[15], 18),
      utility.isBitSet(diary_vars[15], 19),
      utility.isBitSet(diary_vars[15], 20),
      utility.isBitSet(diary_vars[15], 21),
      utility.isBitSet(diary_vars[15], 22)
    ];
    result["Morytania"]["Hard"] = [
      utility.isBitSet(diary_vars[15], 23),
      utility.isBitSet(diary_vars[15], 24),
      utility.isBitSet(diary_vars[15], 25),
      utility.isBitSet(diary_vars[15], 26),
      utility.isBitSet(diary_vars[15], 27),
      utility.isBitSet(diary_vars[15], 28),
      utility.isBitSet(diary_vars[15], 29),
      utility.isBitSet(diary_vars[15], 30),
      utility.isBitSet(diary_vars[16], 1),
      utility.isBitSet(diary_vars[16], 2)
    ];
    result["Morytania"]["Elite"] = [
      utility.isBitSet(diary_vars[16], 3),
      utility.isBitSet(diary_vars[16], 4),
      utility.isBitSet(diary_vars[16], 5),
      utility.isBitSet(diary_vars[16], 6),
      utility.isBitSet(diary_vars[16], 7),
      utility.isBitSet(diary_vars[16], 8)
    ];
    result["Varrock"]["Easy"] = [
      utility.isBitSet(diary_vars[17], 1),
      utility.isBitSet(diary_vars[17], 2),
      utility.isBitSet(diary_vars[17], 3),
      utility.isBitSet(diary_vars[17], 4),
      utility.isBitSet(diary_vars[17], 5),
      utility.isBitSet(diary_vars[17], 6),
      utility.isBitSet(diary_vars[17], 7),
      utility.isBitSet(diary_vars[17], 8),
      utility.isBitSet(diary_vars[17], 9),
      utility.isBitSet(diary_vars[17], 10),
      utility.isBitSet(diary_vars[17], 11),
      utility.isBitSet(diary_vars[17], 12),
      utility.isBitSet(diary_vars[17], 13),
      utility.isBitSet(diary_vars[17], 14)
    ];
    result["Varrock"]["Medium"] = [
      utility.isBitSet(diary_vars[17], 15),
      utility.isBitSet(diary_vars[17], 16),
      utility.isBitSet(diary_vars[17], 18),
      utility.isBitSet(diary_vars[17], 19),
      utility.isBitSet(diary_vars[17], 20),
      utility.isBitSet(diary_vars[17], 21),
      utility.isBitSet(diary_vars[17], 22),
      utility.isBitSet(diary_vars[17], 23),
      utility.isBitSet(diary_vars[17], 24),
      utility.isBitSet(diary_vars[17], 25),
      utility.isBitSet(diary_vars[17], 26),
      utility.isBitSet(diary_vars[17], 27),
      utility.isBitSet(diary_vars[17], 28)
    ];
    result["Varrock"]["Hard"] = [
      utility.isBitSet(diary_vars[17], 29),
      utility.isBitSet(diary_vars[17], 30),
      utility.isBitSet(diary_vars[17], 31),
      utility.isBitSet(diary_vars[18], 0),
      utility.isBitSet(diary_vars[18], 1),
      utility.isBitSet(diary_vars[18], 2),
      utility.isBitSet(diary_vars[18], 3),
      utility.isBitSet(diary_vars[18], 4),
      utility.isBitSet(diary_vars[18], 5),
      utility.isBitSet(diary_vars[18], 6)
    ];
    result["Varrock"]["Elite"] = [
      utility.isBitSet(diary_vars[18], 7),
      utility.isBitSet(diary_vars[18], 8),
      utility.isBitSet(diary_vars[18], 9),
      utility.isBitSet(diary_vars[18], 10),
      utility.isBitSet(diary_vars[18], 11)
    ];
    result["Western Provinces"]["Easy"] = [
      utility.isBitSet(diary_vars[19], 1),
      utility.isBitSet(diary_vars[19], 2),
      utility.isBitSet(diary_vars[19], 3),
      utility.isBitSet(diary_vars[19], 4),
      utility.isBitSet(diary_vars[19], 5),
      utility.isBitSet(diary_vars[19], 6),
      utility.isBitSet(diary_vars[19], 7),
      utility.isBitSet(diary_vars[19], 8),
      utility.isBitSet(diary_vars[19], 9),
      utility.isBitSet(diary_vars[19], 10),
      utility.isBitSet(diary_vars[19], 11)
    ];
    result["Western Provinces"]["Medium"] = [
      utility.isBitSet(diary_vars[19], 12),
      utility.isBitSet(diary_vars[19], 13),
      utility.isBitSet(diary_vars[19], 14),
      utility.isBitSet(diary_vars[19], 15),
      utility.isBitSet(diary_vars[19], 16),
      utility.isBitSet(diary_vars[19], 17),
      utility.isBitSet(diary_vars[19], 18),
      utility.isBitSet(diary_vars[19], 19),
      utility.isBitSet(diary_vars[19], 20),
      utility.isBitSet(diary_vars[19], 21),
      utility.isBitSet(diary_vars[19], 22),
      utility.isBitSet(diary_vars[19], 23),
      utility.isBitSet(diary_vars[19], 24)
    ];
    result["Western Provinces"]["Hard"] = [
      utility.isBitSet(diary_vars[19], 25),
      utility.isBitSet(diary_vars[19], 26),
      utility.isBitSet(diary_vars[19], 27),
      utility.isBitSet(diary_vars[19], 28),
      utility.isBitSet(diary_vars[19], 29),
      utility.isBitSet(diary_vars[19], 30),
      utility.isBitSet(diary_vars[19], 31),
      utility.isBitSet(diary_vars[20], 0),
      utility.isBitSet(diary_vars[20], 1),
      utility.isBitSet(diary_vars[20], 2),
      utility.isBitSet(diary_vars[20], 3),
      utility.isBitSet(diary_vars[20], 4),
      utility.isBitSet(diary_vars[20], 5)
    ];
    result["Western Provinces"]["Elite"] = [
      utility.isBitSet(diary_vars[20], 6),
      utility.isBitSet(diary_vars[20], 7),
      utility.isBitSet(diary_vars[20], 8),
      utility.isBitSet(diary_vars[20], 9),
      utility.isBitSet(diary_vars[20], 12),
      utility.isBitSet(diary_vars[20], 13),
      utility.isBitSet(diary_vars[20], 14)
    ];
    result["Wilderness"]["Easy"] = [
      utility.isBitSet(diary_vars[21], 1),
      utility.isBitSet(diary_vars[21], 2),
      utility.isBitSet(diary_vars[21], 3),
      utility.isBitSet(diary_vars[21], 4),
      utility.isBitSet(diary_vars[21], 5),
      utility.isBitSet(diary_vars[21], 6),
      utility.isBitSet(diary_vars[21], 7),
      utility.isBitSet(diary_vars[21], 8),
      utility.isBitSet(diary_vars[21], 9),
      utility.isBitSet(diary_vars[21], 10),
      utility.isBitSet(diary_vars[21], 11),
      utility.isBitSet(diary_vars[21], 12)
    ];
    result["Wilderness"]["Medium"] = [
      utility.isBitSet(diary_vars[21], 13),
      utility.isBitSet(diary_vars[21], 14),
      utility.isBitSet(diary_vars[21], 15),
      utility.isBitSet(diary_vars[21], 16),
      utility.isBitSet(diary_vars[21], 18),
      utility.isBitSet(diary_vars[21], 19),
      utility.isBitSet(diary_vars[21], 20),
      utility.isBitSet(diary_vars[21], 21),
      utility.isBitSet(diary_vars[21], 22),
      utility.isBitSet(diary_vars[21], 23),
      utility.isBitSet(diary_vars[21], 24)
    ];
    result["Wilderness"]["Hard"] = [
      utility.isBitSet(diary_vars[21], 25),
      utility.isBitSet(diary_vars[21], 26),
      utility.isBitSet(diary_vars[21], 27),
      utility.isBitSet(diary_vars[21], 28),
      utility.isBitSet(diary_vars[21], 29),
      utility.isBitSet(diary_vars[21], 30),
      utility.isBitSet(diary_vars[21], 31),
      utility.isBitSet(diary_vars[22], 0),
      utility.isBitSet(diary_vars[22], 1),
      utility.isBitSet(diary_vars[22], 2)
    ];
    result["Wilderness"]["Elite"] = [
      utility.isBitSet(diary_vars[22], 3),
      utility.isBitSet(diary_vars[22], 5),
      utility.isBitSet(diary_vars[22], 7),
      utility.isBitSet(diary_vars[22], 8),
      utility.isBitSet(diary_vars[22], 9),
      utility.isBitSet(diary_vars[22], 10),
      utility.isBitSet(diary_vars[22], 11)
    ];
    return new _AchievementDiary(result);
  }
};

// resources/components/data/member-data.js
var playerColors = [
  "hsl(41, 100%, 40%)",
  // yellow
  "hsl(151, 69%, 26%)",
  // green
  "hsl(210, 50%, 40%)",
  // blue
  "hsl(355, 76%, 36%)",
  // red
  "hsl(288, 65%, 19%)"
  // purple
];
var currentColor = 0;
var MemberData = class {
  constructor(name) {
    this.name = name;
    this.itemQuantities = {
      bank: /* @__PURE__ */ new Map(),
      inventory: /* @__PURE__ */ new Map(),
      equipment: /* @__PURE__ */ new Map(),
      runePouch: /* @__PURE__ */ new Map(),
      seedVault: /* @__PURE__ */ new Map()
    };
    this.inactive = false;
    this.color = playerColors[currentColor];
    currentColor = (currentColor + 1) % playerColors.length;
    this.hue = this.color.substring(this.color.indexOf("(") + 1, this.color.indexOf(","));
  }
  update(memberData) {
    let updatedAttributes = /* @__PURE__ */ new Set();
    if (memberData.stats) {
      this.stats = memberData.stats;
      this.publishUpdate("stats");
      updatedAttributes.add("stats");
    }
    if (memberData.last_updated) {
      this.lastUpdated = new Date(memberData.last_updated);
      const timeSinceLastUpdated = utility.timeSinceLastUpdate(memberData.last_updated);
      let wasInactive = this.inactive;
      this.inactive = !isNaN(timeSinceLastUpdated) && timeSinceLastUpdated > 300 * 1e3;
      if (!wasInactive && this.inactive) {
        this.publishUpdate("inactive");
      } else if (wasInactive && !this.inactive) {
        this.publishUpdate("active");
      }
    }
    if (memberData.coordinates) {
      this.coordinates = memberData.coordinates;
      pubsub.publish("coordinates", this);
      updatedAttributes.add("coordinates");
    }
    if (memberData.quests) {
      this.quests = Quest.parseQuestData(memberData.quests);
      this.publishUpdate("quests");
      updatedAttributes.add("quests");
    }
    if (memberData.skills) {
      const previousSkills = this.skills;
      this.skills = Skill.parseSkillData(memberData.skills);
      this.publishUpdate("skills");
      updatedAttributes.add("skills");
      this.computeXpDrops(previousSkills);
      this.computeCombatLevel();
    }
    if (memberData.inventory) {
      this.inventory = Item.parseItemData(memberData.inventory);
      this.updateItemQuantitiesIn("inventory");
      this.publishUpdate("inventory");
      updatedAttributes.add("inventory");
    }
    if (memberData.equipment) {
      this.equipment = Item.parseItemData(memberData.equipment);
      this.updateItemQuantitiesIn("equipment");
      this.publishUpdate("equipment");
      updatedAttributes.add("equipment");
    }
    if (memberData.bank) {
      this.bank = Item.parseItemData(memberData.bank);
      this.updateItemQuantitiesIn("bank");
      this.publishUpdate("bank");
      updatedAttributes.add("bank");
    }
    if (memberData.rune_pouch) {
      this.runePouch = Item.parseItemData(memberData.rune_pouch);
      this.updateItemQuantitiesIn("runePouch");
      this.publishUpdate("runePouch");
      updatedAttributes.add("runePouch");
    }
    if (memberData.interacting) {
      memberData.interacting.name = utility.removeTags(memberData.interacting.name);
      this.interacting = memberData.interacting;
      this.publishUpdate("interacting");
    }
    if (memberData.seed_vault) {
      this.seedVault = Item.parseItemData(memberData.seed_vault);
      this.updateItemQuantitiesIn("seedVault");
      this.publishUpdate("seedVault");
      updatedAttributes.add("seedVault");
    }
    if (memberData.diary_vars) {
      this.diaries = AchievementDiary.parseDiaryData(memberData.diary_vars);
      this.publishUpdate("diaries");
    }
    return updatedAttributes;
  }
  publishUpdate(attributeName) {
    pubsub.publish(`${attributeName}:${this.name}`, this[attributeName], this);
  }
  totalItemQuantity(itemId) {
    return (this.itemQuantities.bank.get(itemId) || 0) + (this.itemQuantities.equipment.get(itemId) || 0) + (this.itemQuantities.inventory.get(itemId) || 0) + (this.itemQuantities.runePouch.get(itemId) || 0) + (this.itemQuantities.seedVault.get(itemId) || 0);
  }
  updateItemQuantitiesIn(inventoryName) {
    this.itemQuantities[inventoryName] = /* @__PURE__ */ new Map();
    for (const item of this.itemsIn(inventoryName)) {
      const x = this.itemQuantities[inventoryName];
      x.set(item.id, (x.get(item.id) || 0) + item.quantity);
    }
  }
  *allItems() {
    const yieldedIds = /* @__PURE__ */ new Set();
    for (const item of this.itemsIn("inventory", "bank", "equipment", "runePouch", "seedVault")) {
      if (!yieldedIds.has(item.id)) {
        yieldedIds.add(item.id);
        yield item;
      }
    }
  }
  *itemsIn(...inventoryNames) {
    for (const inventoryName of inventoryNames) {
      if (this[inventoryName] === void 0) continue;
      for (const item of this[inventoryName]) {
        if (item.isValid()) yield item;
      }
    }
  }
  computeXpDrops(previousSkills) {
    if (!previousSkills) {
      for (const skillName of Object.values(SkillName)) {
        pubsub.publish(`${skillName}:${this.name}`, this.skills[skillName]);
      }
      return;
    }
    const xpDrops = [];
    for (const skillName of Object.values(SkillName)) {
      if (!this.skills[skillName] || !previousSkills[skillName]) continue;
      const xpDiff = this.skills[skillName].xp - previousSkills[skillName].xp;
      if (xpDiff > 0 && skillName !== "Overall") xpDrops.push(new Skill(skillName, xpDiff));
      if (xpDiff !== 0) pubsub.publish(`${skillName}:${this.name}`, this.skills[skillName]);
    }
    if (xpDrops.length > 0) {
      pubsub.publish(`xp:${this.name}`, xpDrops);
    }
  }
  computeCombatLevel() {
    const s = 0.325;
    const defence = Math.min(this.skills.Defence.level, 99);
    const hitpoints = Math.min(this.skills.Hitpoints.level, 99);
    const prayer = Math.min(this.skills.Prayer.level, 99);
    const attack = Math.min(this.skills.Attack.level, 99);
    const strength = Math.min(this.skills.Strength.level, 99);
    const ranged = Math.min(this.skills.Ranged.level, 99);
    const magic = Math.min(this.skills.Magic.level, 99);
    const base = (defence + hitpoints + Math.floor(prayer / 2)) / 4;
    const melee = s * (attack + strength);
    const range = s * (Math.floor(ranged / 2) + ranged);
    const mage = s * (Math.floor(magic / 2) + magic);
    const combatLevel = Math.floor(base + Math.max(melee, range, mage));
    if (combatLevel !== this.combatLevel) {
      this.combatLevel = combatLevel;
      this.publishUpdate("combatLevel");
    }
  }
  hasQuestComplete(questName) {
    const questId = Quest.lookupByName.get(questName);
    const questComplete = this.quests[questId].state === QuestState.FINISHED;
    return questComplete;
  }
};

// resources/components/data/group-data.js
var GroupData = class _GroupData {
  constructor() {
    this.members = /* @__PURE__ */ new Map();
    this.groupItems = {};
    this.textFilter = "";
    this.textFilters = [""];
    this.playerFilter = "@ALL";
  }
  update(groupData2) {
    this.transformFromStorage(groupData2);
    groupData2.sort((a, b) => a.name.localeCompare(b.name));
    const removedMembers = new Set(this.members.keys());
    let updatedAttributes = /* @__PURE__ */ new Set();
    let lastUpdated = /* @__PURE__ */ new Date(0);
    for (const memberData of groupData2) {
      const memberName = memberData.name;
      removedMembers.delete(memberName);
      if (!this.members.has(memberName)) {
        this.members.set(memberName, new MemberData(memberName));
      }
      const member = this.members.get(memberName);
      member.update(memberData).forEach((attribute) => updatedAttributes.add(attribute));
      if (member.lastUpdated && member.lastUpdated > lastUpdated) {
        lastUpdated = member.lastUpdated;
      }
    }
    for (const removedMember of removedMembers.values()) {
      this.members.delete(removedMember);
    }
    let anyItemUpdates = false;
    if (removedMembers.size > 0) {
      for (const groupItem of Object.values(this.groupItems)) {
        for (const removedMember of removedMembers.values()) {
          if (groupItem.quantities?.[removedMember]) {
            groupItem.quantity -= groupItem.quantities[removedMember];
            if (groupItem.quantity === 0) {
              delete this.groupItems[groupItem.id];
            } else {
              delete groupItem.quantities[removedMember];
            }
            anyItemUpdates = true;
          }
        }
      }
    }
    let receivedItemData = updatedAttributes.has("inventory") || updatedAttributes.has("bank") || updatedAttributes.has("equipment") || updatedAttributes.has("runePouch") || updatedAttributes.has("seedVault");
    const encounteredItemIds = /* @__PURE__ */ new Set();
    if (receivedItemData) {
      for (const item of this.allItems()) {
        encounteredItemIds.add(item.id);
        const previous = this.groupItems[item.id];
        const itemQuantities = this.itemQuantities(item.id);
        if (!this.quantitiesEqual(previous?.quantities, itemQuantities)) {
          let total = 0;
          for (const quantity of Object.values(itemQuantities)) {
            total += quantity;
          }
          let groupItem = this.groupItems[item.id];
          let applyFilter = false;
          if (!groupItem) {
            groupItem = new Item(item.id, 0);
            applyFilter = true;
          }
          groupItem.quantity = total;
          groupItem.quantities = itemQuantities;
          this.groupItems[item.id] = groupItem;
          if (applyFilter) {
            groupItem.visible = this.shouldItemBeVisible(groupItem, this.textFilters, this.playerFilter);
          }
          pubsub.publish(`item-update:${item.id}`, groupItem);
          anyItemUpdates = true;
        }
      }
      for (const item of Object.values(this.groupItems)) {
        if (!encounteredItemIds.has(item.id)) {
          delete this.groupItems[item.id];
          anyItemUpdates = true;
        }
      }
    }
    const [lastMemberListPublished] = pubsub.getMostRecent("members-updated") || [];
    const previousNames = lastMemberListPublished?.map((x) => x.name);
    const currentNames = [...this.members.values()].map((x) => x.name);
    const membersUpdated = !utility.setsEqual(new Set(currentNames), new Set(previousNames));
    if (membersUpdated) {
      pubsub.publish("members-updated", [...this.members.values()]);
    }
    if (anyItemUpdates) {
      pubsub.publish("items-updated");
    }
    return new Date(lastUpdated.getTime() + 1);
  }
  convertFilterToFilterList(filter) {
    if (!filter.includes("|")) return [filter];
    const splitFilters = filter.split("|");
    const resultFilters = [];
    splitFilters.forEach((splitFilter) => {
      const trimmedFilter = splitFilter.trim();
      if (trimmedFilter.length !== 0) {
        resultFilters.push(trimmedFilter);
      }
    });
    return resultFilters;
  }
  isExactItem(item, filter) {
    const filterWord = filter.replaceAll('"', "");
    if (item.name.toLowerCase() === filterWord || item.id.toString() === filterWord) {
      return true;
    }
    return false;
  }
  passesTextFilter(item, textFilters) {
    for (const filter of textFilters) {
      if (filter.startsWith('"') && filter.endsWith('"') && this.isExactItem(item, filter)) {
        return true;
      } else if (filter.length === 0 || item.name.toLowerCase().includes(filter) || item.id.toString() === filter) {
        return true;
      }
    }
    return false;
  }
  passesPlayerFilter(item, playerFilter) {
    return playerFilter === "@ALL" || item.quantities[playerFilter] === void 0 || item.quantities[playerFilter] > 0;
  }
  shouldItemBeVisible(item, textFilters, playerFilter) {
    if (!item || !item.quantities) return false;
    return this.passesTextFilter(item, textFilters) && this.passesPlayerFilter(item, playerFilter);
  }
  applyTextFilter(textFilter) {
    this.textFilter = textFilter || "";
    const textFilters = this.convertFilterToFilterList(textFilter);
    this.textFilters = textFilters;
    const items = Object.values(this.groupItems);
    for (const item of items) {
      item.visible = this.shouldItemBeVisible(item, textFilters, this.playerFilter);
    }
  }
  applyPlayerFilter(playerFilter) {
    this.playerFilter = playerFilter;
    const items = Object.values(this.groupItems);
    for (const item of items) {
      item.visible = this.shouldItemBeVisible(item, this.textFilters, playerFilter);
    }
  }
  itemQuantities(itemId) {
    let result = {};
    for (const member of this.members.values()) {
      result[member.name] = member.totalItemQuantity(itemId);
    }
    return result;
  }
  inventoryQuantityForItem(itemId, memberName, inventoryType) {
    return this.members.get(memberName)?.itemQuantities?.[inventoryType]?.get(itemId) || 0;
  }
  quantitiesEqual(a, b) {
    if (!a || !b) return false;
    for (const member of this.members.values()) {
      if (a[member.name] !== b[member.name]) return false;
    }
    return true;
  }
  *allItems() {
    const yieldedIds = /* @__PURE__ */ new Set();
    for (const member of this.members.values()) {
      for (const item of member.allItems()) {
        if (!yieldedIds.has(item.id)) {
          yieldedIds.add(item.id);
          yield item;
        }
      }
    }
  }
  static transformItemsFromStorage(items) {
    if (items === void 0 || items === null) return;
    let result = [];
    for (let i = 0; i < items.length; i += 2) {
      result.push({
        id: items[i],
        quantity: items[i + 1]
      });
    }
    return result;
  }
  static transformSkillsFromStorage(skills) {
    if (skills === void 0 || skills === null) return;
    let result = {};
    let i = 0;
    let overall = 0;
    const hasOverallXp = skills.length !== 23;
    for (const skillName of Object.keys(SkillName)) {
      if (skillName !== SkillName.Overall || hasOverallXp) {
        result[skillName] = skills[i];
        if (skillName !== SkillName.Overall) {
          overall += skills[i];
        }
        i += 1;
      }
    }
    result[SkillName.Overall] = overall;
    return result;
  }
  static transformStatsFromStorage(stats) {
    if (stats === void 0 || stats === null) return;
    return {
      hitpoints: {
        current: stats[0],
        max: stats[1]
      },
      prayer: {
        current: stats[2],
        max: stats[3]
      },
      energy: {
        current: stats[4],
        max: 1e4
      },
      world: stats[6]
    };
  }
  static transformCoordinatesFromStorage(coordinates) {
    if (coordinates === void 0 || coordinates === null) return;
    const xOffset = 128;
    const yOffset = 1;
    return {
      x: coordinates[0] + xOffset,
      y: coordinates[1] + yOffset,
      plane: coordinates[2]
    };
  }
  static transformQuestsFromStorage(quests) {
    if (quests === void 0 || quests === null) return;
    const result = {};
    const questStates = Object.keys(QuestState);
    const questIds = Quest.questIds;
    for (let i = 0; i < quests.length; ++i) {
      const questState = quests[i];
      const questId = questIds[i];
      result[questId] = questStates[questState];
    }
    return result;
  }
  transformFromStorage(groupData2) {
    for (const memberData of groupData2) {
      memberData.inventory = _GroupData.transformItemsFromStorage(memberData.inventory);
      memberData.bank = _GroupData.transformItemsFromStorage(memberData.bank);
      memberData.equipment = _GroupData.transformItemsFromStorage(memberData.equipment);
      memberData.rune_pouch = _GroupData.transformItemsFromStorage(memberData.rune_pouch);
      memberData.seed_vault = _GroupData.transformItemsFromStorage(memberData.seed_vault);
      memberData.skills = _GroupData.transformSkillsFromStorage(memberData.skills);
      memberData.stats = _GroupData.transformStatsFromStorage(memberData.stats);
      memberData.coordinates = _GroupData.transformCoordinatesFromStorage(memberData.coordinates);
      memberData.quests = _GroupData.transformQuestsFromStorage(memberData.quests);
      if (memberData.interacting) {
        memberData.interacting.location = _GroupData.transformCoordinatesFromStorage([
          memberData.interacting.location.x,
          memberData.interacting.location.y,
          memberData.interacting.location.plane
        ]);
      }
    }
  }
};
var groupData = new GroupData();

// resources/components/skill-graph/skill-graph.js
var SkillGraph = class _SkillGraph extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="skill-graph__top">
  <img class="skill-graph__skill-image" loading="lazy" src="${Skill.getIcon(this.skillName)}" />
  <div class="skill-graph__container rsborder-tiny">
    <canvas></canvas>
  </div>
</div>

<div class="skill-graph__table-container"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.period = this.getAttribute("data-period");
    this.skillName = this.getAttribute("skill-name");
    this.render();
    this.tableContainer = this.querySelector(".skill-graph__table-container");
    this.ctx = this.querySelector("canvas").getContext("2d");
    this.subscribeOnce("get-group-data", this.create.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.chart) {
      this.chart.destroy();
    }
  }
  create(groupData2) {
    if (!this.isConnected) return;
    this.currentGroupData = groupData2;
    this.dates = _SkillGraph.datesForPeriod(this.period);
    const dataSets = this.dataSets(this.skillName);
    this.createChart(dataSets);
    this.createTable(dataSets);
  }
  tableDataForDataSet(dataSet) {
    let xpGain = dataSet.data[dataSet.data.length - 1];
    if (isNaN(xpGain)) xpGain = 0;
    return {
      xpGain,
      color: dataSet.backgroundColor
    };
  }
  createTable(dataSets) {
    const dataSetsSkills = {
      [this.skillName]: dataSets
    };
    const skillNames = Object.values(SkillName).filter((x) => x !== SkillName.Overall).sort((a, b) => {
      return a.localeCompare(b);
    });
    if (this.skillName === SkillName.Overall) {
      for (const skillName of skillNames) {
        dataSetsSkills[skillName] = this.dataSets(skillName);
      }
    }
    const tableData = {};
    for (const [skillName, dataSets2] of Object.entries(dataSetsSkills)) {
      let totalXpGain = 0;
      for (const dataSet of dataSets2) {
        if (!tableData[dataSet.label]) {
          tableData[dataSet.label] = {};
        }
        tableData[dataSet.label][skillName] = this.tableDataForDataSet(dataSet);
        totalXpGain += tableData[dataSet.label][skillName].xpGain;
      }
      for (const dataSet of dataSets2) {
        tableData[dataSet.label][skillName].totalXpGain = totalXpGain;
      }
    }
    const row = (cls, label, data, totalXpGain) => {
      const xpGainPercent = Math.round(data.xpGain / totalXpGain * 100);
      const skillIcon = Skill.getIcon(label);
      const skillImg = skillIcon.length ? `<img src="${Skill.getIcon(label)}" />` : "";
      return `
<tr class="${cls}" style="background: linear-gradient(90deg, ${data.color} ${xpGainPercent}%, transparent ${xpGainPercent}%)">
  <td>${skillImg}${label}</td>
  <td class="skill-graph__xp-change-data">${data.xpGain > 0 ? "+" : ""}${data.xpGain.toLocaleString()}</td>
</tr>
`;
    };
    let tableRows = [];
    for (const [name, x] of Object.entries(tableData)) {
      const totalXpGain = x[this.skillName].totalXpGain;
      tableRows.push(row("", name, x[this.skillName], totalXpGain));
      if (this.skillName === SkillName.Overall) {
        const skillNamesSortedByXpGain = [...skillNames].sort((a, b) => x[b].xpGain - x[a].xpGain);
        for (const skillName of skillNamesSortedByXpGain) {
          const s = x[skillName];
          if (s.xpGain > 0) {
            tableRows.push(row("skill-graph__overall-skill-change", skillName, s, x[this.skillName].xpGain));
          }
        }
      }
    }
    this.tableContainer.innerHTML = `
<table>
  ${tableRows.join("")}
</table>
`;
  }
  createChart(dataSets) {
    if (this.chart) this.chart.destroy();
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;
    for (let i = 0; i < dataSets.length; ++i) {
      min = Math.min(min, dataSets[i].data[0]);
      max = Math.max(max, dataSets[i].data[dataSets[i].data.length - 1]);
    }
    const scales = {
      x: {
        grid: {
          drawTicks: false
        }
      },
      y: {
        type: "linear",
        min,
        max: max + 1,
        title: {
          display: true,
          text: "XP Gain"
        }
      }
    };
    this.chart = new Chart(this.ctx, {
      type: "line",
      options: {
        maintainAspectRatio: false,
        animation: false,
        normalized: true,
        layout: {
          padding: 0
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (tooltip) => {
                const xpChange = tooltip.dataset.changeData[tooltip.dataIndex];
                const xpChangeString = `${xpChange > 0 ? "+" : ""}${xpChange.toLocaleString()}`;
                const totalXp = tooltip.dataset.totalXpData[tooltip.dataIndex] || 0;
                return `${tooltip.dataset.label}: ${totalXp.toLocaleString()} (${xpChangeString})`;
              }
            }
          },
          title: {
            display: true,
            text: `${this.skillName} - ${this.period}`
          }
        },
        interaction: {
          intersect: false,
          mode: "index"
        },
        scales
      },
      data: {
        labels: this.labelsForPeriod(this.period, this.dates),
        datasets: dataSets
      }
    });
  }
  dataSets(skillName) {
    let result = [];
    for (let i = 0; i < this.skillDataForGroup.length; ++i) {
      const playerSkillData = this.skillDataForGroup[i];
      const [totalXpData, changeData, cumulativeChangeData] = this.dataForPlayer(
        playerSkillData,
        this.dates,
        skillName
      );
      const color = this.currentGroupData.members.get(playerSkillData.name).color;
      result.push({
        type: "line",
        label: playerSkillData.name,
        data: cumulativeChangeData,
        borderColor: color,
        backgroundColor: color,
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        pointHoverRadius: 3,
        pointRadius: 0,
        borderWidth: 2,
        changeData,
        totalXpData
      });
    }
    return result;
  }
  dataForPlayer(playerSkillData, dates, skillName) {
    const latestSkillData = this.currentGroupData.members.get(playerSkillData.name).skills;
    const completeTimeSeries = this.generateCompleteTimeSeries(playerSkillData.skill_data, latestSkillData, skillName);
    const changeData = [0];
    const cumulativeChangeData = [0];
    let s = 0;
    for (let i = 1; i < completeTimeSeries.length; ++i) {
      const previous = completeTimeSeries[i - 1];
      const current = completeTimeSeries[i];
      if (previous === void 0 || current === void 0) {
        changeData.push(0);
        cumulativeChangeData.push(s);
      } else {
        changeData.push(current - previous);
        s += current - previous;
        cumulativeChangeData.push(s);
      }
    }
    return [completeTimeSeries, changeData, cumulativeChangeData];
  }
  generateCompleteTimeSeries(playerSkillData, currentSkillData, skillName) {
    const bucketedSkillData = /* @__PURE__ */ new Map();
    const earliestDateInPeriod = _SkillGraph.truncatedDateForPeriod(this.dates[0], this.period);
    const datesOutsideOfPeriod = [];
    for (const skillData of playerSkillData) {
      const date = _SkillGraph.truncatedDateForPeriod(skillData.time, this.period);
      bucketedSkillData.set(date.getTime(), skillData.data);
      if (date < earliestDateInPeriod) {
        datesOutsideOfPeriod.push(skillData);
      }
    }
    let lastData = datesOutsideOfPeriod.length ? datesOutsideOfPeriod[0].data[skillName] : void 0;
    const result = [];
    for (let i = 0; i < this.dates.length; ++i) {
      const date = this.dates[i];
      const time = date.getTime();
      if (bucketedSkillData.has(time)) {
        let data = bucketedSkillData.get(time)[skillName];
        result.push(data);
        lastData = data;
      } else {
        result.push(lastData);
      }
    }
    result[result.length - 1] = currentSkillData[skillName].xp;
    return result;
  }
  labelsForPeriod(period, dates) {
    if (period === "Day") {
      return dates.map((date) => date.toLocaleTimeString([], { hour: "numeric" }));
    } else if (period === "Week" || period === "Month") {
      return dates.map((date) => date.toLocaleDateString([], { timeZone: "UTC", day: "numeric", month: "short" }));
    } else if (period === "Year") {
      return dates.map((date) => date.toLocaleDateString([], { timeZone: "UTC", year: "numeric", month: "short" }));
    }
  }
  static datesForPeriod(period) {
    const stepInMillisecondsForPeriods = {
      Day: 36e5,
      Week: 864e5,
      Month: 864e5,
      Year: 26298e5
    };
    const step = stepInMillisecondsForPeriods[period];
    const stepCountsForPeriods = {
      Day: 24,
      Week: 7,
      Month: 30,
      Year: 12
    };
    const count = stepCountsForPeriods[period];
    const now = /* @__PURE__ */ new Date();
    const result = [];
    for (let i = count - 1; i >= 0; --i) {
      const t = new Date(now.getTime() - i * step);
      result.push(_SkillGraph.truncatedDateForPeriod(t, period));
    }
    return result;
  }
  static truncatedDateForPeriod(date, period) {
    const t = new Date(date);
    t.setMinutes(0, 0, 0);
    if (period !== "Day") {
      t.setHours(0);
    }
    if (period === "Year") {
      t.setMonth(t.getMonth(), 1);
    }
    return t;
  }
};
customElements.define("skill-graph", SkillGraph);

// resources/components/data/example-data.js
var ExampleData = class {
  enable() {
    this.disable();
    this.reset();
    this.intervals = [
      utility.callOnInterval(this.doHealthUpdate.bind(this), 3e3),
      utility.callOnInterval(this.doXpDrop.bind(this), 2e3),
      utility.callOnInterval(() => {
        let plane = this.members["Zezima"].coordinates[2];
        plane += 1;
        if (plane > 3) plane = 0;
        this.members["Zezima"].coordinates = [
          this.members["Zezima"].coordinates[0] + 1,
          this.members["Zezima"].coordinates[1],
          plane
        ];
      }, 1e3)
    ];
  }
  disable() {
    if (this.intervals) {
      for (const interval of this.intervals) {
        clearInterval(interval);
      }
      this.intervals = [];
    }
  }
  reset() {
    this.members = {
      Zezima: {
        quests: Quest.randomQuestStates(),
        bank: [995, Math.floor(Math.random() * 25e6)],
        stats: [99, 99, 99, 99, 100, 100, 330],
        skills: Object.values(SkillName).map(() => Math.floor(Math.random() * 14e6)),
        equipment: Item.randomItems(14, 1),
        inventory: Item.randomItems(28),
        coordinates: [3029, 3e3, 0],
        last_updated: "2022-01-23T01:34:06.104Z",
        diary_vars: AchievementDiary.randomDiaries()
      },
      "group alt two": {
        rune_pouch: [563, 1922, 561, 5, 554, 15194],
        quests: Quest.randomQuestStates(),
        coordinates: [3029, 3e3, 0],
        // coordinates: [3129, 3100, 0],
        stats: [55, 93, 13, 70, 75, 100, 330],
        skills: Object.values(SkillName).map(() => Math.floor(Math.random() * 14e6)),
        bank: [995, Math.floor(Math.random() * 5e6)],
        diary_vars: AchievementDiary.randomDiaries(),
        inventory: [
          26382,
          1,
          26384,
          1,
          26386,
          1,
          12791,
          1,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          6685,
          1,
          6685,
          1,
          6685,
          1,
          6685,
          1,
          6685,
          1,
          6685,
          1,
          6685,
          1,
          6685,
          1,
          6685,
          1,
          995,
          Math.floor(Math.random() * 5e6)
        ],
        equipment: [26382, 1, 0, 0, 0, 0, 0, 0, 26384, 1, 0, 0, 0, 0, 26386, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      "Bank alt": {
        bank: [995, Math.floor(Math.random() * 5e6), ...Item.randomItems(500)],
        skills: Object.values(SkillName).map(() => Math.floor(Math.random() * 14e6)),
        stats: [7, 10, 10, 10, 100, 100, 309],
        equipment: Item.randomItems(14, 1),
        // coordinates: [3029, 3000, 0],
        coordinates: [3103, 3025, 0],
        quests: Quest.randomQuestStates(),
        diary_vars: AchievementDiary.randomDiaries(),
        interacting: {
          last_updated: "2050-01-01T00:00:00.000Z",
          name: "Goblin",
          ratio: 25,
          scale: 30,
          location: {
            x: 3104,
            y: 3025,
            plane: 0
          }
        }
      },
      "@SHARED": {
        bank: [995, 1e6]
      }
    };
  }
  getGroupData() {
    const groupData2 = Object.entries(this.members).map(([name, data]) => {
      return { name, ...data };
    });
    this.members = {
      "group alt two": {
        skills: this.members["group alt two"].skills
      },
      Zezima: {
        coordinates: this.members["Zezima"].coordinates
      },
      "Bank alt": {},
      "@SHARED": {}
    };
    return groupData2;
  }
  doXpDrop() {
    this.members["group alt two"].skills[0] += 50;
  }
  doHealthUpdate() {
    this.members["group alt two"].stats = [Math.floor(Math.max(1, Math.random() * 93)), 93, 13, 70, 75, 100, 330];
  }
  getSkillData(period, groupData2) {
    const dates = SkillGraph.datesForPeriod(period);
    const result = [];
    const skillNames = Object.values(SkillName);
    skillNames.sort((a, b) => a.localeCompare(b));
    for (const member of groupData2.members.values()) {
      if (!member.skills) continue;
      const skillData = [];
      let s = skillNames.map((skillName) => member.skills[skillName].xp);
      for (const date of dates) {
        skillData.push({
          time: date.toISOString(),
          data: s
        });
        s = s.map((x) => Math.random() > 0.9 ? Math.round(x + Math.random() * 1e4) : x);
      }
      const transformed = GroupData.transformSkillsFromStorage(s);
      for (const [skillName, xp] of Object.entries(transformed)) {
        member.skills[skillName].xp = xp;
      }
      if (this.members[member.name].skills) {
        this.members[member.name].skills = s;
      }
      result.push({
        name: member.name,
        skill_data: skillData
      });
    }
    return result;
  }
  getCollectionLog() {
    return {};
  }
};
var exampleData = new ExampleData();

// resources/components/data/api.js
var Api = class {
  constructor() {
    this.baseUrl = "/api";
    this.createGroupUrl = `${this.baseUrl}/create-group`;
    this.exampleDataEnabled = false;
    this.enabled = false;
  }
  get getGroupDataUrl() {
    return `${this.baseUrl}/group/${this.groupName}/get-group-data`;
  }
  get addMemberUrl() {
    return `${this.baseUrl}/group/${this.groupName}/add-group-member`;
  }
  get deleteMemberUrl() {
    return `${this.baseUrl}/group/${this.groupName}/delete-group-member`;
  }
  get renameMemberUrl() {
    return `${this.baseUrl}/group/${this.groupName}/rename-group-member`;
  }
  get amILoggedInUrl() {
    return `${this.baseUrl}/group/${this.groupName}/am-i-logged-in`;
  }
  get gePricesUrl() {
    return `${this.baseUrl}/ge-prices`;
  }
  get skillDataUrl() {
    return `${this.baseUrl}/group/${this.groupName}/get-skill-data`;
  }
  get captchaEnabledUrl() {
    return `${this.baseUrl}/captcha-enabled`;
  }
  get collectionLogInfoUrl() {
    return `${this.baseUrl}/collection-log-info`;
  }
  collectionLogDataUrl() {
    return `${this.baseUrl}/group/${this.groupName}/collection-log`;
  }
  setCredentials(groupName, groupToken) {
    this.groupName = groupName;
    this.groupToken = groupToken;
  }
  async restart() {
    const groupName = this.groupName;
    const groupToken = this.groupToken;
    await this.enable(groupName, groupToken);
  }
  async enable(groupName, groupToken) {
    await this.disable();
    this.nextCheck = (/* @__PURE__ */ new Date(0)).toISOString();
    this.setCredentials(groupName, groupToken);
    if (!this.enabled) {
      this.enabled = true;
      this.getGroupInterval = pubsub.waitForAllEvents("item-data-loaded", "quest-data-loaded").then(() => {
        return utility.callOnInterval(this.getGroupData.bind(this), 1e3);
      });
    }
    await this.getGroupInterval;
  }
  async disable() {
    this.enabled = false;
    this.groupName = void 0;
    this.groupToken = void 0;
    groupData.members = /* @__PURE__ */ new Map();
    groupData.groupItems = {};
    groupData.filters = [""];
    if (this.getGroupInterval) {
      window.clearInterval(await this.getGroupInterval);
    }
  }
  async getGroupData() {
    const nextCheck = this.nextCheck;
    if (this.exampleDataEnabled) {
      const newGroupData = exampleData.getGroupData();
      groupData.update(newGroupData);
      pubsub.publish("get-group-data", groupData);
    } else {
      const response = await fetch(`${this.getGroupDataUrl}?from_time=${nextCheck}`, {
        headers: {
          Authorization: this.groupToken
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          await this.disable();
          window.history.pushState("", "", "/login");
          pubsub.publish("get-group-data");
        }
        return;
      }
      const newGroupData = await response.json();
      this.nextCheck = groupData.update(newGroupData).toISOString();
      pubsub.publish("get-group-data", groupData);
    }
  }
  async createGroup(groupName, memberNames, captchaResponse) {
    const response = await fetch(this.createGroupUrl, {
      body: JSON.stringify({ name: groupName, member_names: memberNames, captcha_response: captchaResponse }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    return response;
  }
  async addMember(memberName) {
    const response = await fetch(this.addMemberUrl, {
      body: JSON.stringify({ name: memberName }),
      headers: {
        "Content-Type": "application/json",
        Authorization: this.groupToken
      },
      method: "POST"
    });
    return response;
  }
  async removeMember(memberName) {
    const response = await fetch(this.deleteMemberUrl, {
      body: JSON.stringify({ name: memberName }),
      headers: {
        "Content-Type": "application/json",
        Authorization: this.groupToken
      },
      method: "DELETE"
    });
    return response;
  }
  async renameMember(originalName, newName) {
    const response = await fetch(this.renameMemberUrl, {
      body: JSON.stringify({ original_name: originalName, new_name: newName }),
      headers: {
        "Content-Type": "application/json",
        Authorization: this.groupToken
      },
      method: "PUT"
    });
    return response;
  }
  async amILoggedIn() {
    const response = await fetch(this.amILoggedInUrl, {
      headers: { Authorization: this.groupToken }
    });
    return response;
  }
  async getGePrices() {
    const response = await fetch(this.gePricesUrl);
    return response;
  }
  async getSkillData(period) {
    if (this.exampleDataEnabled) {
      const skillData = exampleData.getSkillData(period, groupData);
      return skillData;
    } else {
      const response = await fetch(`${this.skillDataUrl}?period=${period}`, {
        headers: {
          Authorization: this.groupToken
        }
      });
      return response.json();
    }
  }
  async getCaptchaEnabled() {
    return false;
    const response = await fetch(this.captchaEnabledUrl);
    return response.json();
  }
  async getCollectionLogInfo() {
    const response = await fetch(this.collectionLogInfoUrl);
    return response.json();
  }
  async getCollectionLog() {
    if (this.exampleDataEnabled) {
      const collectionLog2 = exampleData.getCollectionLog();
      return collectionLog2;
    } else {
      const response = await fetch(this.collectionLogDataUrl(), {
        headers: {
          Authorization: this.groupToken
        }
      });
      return response.json();
    }
  }
};
var api = new Api();

// resources/components/search-element/search-element.js
var SearchElement = class extends BaseElement {
  constructor() {
    super();
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.searchInput = this.querySelector(".search-element__input");
    if (this.hasAttribute("auto-focus")) {
      this.eventListener(document.body, "keydown", this.focusSearch.bind(this));
    }
  }
  html() {
    return `<input class="search-element__input" placeholder="${this.getAttribute("placeholder")}" type="text" tabindex="0" />
`;
  }
  focusSearch(evt) {
    if (evt.key !== "Tab" && document.activeElement !== this.searchInput && document.activeElement.tagName.toLowerCase() !== "input") {
      this.searchInput.focus();
    }
  }
  get value() {
    return this.searchInput.value || "";
  }
};
customElements.define("search-element", SearchElement);

// resources/components/inventory-item/inventory-item.js
var InventoryItem = class extends BaseElement {
  constructor() {
    super();
  }
  connectedCallback() {
    super.connectedCallback();
    const itemId = this.getAttribute("item-id");
    this.showIndividualItemPrices = this.hasAttribute("individual-prices");
    this.playerFilter = this.getAttribute("player-filter");
    const top = this.offsetTop;
    const bottomOfPage = document.body.clientHeight;
    if (top < bottomOfPage) {
      this.subscribe(`item-update:${itemId}`, this.handleUpdatedItem.bind(this));
    } else {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        for (const x of entries) {
          if (x.isIntersecting && x.target === this) {
            this.intersectionObserver.disconnect();
            this.subscribe(`item-update:${itemId}`, this.handleUpdatedItem.bind(this));
            return;
          }
        }
      }, {});
      this.intersectionObserver.observe(this);
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
  /* eslint-disable no-unused-vars */
  html() {
    const item = this.item;
    let playerHtml = "";
    const totalQuantity = this.quantity;
    if (this.playerFilter) {
      playerHtml = this.playerHtml(this.playerFilter);
    } else {
      for (const [playerName, quantity] of Object.entries(item.quantities)) {
        if (quantity === 0) continue;
        playerHtml += this.playerHtml(playerName);
      }
    }
    return `<div class="inventory-item__top rsborder-tiny">
  <div class="inventory-item__top-right">
    <div class="inventory-item__name"><a class="rstext" href="${item.wikiLink}" target="_blank">${item.name}</a></div>
    <div class="inventory-item__details">
      <span>Quantity</span>
      <span>${this.quantity.toLocaleString()}</span>
      <span>High Alch</span>
      <span>${this.highAlch}</span>
      <span>GE Price</span>
      <span>${this.gePrice}</span>
    </div>
  </div>

  <div class="inventory-item__picture-container">
    <img class="inventory-item__picture" src="${item.imageUrl}" width="63" height="56"/>
  </div>
</div>
<div class="inventory-item__bottom">${playerHtml}</div>
`;
  }
  /* eslint-enable no-unused-vars */
  playerHtml(playerName) {
    const quantity = this.item.quantities[playerName];
    const totalQuantity = this.quantity;
    const quantityPercent = Math.round(quantity / totalQuantity * 100);
    return `
<span class="${quantity === 0 ? "inventory-item__no-quantity" : ""}">${playerName}</span>
<span>${quantity.toLocaleString()}</span>
<div class="inventory-item__quantity-bar"
     style="transform: scaleX(${quantityPercent}%); background: hsl(${quantityPercent}, 100%, 40%);">
</div>
`;
  }
  handleUpdatedItem(item) {
    this.item = item;
    this.render();
    this.classList.add("rendered");
  }
  get quantity() {
    if (this.playerFilter) {
      return this.item.quantities[this.playerFilter];
    }
    return this.item.quantity;
  }
  get highAlch() {
    const highAlch = this.item.highAlch;
    if (highAlch === 0) return "N/A";
    if (this.showIndividualItemPrices) {
      return highAlch.toLocaleString() + "gp";
    }
    return (this.quantity * highAlch).toLocaleString() + "gp";
  }
  get gePrice() {
    const gePrice = this.item.gePrice;
    if (gePrice === 0) return "N/A";
    if (this.showIndividualItemPrices) {
      return gePrice.toLocaleString() + "gp";
    }
    return (this.quantity * gePrice).toLocaleString() + "gp";
  }
};
customElements.define("inventory-item", InventoryItem);

// resources/components/quick-select.js
function quickselect(arr, k, left, right, compare) {
  quickselectStep(arr, k, left || 0, right || arr.length - 1, compare || defaultCompare);
}
function quickselectStep(arr, k, left, right, compare) {
  while (right > left) {
    if (right - left > 600) {
      var n = right - left + 1;
      var m = k - left + 1;
      var z = Math.log(n);
      var s = 0.5 * Math.exp(2 * z / 3);
      var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
      var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
      var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
      quickselectStep(arr, k, newLeft, newRight, compare);
    }
    var t = arr[k];
    var i = left;
    var j = right;
    swap(arr, left, k);
    if (compare(arr[right], t) > 0) swap(arr, left, right);
    while (i < j) {
      swap(arr, i, j);
      i++;
      j--;
      while (compare(arr[i], t) < 0) i++;
      while (compare(arr[j], t) > 0) j--;
    }
    if (compare(arr[left], t) === 0) swap(arr, left, j);
    else {
      j++;
      swap(arr, j, right);
    }
    if (j <= k) left = j + 1;
    if (k <= j) right = j - 1;
  }
}
function swap(arr, i, j) {
  var tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}
function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// resources/components/inventory-pager/inventory-pager.js
var InventoryPager = class extends BaseElement {
  constructor() {
    super();
    this.pageLimit = 200;
    this.currentPage = 1;
    this.numberOfItems = 0;
    this.compare = this.compareOnQuantity.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();
    this.pageTarget = document.querySelector(".items-page__list");
    this.sortTarget = document.querySelector(".items-page__sort");
    this.itemCount = document.querySelector(".items-page__item-count");
    this.totalGeValue = document.querySelector(".items-page__total-ge-price");
    this.totalHaValue = document.querySelector(".items-page__total-ha-price");
    this.searchElement = document.querySelector(".items-page__search");
    this.showIndividualPricesInput = document.querySelector("#items-page__individual-items");
    this.showIndividualPrices = this.showIndividualPricesInput.checked;
    this.playerFilter = document.querySelector(".items-page__player-filter");
    this.eventListener(this.searchElement, "input", this.handleSearch.bind(this));
    this.eventListener(this.sortTarget, "change", this.handleSortChange.bind(this));
    this.eventListener(this, "click", this.handleClick.bind(this));
    this.eventListener(this.showIndividualPricesInput, "change", this.handleIndividualPricesChange.bind(this));
    this.eventListener(this.playerFilter, "change", this.handlePlayerFilterChange.bind(this));
    this.subscribe("items-updated", this.handleUpdatedItems.bind(this));
    this.searchElement.searchInput.value = groupData.textFilter;
  }
  /* eslint-disable no-unused-vars */
  html() {
    let pageButtonsHtml = "";
    const numberOfPages = this.numberOfPages;
    for (let i = 0; i < numberOfPages; ++i) {
      const active = i === this.currentPage - 1 ? "active" : "";
      pageButtonsHtml += `<button class="${active} inventory-pager__button men-button">${i + 1}</button>`;
    }
    return `<div class="inventory-pager__label">Page:</div>
<div class="inventory-pager__buttons">${pageButtonsHtml}</div>
`;
  }
  /* eslint-enable no-unused-vars */
  render() {
    super.render();
    if (this.numberOfItems !== void 0) {
      this.itemCount.innerHTML = this.numberOfItems.toLocaleString();
    }
  }
  handlePlayerFilterChange() {
    const player = this.playerFilter.value;
    groupData.applyPlayerFilter(player);
    this.maybeRenderPage(this.currentPage, true);
    this.render();
  }
  handleIndividualPricesChange() {
    this.showIndividualPrices = this.showIndividualPricesInput.checked;
    this.maybeRenderPage(this.currentPage, true);
    this.render();
  }
  handleSearch() {
    const inputText = this.searchElement.value.trim().toLowerCase();
    groupData.applyTextFilter(inputText);
    this.maybeRenderPage(this.currentPage);
    this.render();
  }
  handleSortChange() {
    const selectedSort = this.sortTarget.value;
    if (selectedSort === "totalquantity") {
      this.compare = this.compareOnQuantity.bind(this);
    } else if (selectedSort === "highalch") {
      this.compare = this.compareOnHighAlch.bind(this);
    } else if (selectedSort === "geprice") {
      this.compare = this.compareOnGePrice.bind(this);
    } else if (selectedSort === "alphabetical") {
      this.compare = this.compareAlphabetical.bind(this);
    }
    this.maybeRenderPage(this.currentPage);
    this.render();
  }
  handleClick(evt) {
    const target = evt.target;
    if (target.classList.contains("inventory-pager__button")) {
      const pageNumber = parseInt(target.innerText);
      this.currentPage = pageNumber;
      this.maybeRenderPage(pageNumber);
      this.render();
    }
  }
  compareOnQuantity(a, b) {
    return this.itemQuantity(b) - this.itemQuantity(a);
  }
  compareOnHighAlch(a, b) {
    if (this.showIndividualPrices) {
      return b.highAlch - a.highAlch;
    }
    return this.itemQuantity(b) * b.highAlch - this.itemQuantity(a) * a.highAlch;
  }
  compareOnGePrice(a, b) {
    if (this.showIndividualPrices) {
      return b.gePrice - a.gePrice;
    }
    return this.itemQuantity(b) * b.gePrice - this.itemQuantity(a) * a.gePrice;
  }
  compareAlphabetical(a, b) {
    return a.name.localeCompare(b.name);
  }
  handleUpdatedItems() {
    const previousItemCount = this.numberOfItems;
    this.maybeRenderPage(this.currentPage);
    if (this.numberOfItems !== previousItemCount) {
      this.render();
    }
  }
  maybeRenderPage(pageNumber, forceRender = false) {
    const previousPageItems = this.pageItems;
    const items = Object.values(groupData.groupItems).filter((item) => item.visible);
    this.numberOfPages = Math.floor(items.length / this.pageLimit);
    this.numberOfItems = items.length;
    if (items.length - this.pageLimit * this.numberOfPages > 0) this.numberOfPages++;
    if (this.currentPage > this.numberOfPages) {
      this.currentPage = 1;
    }
    const newPageItems = this.getPage(this.currentPage, items);
    if (forceRender || this.pageUpdated(previousPageItems, newPageItems)) {
      this.pageItems = newPageItems;
      this.renderPage(newPageItems);
    }
    this.updateItemValues();
  }
  pageUpdated(previous, current) {
    if (previous === void 0) return true;
    if (previous.length !== current.length) return true;
    for (let i = 0; i < current.length; ++i) {
      if (current[i].id !== previous[i].id) return true;
    }
    return false;
  }
  getPage(pageNumber, items) {
    const compare = this.compare;
    for (let i = 0; i < pageNumber; ++i) {
      if (items.length <= this.pageLimit) break;
      quickselect(items, this.pageLimit, 0, items.length - 1, compare);
      if (i !== pageNumber - 1) {
        items = items.slice(this.pageLimit, items.length);
      }
    }
    items = items.slice(0, this.pageLimit);
    items.sort(compare);
    return items;
  }
  renderPage(page) {
    let items = "";
    for (const item of page) {
      items += `
<inventory-item item-id="${item.id}"
                class="rsborder rsbackground"
                ${this.showIndividualPrices ? "individual-prices" : ""}
                ${groupData.playerFilter !== "@ALL" ? `player-filter="${groupData.playerFilter}"` : ""}>
</inventory-item>
`;
    }
    this.pageTarget.innerHTML = items;
  }
  updateItemValues() {
    let totalGeValue = 0;
    let totalHaValue = 0;
    for (const item of Object.values(groupData.groupItems)) {
      if (item.visible) {
        const quantity = this.itemQuantity(item);
        totalGeValue += item.gePrice * quantity;
        totalHaValue += item.highAlch * quantity;
      }
    }
    this.totalGeValue.innerHTML = totalGeValue.toLocaleString();
    this.totalHaValue.innerHTML = totalHaValue.toLocaleString();
  }
  itemQuantity(item) {
    if (groupData.playerFilter !== "@ALL") {
      return item.quantities[groupData.playerFilter];
    }
    return item.quantity;
  }
};
customElements.define("inventory-pager", InventoryPager);

// resources/components/app-navigation/app-navigation.js
var AppNavigation = class extends BaseElement {
  constructor() {
    super();
  }
  /* eslint-disable no-unused-vars */
  html() {
    const group = storage.getGroup();
    return `<h4 class="app-navigation__group-name">${group.groupName}</h4>
<nav class="app-navigation__nav">
  <men-link link-href="/group/items">
    <button class="men-button" type="button" route-component="items-page">
      <span class="desktop">Items</span>
      <span class="mobile"><img loading="lazy" src="/ui/777-0.png" /></span>
    </button>
  </men-link>
  <men-link link-href="/group/map">
    <button class="men-button" type="button" route-component="map-page">
      <span class="desktop">Map</span>
      <span class="mobile"><img loading="lazy" src="/ui/1698-0.png" /></span>
    </button>
  </men-link>
  <men-link link-href="/group/graphs">
    <button class="men-button" type="button" route-component="skills-graphs">
      <span class="desktop">Graphs</span>
      <span class="mobile"><img loading="lazy" src="/ui/3579-0.png" /></span>
    </button>
  </men-link>
  <men-link link-href="/group/panels">
    <button class="men-button" type="button" route-component="panels-page">
      <span class="desktop">Panels</span>
      <span class="mobile"><img loading="lazy" src="/ui/1707-0.png" /></span>
    </button>
  </men-link>
  <men-link link-href="/group/settings">
    <button class="men-button" type="button" route-component="group-settings">
      <span class="desktop">Settings</span>
      <span class="mobile"><img loading="lazy" src="/ui/785-0.png" /></span>
    </button>
  </men-link>

  <div class="app-navigation__separator desktop"></div>
  <men-link link-href="/setup-instructions">
    <button class="men-button" type="button">
      <span class="desktop">Setup</span>
      <span class="mobile"><img loading="lazy" src="/ui/1094-0.png" /></span>
    </button>
  </men-link>
  <men-link link-href="/logout">
    <button class="men-button" type="button">
      <span class="desktop">Logout</span>
      <span class="mobile"><img loading="lazy" src="/ui/225-0.png" /></span>
    </button>
  </men-link>
</nav>
`;
  }
  /* eslint-enable no-unused-vars */
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.subscribe("route-activated", this.handleRouteActivated.bind(this));
  }
  handleRouteActivated(route) {
    const routeComponent = route.getAttribute("route-component");
    const buttons = Array.from(this.querySelectorAll("button"));
    for (const button of buttons) {
      const c = button.getAttribute("route-component");
      if (routeComponent === c) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    }
  }
};
customElements.define("app-navigation", AppNavigation);

// resources/components/items-page/items-page.js
var ItemsPage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="items-page__head">
  <search-element class="items-page__search" placeholder="Search" auto-focus></search-element>
  <inventory-pager></inventory-pager>
</div>
<div class="items-page__utility">
  <div class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    <select class="items-page__sort">
      <option value="totalquantity">Sort: Total Quantity</option>
      <option value="highalch">Sort: High Alch</option>
      <option value="geprice">Sort: GE Price</option>
      <option value="alphabetical">Sort: Alphabetical</option>
    </select>
  </div>
  <div class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    <select class="items-page__player-filter"></select>
  </div>
  <div class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    <input type="checkbox" id="items-page__individual-items" />
    <label for="items-page__individual-items">Individual item price</label>
  </div>
  <span class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    <span class="items-page__item-count">0</span>&nbsp;<span>items</span>
  </span>
  <span class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    HA:&nbsp;<span class="items-page__total-ha-price">0</span><span>gp</span>
  </span>
  <span class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    GE:&nbsp;<span class="items-page__total-ge-price">0</span><span>gp</span>
  </span>
</div>
<section class="items-page__list"></section>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.subscribe("members-updated", this.handleUpdatedMembers.bind(this));
  }
  handleUpdatedMembers(members) {
    const playerFilter = this.querySelector(".items-page__player-filter");
    const selected = playerFilter.value;
    let playerOptions = `<option value="@ALL">All Players</option>`;
    for (const member of members) {
      playerOptions += `<option value="${member.name}" ${member.name === selected ? "selected" : ""}>${member.name}</option>`;
    }
    playerFilter.innerHTML = playerOptions;
    if (playerFilter.value !== selected) {
      playerFilter.dispatchEvent(new CustomEvent("change"));
    }
  }
};
customElements.define("items-page", ItemsPage);

// resources/components/router.js
var Router = class {
  constructor() {
    this.registeredRoutes = /* @__PURE__ */ new Map();
    this.routeAliases = /* @__PURE__ */ new Map();
    this.activeRoute = null;
    window.addEventListener("locationchange", this.handleLocationChange.bind(this));
  }
  register(path, route) {
    this.registeredRoutes.set(path, route);
    const matches = this.didMatch(this.location, path);
    if (matches) {
      this.activateRoute(route);
    }
  }
  aliasRoute(base, alias) {
    if (!this.routeAliases.has(base)) {
      this.routeAliases.set(base, /* @__PURE__ */ new Set());
    }
    this.routeAliases.get(base).add(alias);
    if (this.registeredRoutes.has(base)) {
      const matches = this.didMatch(this.location, base);
      if (matches) {
        this.activateRoute(this.registeredRoutes.get(base));
      }
    }
  }
  unregister(path) {
    this.registeredRoute.delete(path);
  }
  get location() {
    const pathname = window.location.pathname;
    if (pathname.endsWith("/")) {
      return pathname.slice(0, -1);
    }
    return pathname;
  }
  didMatch(location, path) {
    return path === "*" && !this.activeRoute || path === location || this.routeAliases.get(path)?.has(location);
  }
  activateRoute(route) {
    if (this.activeRoute !== route) {
      this.activeRoute = route;
      pubsub.publish("route-activated", route);
      route.enable();
    }
  }
  handleLocationChange() {
    const location = this.location;
    let matchedRoute = null;
    for (const path of this.registeredRoutes.keys()) {
      const matches = this.didMatch(location, path);
      if (matches) {
        matchedRoute = this.registeredRoutes.get(path);
      } else {
        this.registeredRoutes.get(path).disable();
      }
    }
    for (const route of this.registeredRoutes.values()) {
      if ((matchedRoute === null || route.wrapper !== matchedRoute.wrapper) && route.wrapper) {
        route.wrapper.disable();
      }
    }
    if (matchedRoute) {
      this.activateRoute(matchedRoute);
    } else {
      this.activeRoute = null;
      window.history.pushState("", "", "/");
    }
  }
};
var router = new Router();
history.pushState = /* @__PURE__ */ ((f) => function pushState(...args) {
  const ret = f.apply(this, args);
  window.dispatchEvent(new Event("pushstate"));
  window.dispatchEvent(new Event("locationchange"));
  return ret;
})(history.pushState);
history.replaceState = /* @__PURE__ */ ((f) => function replaceState(...args) {
  const ret = f.apply(this, args);
  window.dispatchEvent(new Event("replacestate"));
  window.dispatchEvent(new Event("locationchange"));
  return ret;
})(history.replaceState);
window.addEventListener("popstate", () => {
  window.dispatchEvent(new Event("locationchange"));
});

// resources/components/app-route/app-route.js
var AppRoute = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.hasAttribute("route-wrapper")) {
      this.wrapper = document.querySelector(this.getAttribute("route-wrapper"));
    }
    let basePath = this.getAttribute("route-path");
    this.path = this.buildPath(basePath);
    this.aliasFor = this.getAttribute("alias-for");
    this.active = false;
    if (this.aliasFor) {
      router.aliasRoute(this.buildPath(this.aliasFor), this.path);
    } else {
      this.outletSelector = this.getAttribute("route-outlet");
      router.register(this.path, this);
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    router.unregister(this.path);
  }
  get outlet() {
    return document.querySelector(this.outletSelector);
  }
  enable() {
    const redirect = this.getAttribute("route-redirect");
    if (redirect) {
      window.history.pushState("", "", redirect);
      return;
    }
    if (this.active) return;
    this.active = true;
    if (this.wrapper) {
      this.wrapper.enable();
    }
    if (this.page === void 0) {
      const routeComponent = this.getAttribute("route-component");
      this.page = document.createElement(routeComponent);
    }
    this.outlet.appendChild(this.page);
  }
  disable() {
    if (!this.active) return;
    this.active = false;
    if (this.page) {
      this.outlet.removeChild(this.page);
      this.page.innerHTML = "";
    }
  }
  buildPath(basePath) {
    if (basePath.trim() === "/") basePath = "";
    let wrap = "";
    if (this.wrapper) {
      wrap = this.wrapper.getAttribute("route-path");
    }
    return `${wrap}${basePath}`;
  }
};
customElements.define("app-route", AppRoute);

// resources/components/map-page/map-page.js
var MapPage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="map-page__container">
  <div class="map-page__focus-player-buttons"></div>
  <div class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    <select class="map-page__plane-select">
      <option value="1">Plane: 1</option>
      <option value="2">Plane: 2</option>
      <option value="3">Plane: 3</option>
      <option value="4">Plane: 4</option>
    </select>
  </div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.worldMap = document.querySelector("#background-worldmap");
    document.querySelector(".authed-section").classList.add("no-pointer-events");
    this.worldMap.classList.add("interactable");
    this.playerButtons = this.querySelector(".map-page__focus-player-buttons");
    this.planeSelect = this.querySelector(".map-page__plane-select");
    this.planeSelect.value = this.worldMap.plane || 1;
    this.subscribe("members-updated", this.handleUpdatedMembers.bind(this));
    this.eventListener(this.playerButtons, "click", this.handleFocusPlayer.bind(this));
    this.eventListener(this.planeSelect, "change", this.handlePlaneSelect.bind(this));
    this.eventListener(this.worldMap, "plane-changed", this.handlePlaneChange.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.worldMap.classList.remove("interactable");
    document.querySelector(".authed-section").classList.remove("no-pointer-events");
  }
  getSelectedPlane() {
    return parseInt(this.planeSelect.value, 10);
  }
  handlePlaneChange(evt) {
    const plane = evt.detail.plane;
    if (this.getSelectedPlane() !== plane) {
      this.planeSelect.value = plane;
    }
  }
  handlePlaneSelect() {
    this.worldMap.stopFollowingPlayer();
    this.worldMap.showPlane(this.getSelectedPlane());
  }
  handleUpdatedMembers(members) {
    let playerButtons = "";
    for (const member of members) {
      if (member.name === "@SHARED") continue;
      playerButtons += `<button type="button" class="men-button" player-name="${member.name}">${member.name}</button>`;
    }
    if (this.playerButtons) {
      this.playerButtons.innerHTML = playerButtons;
    }
  }
  handleFocusPlayer(event) {
    const target = event.target;
    const playerName = target.getAttribute("player-name");
    this.worldMap.followPlayer(playerName);
  }
};
customElements.define("map-page", MapPage);

// resources/components/side-panel/side-panel.js
var SidePanel = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="side-panel__panels"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.sidePanels = this.querySelector(".side-panel__panels");
    this.subscribe("members-updated", this.handleUpdatedMembers.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleUpdatedMembers(members) {
    let playerPanels = "";
    for (const member of members) {
      if (member.name === "@SHARED") {
        continue;
      }
      playerPanels += `<player-panel class="rsborder rsbackground" player-name="${member.name}"></player-panel>`;
    }
    this.sidePanels.innerHTML = playerPanels;
  }
};
customElements.define("side-panel", SidePanel);

// resources/components/player-panel/player-panel.js
var PlayerPanel = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<player-stats player-name="${this.playerName}"></player-stats>
<div class="player-panel__minibar">
  <button type="button" data-component="player-inventory">
    <img src="/ui/777-0.png" width="26" height="28" />
  </button>
  <button type="button" data-component="player-equipment">
    <img src="/ui/778-0.png" width="27" height="32" />
  </button>
  <button type="button" data-component="player-skills">
    <img src="/ui/3579-0.png" width="23" height="22" />
  </button>
  <button type="button" data-component="player-quests">
    <img src="/ui/776-0.png" width="22" height="22" />
  </button>
  <button type="button" data-component="player-diaries">
    <img src="/ui/1298-0.png" width="22" height="22" />
  </button>
  <button type="button" class="player-panel__collection-log">
    <img src="/icons/items/22711.webp" width="32" />
  </button>
</div>
<div class="player-panel__content"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.playerName = this.getAttribute("player-name");
    this.render();
    this.contentArea = this.querySelector(".player-panel__content");
    this.eventListener(this.querySelector(".player-panel__minibar"), "click", this.handleMiniBarClick.bind(this));
    this.eventListener(
      this.querySelector(".player-panel__collection-log"),
      "click",
      this.handleCollectionLogClick.bind(this)
    );
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleCollectionLogClick() {
    const collectionLogEl = document.createElement("collection-log");
    collectionLogEl.setAttribute("player-name", this.playerName);
    document.body.appendChild(collectionLogEl);
  }
  handleMiniBarClick(event) {
    const component = event.target.getAttribute("data-component");
    if (component && this.activeComponent !== component) {
      this.contentArea.innerHTML = `<${component} player-name="${this.playerName}"></${component}>`;
      if (this.activeComponent) {
        this.querySelector(`button[data-component="${this.activeComponent}"]`).classList.remove(
          "player-panel__tab-active"
        );
      }
      this.querySelector(`button[data-component="${component}"]`).classList.add("player-panel__tab-active");
      this.activeComponent = component;
      this.classList.add("expanded");
    } else if (this.activeComponent && this.activeComponent === component) {
      this.contentArea.innerHTML = "";
      this.querySelector(`button[data-component="${this.activeComponent}"]`).classList.remove(
        "player-panel__tab-active"
      );
      this.activeComponent = null;
      this.classList.remove("expanded");
    }
  }
};
customElements.define("player-panel", PlayerPanel);

// resources/components/player-stats/player-stats.js
var PlayerStats = class extends BaseElement {
  constructor() {
    super();
    this.hitpoints = { current: 1, max: 1 };
    this.prayer = { current: 1, max: 1 };
    this.energy = { current: 1, max: 1 };
    this.world = 301;
  }
  html() {
    return `<div class="player-stats__hitpoints">
  <stat-bar class="player-stats__hitpoints-bar" bar-color="#157145"></stat-bar>
  <player-interacting player-name="${this.playerName}"></player-interacting>
  <div class="player-stats__name">
    <player-icon player-name="${this.playerName}"></player-icon> ${this.playerName} -
    <span class="player-stats__world"></span>
  </div>
  <div class="player-stats__hitpoints-numbers">${this.hitpoints.current} / ${this.hitpoints.max}</div>
</div>
<div class="player-stats__prayer">
  <stat-bar class="player-stats__prayer-bar" bar-color="#336699"></stat-bar>
  <div class="player-stats__prayer-numbers">${this.prayer.current} / ${this.prayer.max}</div>
</div>
<div class="player-stats__energy">
  <stat-bar class="player-stats__energy-bar" bar-color="#a9a9a9"></stat-bar>
</div>
<xp-dropper player-name="${this.playerName}"></xp-dropper>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.playerName = this.getAttribute("player-name");
    this.render();
    this.worldEl = this.querySelector(".player-stats__world");
    this.hitpointsBar = this.querySelector(".player-stats__hitpoints-bar");
    this.prayerBar = this.querySelector(".player-stats__prayer-bar");
    this.energyBar = this.querySelector(".player-stats__energy-bar");
    this.subscribe(`stats:${this.playerName}`, this.handleUpdatedStats.bind(this));
    this.subscribe(`inactive:${this.playerName}`, this.handleWentInactive.bind(this));
    this.subscribe(`active:${this.playerName}`, this.handleWentActive.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleUpdatedStats(stats, member) {
    this.updateStatBars(stats);
    this.updateWorld(stats.world, member.inactive, member.lastUpdated);
  }
  handleWentInactive(inactive, member) {
    this.updateWorld(void 0, inactive, member.lastUpdated);
  }
  handleWentActive(_, member) {
    this.world = void 0;
    this.updateWorld(member.stats.world, false);
  }
  updateWorld(world, isInactive, lastUpdated) {
    if (isInactive) {
      const locale = Intl?.DateTimeFormat()?.resolvedOptions()?.locale || void 0;
      this.worldEl.innerText = `${lastUpdated.toLocaleString(locale)}`;
      if (!this.classList.contains("player-stats__inactive")) {
        this.classList.add("player-stats__inactive");
      }
    } else if (this.world !== world) {
      this.world = world;
      if (this.classList.contains("player-stats__inactive")) {
        this.classList.remove("player-stats__inactive");
      }
      this.worldEl.innerText = `W${this.world}`;
    }
  }
  updateStatBars(stats) {
    if (stats.hitpoints === void 0 || stats.prayer === void 0 || stats.energy === void 0) {
      return;
    }
    this.updateText(stats.hitpoints, "hitpoints");
    this.updateText(stats.prayer, "prayer");
    window.requestAnimationFrame(() => {
      if (!this.isConnected) return;
      this.hitpointsBar.update(stats.hitpoints.current / stats.hitpoints.max);
      this.prayerBar.update(stats.prayer.current / stats.prayer.max);
      this.energyBar.update(stats.energy.current / stats.energy.max);
    });
  }
  updateText(stat, name) {
    const numbers = this.querySelector(`.player-stats__${name}-numbers`);
    if (!numbers) return;
    const currentStat = this[name];
    if (currentStat === void 0 || currentStat.current !== stat.current || currentStat.max !== stat.max) {
      this[name] = stat;
      numbers.innerText = `${stat.current} / ${stat.max}`;
    }
  }
};
customElements.define("player-stats", PlayerStats);

// resources/components/player-inventory/player-inventory.js
var PlayerInventory = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="player-inventory__background">
</div>

<div class="player-inventory__inventory"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.inventoryEl = this.querySelector(".player-inventory__inventory");
    this.playerName = this.getAttribute("player-name");
    this.subscribe(`inventory:${this.playerName}`, this.handleUpdatedInventory.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleUpdatedInventory(inventory) {
    const items = document.createDocumentFragment();
    for (let position = 0; position < inventory.length; ++position) {
      const item = inventory[position];
      if (!item.isValid()) continue;
      const row = Math.floor(position / 4);
      const column = position - row * 4;
      const itemEl = document.createElement("item-box");
      itemEl.style.gridColumn = `${column + 1} / ${column + 1}`;
      itemEl.style.gridRow = `${row + 1} / ${row + 1}`;
      itemEl.setAttribute("player-name", this.playerName);
      itemEl.setAttribute("inventory-type", "inventory");
      if (item.isRunePouch()) {
        itemEl.setAttribute("no-tooltip", "true");
      }
      itemEl.item = item;
      items.appendChild(itemEl);
    }
    this.inventoryEl.innerHTML = "";
    this.inventoryEl.appendChild(items);
  }
};
customElements.define("player-inventory", PlayerInventory);

// resources/components/player-skills/player-skills.js
var PlayerSkills = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.playerName = this.getAttribute("player-name");
    this.renderSkillBoxes();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  renderSkillBoxes() {
    const skillBoxes = document.createDocumentFragment();
    const skills = [
      SkillName.Attack,
      SkillName.Hitpoints,
      SkillName.Mining,
      SkillName.Strength,
      SkillName.Agility,
      SkillName.Smithing,
      SkillName.Defence,
      SkillName.Herblore,
      SkillName.Fishing,
      SkillName.Ranged,
      SkillName.Thieving,
      SkillName.Cooking,
      SkillName.Prayer,
      SkillName.Crafting,
      SkillName.Firemaking,
      SkillName.Magic,
      SkillName.Fletching,
      SkillName.Woodcutting,
      SkillName.Runecraft,
      SkillName.Slayer,
      SkillName.Farming,
      SkillName.Construction,
      SkillName.Hunter
    ];
    let zindex = skills.length;
    skills.forEach((skillName) => {
      const skillBox = document.createElement("skill-box");
      skillBox.setAttribute("player-name", this.playerName);
      skillBox.setAttribute("skill-name", skillName);
      skillBox.setAttribute("style", `z-index: ${zindex--}`);
      skillBoxes.appendChild(skillBox);
    });
    const overallSkillBox = document.createElement("total-level-box");
    overallSkillBox.setAttribute("player-name", this.playerName);
    skillBoxes.appendChild(overallSkillBox);
    this.innerHTML = "";
    this.appendChild(skillBoxes);
  }
};
customElements.define("player-skills", PlayerSkills);

// resources/components/skill-box/skill-box.js
var SkillBox = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="skill-box__left">
  <img class="skill-box__icon" src="${Skill.getIcon(this.skillName)}" />
</div>

<div class="skill-box__right">
  <div class="skill-box__current-level"></div>
  <div class="skill-box__baseline-level"></div>
</div>

<div class="skill-box__progress">
  <div class="skill-box__progress-bar"></div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.enableTooltip();
    this.skillName = this.getAttribute("skill-name");
    this.playerName = this.getAttribute("player-name");
    this.render();
    this.currentLevel = this.querySelector(".skill-box__current-level");
    this.baseLevel = this.querySelector(".skill-box__baseline-level");
    this.progressBar = this.querySelector(".skill-box__progress-bar");
    this.subscribe(`${this.skillName}:${this.playerName}`, this.handleUpdatedSkill.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleUpdatedSkill(skill) {
    this.currentLevel.innerHTML = Math.min(99, skill.level);
    this.baseLevel.innerHTML = skill.level;
    const levelProgress = skill.levelProgress;
    this.progressBar.style.transform = `scaleX(${levelProgress})`;
    this.progressBar.style.background = `hsl(${levelProgress * 100}, 100%, 50%)`;
    this.updateTooltip(
      `Total XP: ${skill.xp.toLocaleString()}<br />XP until next level: ${skill.xpUntilNextLevel.toLocaleString()}`
    );
  }
};
customElements.define("skill-box", SkillBox);

// resources/components/player-equipment/player-equipment.js
var EquipmentSlot = {
  Head: 0,
  Back: 1,
  Neck: 2,
  Weapon: 3,
  Torso: 4,
  Shield: 5,
  Legs: 7,
  Gloves: 9,
  Boots: 10,
  Ring: 12,
  Ammo: 13
};
var PlayerEquipment = class extends BaseElement {
  constructor() {
    super();
    this.emptySlotImages = {
      [EquipmentSlot.Head]: "156-0.png",
      [EquipmentSlot.Back]: "157-0.png",
      [EquipmentSlot.Neck]: "158-0.png",
      [EquipmentSlot.Weapon]: "159-0.png",
      [EquipmentSlot.Torso]: "161-0.png",
      [EquipmentSlot.Shield]: "162-0.png",
      [EquipmentSlot.Legs]: "163-0.png",
      [EquipmentSlot.Gloves]: "164-0.png",
      [EquipmentSlot.Boots]: "165-0.png",
      [EquipmentSlot.Ring]: "160-0.png",
      [EquipmentSlot.Ammo]: "166-0.png"
    };
  }
  html() {
    return `<div class="equipment">
  <div class="equipment-head equipment-slot"></div>
  <div class="equipment-cape equipment-slot"></div>
  <div class="equipment-neck equipment-slot"></div>
  <div class="equipment-ammo equipment-slot"></div>
  <div class="equipment-weapon equipment-slot"></div>
  <div class="equipment-torso equipment-slot"></div>
  <div class="equipment-shield equipment-slot"></div>
  <div class="equipment-legs equipment-slot"></div>
  <div class="equipment-gloves equipment-slot"></div>
  <div class="equipment-boots equipment-slot"></div>
  <div class="equipment-ring equipment-slot"></div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.playerName = this.getAttribute("player-name");
    this.slotEls = {
      [EquipmentSlot.Head]: this.querySelector(".equipment-head"),
      [EquipmentSlot.Back]: this.querySelector(".equipment-cape"),
      [EquipmentSlot.Neck]: this.querySelector(".equipment-neck"),
      [EquipmentSlot.Weapon]: this.querySelector(".equipment-weapon"),
      [EquipmentSlot.Torso]: this.querySelector(".equipment-torso"),
      [EquipmentSlot.Shield]: this.querySelector(".equipment-shield"),
      [EquipmentSlot.Legs]: this.querySelector(".equipment-legs"),
      [EquipmentSlot.Gloves]: this.querySelector(".equipment-gloves"),
      [EquipmentSlot.Boots]: this.querySelector(".equipment-boots"),
      [EquipmentSlot.Ring]: this.querySelector(".equipment-ring"),
      [EquipmentSlot.Ammo]: this.querySelector(".equipment-ammo")
    };
    this.subscribe(`equipment:${this.playerName}`, this.handleUpdatedEquipment.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleUpdatedEquipment(equipment) {
    for (let position = 0; position < equipment.length; ++position) {
      const el = this.slotEls[position];
      if (el === void 0) continue;
      const item = equipment[position];
      if (item.isValid()) {
        const itemEl = document.createElement("item-box");
        itemEl.item = item;
        itemEl.setAttribute("player-name", this.playerName);
        itemEl.setAttribute("inventory-type", "equipment");
        el.innerHTML = "";
        el.appendChild(itemEl);
      } else {
        el.innerHTML = `<img loading="lazy" src="/ui/${this.emptySlotImages[position]}" />`;
      }
    }
  }
};
customElements.define("player-equipment", PlayerEquipment);

// resources/components/xp-dropper/xp-dropper.js
var XpDropper = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    const playerName = this.getAttribute("player-name");
    this.render();
    this.subscribe(`xp:${playerName}`, this.handleNewXpDrops.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleNewXpDrops(xpDrops) {
    let dropsHtml = "";
    for (const drop of xpDrops) {
      dropsHtml += `<div><img class="xp-droppper__skill-icon" src="${drop.icon}" />+${drop.xp}</div>`;
    }
    const dropContainer = document.createElement("div");
    dropContainer.classList.add("xp-dropper__drop");
    dropContainer.innerHTML = dropsHtml;
    dropContainer.style.paddingTop = this.offsetHeight + "px";
    dropContainer.addEventListener("animationend", () => dropContainer.remove());
    this.appendChild(dropContainer);
  }
};
customElements.define("xp-dropper", XpDropper);

// resources/components/rs-tooltip/rs-tooltip.js
var RsTooltip = class _RsTooltip extends BaseElement {
  constructor() {
    super();
  }
  html() {
    if (this.tooltipText) {
      this.style.display = "block";
      return `${this.tooltipText}
`;
    } else {
      this.style.display = "none";
      return "";
    }
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    _RsTooltip.globalTooltip = this;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  updatePosition(mouseEvent) {
    const x = mouseEvent.clientX;
    const y = mouseEvent.clientY;
    const top = Math.max(0, y - this.height);
    let left = x + 2;
    if (left >= document.body.clientWidth / 2) {
      left -= this.offsetWidth + 2;
    }
    this.style.transform = `translate(${left}px, ${top}px)`;
  }
  showTooltip(tooltipText) {
    this.tooltipText = tooltipText;
    this.eventListener(document.body, "mousemove", this.updatePosition.bind(this));
    this.render();
    this.height = this.offsetHeight;
  }
  hideTooltip() {
    this.tooltipText = null;
    this.unbindEvents();
    this.render();
  }
};
customElements.define("rs-tooltip", RsTooltip);

// resources/components/item-box/item-box.js
var ItemBox = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="item-box__container">
  <img class="item-box__image" src="${Item.imageUrl(this.itemId, this.quantity)}" loading="lazy" />
  ${this.quantity > 1 ? `
  <span class="item-box__quantity">
    ${this.veryShortQuantity ? Item.veryShortQuantity(this.quantity) : Item.shortQuantity(this.quantity)}
  </span>
  ` : ""}
  ${this.item?.isRunePouch() ? `
  <rune-pouch
    player-name="${this.playerName}"
    pouch-name="${this.item.name}">
  </rune-pouch>
  ` : ""}
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.noTooltip = this.hasAttribute("no-tooltip");
    this.playerName = this.getAttribute("player-name");
    this.veryShortQuantity = this.hasAttribute("very-short-quantity");
    this.quantity = this.item?.quantity || parseInt(this.getAttribute("item-quantity"));
    this.itemId = this.item?.id || parseInt(this.getAttribute("item-id"));
    if (!this.noTooltip) {
      this.enableTooltip();
      if (this.item) {
        const inventoryType = this.getAttribute("inventory-type");
        const totalInventoryQuantity = groupData.inventoryQuantityForItem(this.item.id, this.playerName, inventoryType);
        const stackHighAlch = totalInventoryQuantity * this.item.highAlch;
        const stackGePrice = totalInventoryQuantity * this.item.gePrice;
        this.tooltipText = `
${this.item.name} x ${totalInventoryQuantity}
<br />
HA: ${stackHighAlch.toLocaleString()}
<br />
GE: ${stackGePrice.toLocaleString()}`;
      } else {
        this.tooltipText = `${Item.itemName(this.itemId)} x ${this.quantity.toLocaleString()}`;
      }
    }
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("item-box", ItemBox);

// resources/components/total-level-box/total-level-box.js
var TotalLevelBox = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<img class="total-level-box__image" src="/ui/183-0.png" />
<img class="total-level-box__image" src="/ui/184-0.png" />
<div class="total-level-box__content">
  <span>Total level:</span>
  <span class="total-level-box__level"></span>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.enableTooltip();
    this.playerName = this.getAttribute("player-name");
    this.render();
    this.totalLevel = this.querySelector(".total-level-box__level");
    this.subscribe(`Overall:${this.playerName}`, this.handleUpdatedTotalXp.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleUpdatedTotalXp(skill) {
    this.totalLevel.innerHTML = skill.level;
    this.updateTooltip(`Total XP: ${skill.xp.toLocaleString()}`);
  }
};
customElements.define("total-level-box", TotalLevelBox);

// resources/components/player-quests/player-quests.js
var PlayerQuests = class extends BaseElement {
  constructor() {
    super();
  }
  /* eslint-disable no-unused-vars */
  html() {
    const freeToPlayQuestsHtml = `
<h4 class="player-quests__section-header">Free Quests</h4>
${this.questSectionHtml(Quest.freeToPlayQuests)}
`;
    const memberQuestsHtml = `
<h4 class="player-quests__section-header">Members' Quests</h4>
${this.questSectionHtml(Quest.memberQuests)}
`;
    const miniQuestsHtml = `
<h4 class="player-quests__section-header">Miniquests</h4>
${this.questSectionHtml(Quest.miniQuests)}
`;
    return `<div class="player-quests__top">
  <search-element class="player-quests__filter input-small" placeholder="Filter Quests"></search-element>
  <div class="player-quests__points">
    <span class="player-quests__current-points">${this.questPoints}</span> / ${Quest.totalPoints}
  </div>
</div>
<div class="player-quests__list">${freeToPlayQuestsHtml} ${memberQuestsHtml} ${miniQuestsHtml}</div>
`;
  }
  /* eslint-enable no-unused-vars */
  connectedCallback() {
    super.connectedCallback();
    const playerName = this.getAttribute("player-name");
    this.render();
    this.questListElements = /* @__PURE__ */ new Map();
    const els = Array.from(this.querySelectorAll(".player-quests__quest"));
    for (const el of els) {
      const questId = parseInt(el.getAttribute("quest-id"));
      this.questListElements.set(questId, el);
    }
    this.currentQuestPointsEl = this.querySelector(".player-quests__current-points");
    this.subscribe(`quests:${playerName}`, this.handleUpdatedQuests.bind(this));
    this.searchElement = this.querySelector("search-element");
    this.eventListener(this.searchElement, "input", this.handleSearch.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  questSectionHtml(questsData) {
    let result = "";
    const questsDataEntries = Object.entries(questsData).sort((a, b) => {
      return a[1].sortName.localeCompare(b[1].sortName);
    });
    for (const [questId, _questData] of questsDataEntries) {
      const quest = this.getQuestById(questId);
      result += `
<a href="${quest.wikiLink}" target="_blank" rel="noopener noreferrer">
  <div class="player-quests__quest" quest-id="${questId}">
    <img class="player-quests__difficulty-icon" src="${quest.icon}" alt="${quest.difficulty}" title="${quest.difficulty}" />
    ${quest.name}
  </div>
</a>
`;
    }
    return result;
  }
  get questPoints() {
    let result = 0;
    if (this.quests) {
      for (const quest of Object.values(this.quests)) {
        result += quest.points;
      }
    }
    return result;
  }
  classForQuestState(questState) {
    switch (questState) {
      case QuestState.NOT_STARTED:
        return "player-quests__not-started";
      case QuestState.IN_PROGRESS:
        return "player-quests__in-progress";
      case QuestState.FINISHED:
        return "player-quests__finished";
    }
    return "";
  }
  handleUpdatedQuests(quests) {
    const previousQuests = this.quests;
    this.quests = quests;
    for (const [questId, el] of this.questListElements.entries()) {
      const previousQuest = previousQuests?.[questId];
      const quest = this.quests?.[questId];
      const previousQuestState = this.classForQuestState(previousQuest?.state);
      const newQuestState = this.classForQuestState(quest?.state);
      if (previousQuestState !== newQuestState) {
        if (previousQuestState.length > 0) {
          el.classList.remove(previousQuestState);
        }
        el.classList.add(newQuestState);
      }
    }
    this.currentQuestPointsEl.innerHTML = this.questPoints;
  }
  getQuestById(questId) {
    return this.quests?.[questId] || new Quest(questId, QuestState.NOT_STARTED);
  }
  handleSearch() {
    const inputText = this.searchElement.value.trim().toLowerCase();
    for (const [questId, el] of this.questListElements.entries()) {
      const quest = this.getQuestById(questId);
      const name = quest.name;
      if (inputText.length === 0 || name.toLowerCase().includes(inputText)) {
        el.classList.remove("player-quests__hidden");
      } else {
        el.classList.add("player-quests__hidden");
      }
    }
  }
};
customElements.define("player-quests", PlayerQuests);

// resources/components/validators.js
function validCharacters(value) {
  return !/[^A-Za-z 0-9-_]/g.test(value);
}
function validLength(value) {
  return value.length >= 1 && value.length <= 16;
}

// resources/components/loading-screen/loading-screen-manager.js
var LoadingScreenManager = class {
  get globalLoadingScreen() {
    if (this._globalLoadingScreen) return this._globalLoadingScreen;
    this._globalLoadingScreen = document.querySelector("loading-screen");
    return this._globalLoadingScreen;
  }
  showLoadingScreen() {
    this.globalLoadingScreen.style.display = "block";
  }
  hideLoadingScreen() {
    this.globalLoadingScreen.style.display = "none";
  }
};
var loadingScreenManager = new LoadingScreenManager();

// resources/components/create-group/create-group.js
var CreateGroup = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="create-group__steps rsborder rsbackground">
  <div class="create-group__step">
    <h3>Pick a name for your group</h3>
    <p>This does <span class="emphasize">not</span> need to be the in-game name.</p>
    <men-input class="create-group__name" input-id="group-name" placeholder-text="Group name"></men-input>
  </div>

  <div class="create-group__step">
    <h3>What size is the group?</h3>
    <p>This can be changed later.</p>
    <div class="select-container rsborder-tiny rsbackground">
      <select id="group-member-count">
        <option disabled selected value>Select an option</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </div>
  </div>

  <div class="create-group__step create-group__step-members">
    <h3>Enter each members' name</h3>
    <p>This <span class="emphasize">does</span> need to match the in-game name. (Can be changed later)</p>
    <div class="create-group__member-inputs"></div>
  </div>

  ${this.captchaEnabled ? `<div id="create-group__step-captcha" class="create-group__step h-captcha"></div>` : ""}

  <button type="button" class="create-group__submit men-button">Create group</button>
  <div class="create-group__server-error validation-error"></div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    loadingScreenManager.showLoadingScreen();
    this.initCaptcha().then(() => {
      loadingScreenManager.hideLoadingScreen();
      if (!this.isConnected) return;
      this.render();
      this.groupName = this.querySelector(".create-group__name");
      this.groupName.validators = [
        (value) => {
          return !validCharacters(value) ? "Group name has some unsupported special characters." : null;
        },
        (value) => {
          return !validLength(value) ? "Group name must be between 1 and 16 characters." : null;
        }
      ];
      this.serverError = this.querySelector(".create-group__server-error");
      this.eventListener(this.querySelector("#group-member-count"), "change", this.handleMemberCountChange.bind(this));
      this.eventListener(this.querySelector(".create-group__submit"), "click", this.createGroup.bind(this));
      if (this.captchaEnabled) {
        this.captchaWidgetID = hcaptcha.render("create-group__step-captcha", {
          sitekey: this.sitekey,
          theme: "dark"
        });
      }
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.captchaEnabled) {
      document.getElementById("hcaptcha").remove();
      window.hcaptcha = void 0;
    }
  }
  resetMembersSection() {
    const membersSection = this.querySelector(".create-group__member-inputs");
    membersSection.innerHTML = "";
  }
  get memberNameInputs() {
    return Array.from(this.querySelectorAll(".create-group__member-inputs member-name-input"));
  }
  validateMemberNames() {
    const inputs = this.memberNameInputs;
    let allValid = true;
    for (const input of inputs) {
      if (!input.valid) allValid = false;
    }
    return allValid;
  }
  displayMembersSection(memberCount) {
    this.resetMembersSection();
    const membersSection = this.querySelector(".create-group__member-inputs");
    const memberInputEls = document.createDocumentFragment();
    for (let i = 0; i < memberCount; ++i) {
      const memberInput = document.createElement("member-name-input");
      memberInput.setAttribute("member-number", i + 1);
      memberInputEls.appendChild(memberInput);
    }
    membersSection.innerHTML = "";
    membersSection.appendChild(memberInputEls);
    this.querySelector(".create-group__step-members").style.display = "block";
    this.querySelector(".create-group__submit").style.display = "block";
  }
  handleMemberCountChange(evt) {
    const target = evt.target;
    const memberCount = parseInt(target.value);
    this.displayMembersSection(memberCount);
  }
  async createGroup() {
    this.serverError.innerHTML = "";
    if (!this.groupName.valid || !this.validateMemberNames()) {
      return;
    }
    let captchaResponse = "";
    if (this.captchaEnabled) {
      captchaResponse = hcaptcha.getResponse(this.captchaWidgetID);
      if (!captchaResponse) {
        this.serverError.innerHTML = "Complete the captcha";
        return;
      }
    }
    const groupName = this.groupName.value;
    const memberInputs = this.memberNameInputs;
    const memberNames = [];
    for (const input of memberInputs) {
      memberNames.push(input.value);
    }
    for (let i = memberNames.length; i < 5; ++i) {
      memberNames.push("");
    }
    const submitBtn = document.querySelector(".create-group__submit");
    try {
      submitBtn.disabled = true;
      const result = await api.createGroup(groupName, memberNames, captchaResponse);
      if (!result.ok) {
        const message = await result.text();
        this.serverError.innerHTML = `Error creating group: ${message}`;
      } else {
        const createdGroup = await result.json();
        storage.storeGroup(createdGroup.name, createdGroup.token);
        window.history.pushState("", "", "/setup-instructions");
      }
    } catch (err) {
      this.serverError.innerHTML = `Error creating group: ${err}`;
    } finally {
      submitBtn.disabled = false;
    }
  }
  async initCaptcha() {
    const captchaEnabled = await api.getCaptchaEnabled();
    this.captchaEnabled = captchaEnabled.enabled;
    this.sitekey = captchaEnabled.sitekey;
    if (this.captchaEnabled) {
      await this.waitForCaptchaScript();
    }
  }
  waitForCaptchaScript() {
    return new Promise((resolve) => {
      if (document.getElementById("hcaptcha")) resolve();
      window.menCaptchaLoaded = () => resolve();
      const script = document.createElement("script");
      script.id = "hcaptcha";
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit&onload=menCaptchaLoaded";
      document.body.appendChild(script);
    });
  }
};
customElements.define("create-group", CreateGroup);

// resources/components/men-link/men-link.js
var MenLink = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    this.href = this.getAttribute("link-href");
    return `<a href="${this.href}"> ${this.innerHTML} </a>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.eventListener(this.querySelector("a"), "click", this.navigate.bind(this), { passive: false });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  navigate(evt) {
    evt.preventDefault();
    window.history.pushState("", "", this.href);
  }
};
customElements.define("men-link", MenLink);

// resources/components/setup-instructions/setup-instructions.js
var SetupInstructions = class extends BaseElement {
  constructor() {
    super();
  }
  /* eslint-disable no-unused-vars */
  html() {
    const group = storage.getGroup();
    return `<div class="setup__container rsbackground rsborder">
  <div class="setup__block">
    <h3>The group's login</h3>
    <p>Only share these with your group. You can't recover it so keep it safe!</p>
    <div class="setup__block">
      <h4>Group Name</h4>
      <div class="setup__credential rsborder-tiny rsbackground">
        ${group.groupName}
      </div>
    </div>

    <div class="setup__block">
      <h4>Group Token</h4>
      <div class="setup__credential rsborder-tiny rsbackground">
        <div class="setup__credential-hide" onclick="this.remove()">Click to show</div>
        ${group.groupToken}
      </div>
    </div>
  </div>

  <div class="setup__block">
    <h3>Setup</h3>
    <p>
      This app requires each group member to install a runelite plugin from the Plugin Hub in order to track player
      information. Find it by searching "<span class="emphasize">Group Ironmen Tracker</span>" in the Runelite client.
    </p>
  </div>

  <div class="setup__config">
    <p>
      Use the provided credentials to fill in the <span class="emphasize">Group Config</span> section in the plugin's
      configuration.
    </p>
    <img src="/images/config_panel.png" />
  </div>

  <div class="setup__go-to-group">
    <men-link link-href="/group">
      <button class="men-button">Go to group</button>
    </men-link>
  </div>
</div>
`;
  }
  /* eslint-enable no-unused-vars */
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("setup-instructions", SetupInstructions);

// resources/components/app-initializer/app-initializer.js
var AppInitializer = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    this.initializeApp();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }
  cleanup() {
    api.disable();
    pubsub.unpublishAll();
    exampleData.disable();
    api.exampleDataEnabled = false;
    loadingScreenManager.hideLoadingScreen();
  }
  async initializeApp() {
    this.cleanup();
    loadingScreenManager.showLoadingScreen();
    await Promise.all([Item.loadItems(), Item.loadGePrices(), Quest.loadQuests(), AchievementDiary.loadDiaries()]);
    const group = storage.getGroup();
    if (this.isConnected) {
      if (group.groupName === "@EXAMPLE") {
        await this.loadExampleData();
      } else {
        await this.loadGroup(group);
      }
      loadingScreenManager.hideLoadingScreen();
    }
  }
  async loadExampleData() {
    exampleData.enable();
    api.exampleDataEnabled = true;
    await api.enable();
  }
  async loadGroup(group) {
    const firstDataEvent = pubsub.waitUntilNextEvent("get-group-data", false);
    await api.enable(group.groupName, group.groupToken);
    await firstDataEvent;
  }
};
customElements.define("app-initializer", AppInitializer);

// resources/components/group-settings/group-settings.js
var GroupSettings = class extends BaseElement {
  constructor() {
    super();
  }
  /* eslint-disable no-unused-vars */
  html() {
    const selectedPanelDockSide = appearance.getLayout();
    const style = appearance.getTheme();
    return `<div class="rsborder rsbackground group-settings__container">
  <h3>Member settings</h3>
  <p>These <span class="emphasize">do</span> need to match the in-game names.</p>
  <div class="group-settings__section-content group-settings__members"></div>

  <h3>Appearance settings</h3>
  <fieldset class="group-settings__panels">
    <legend>Player panels</legend>
    <div>
      <input id="panel-dock__left" type="radio" value="left" name="panel-dock-side" ${selectedPanelDockSide !== "row-reverse" ? "checked" : ""} />
      <label for="panel-dock__left">Dock panels to left</label>
    </div>
    <div>
      <input id="panel-dock__right" type="radio" value="right" name="panel-dock-side" ${selectedPanelDockSide === "row-reverse" ? "checked" : ""}/>
      <label for="panel-dock__right">Dock panels to right</label>
    </div>
  </fieldset>

  <fieldset class="group-settings__style">
    <legend>Style</legend>
    <div>
      <input id="style__light" type="radio" value="light" name="appearance-style" ${style !== "dark" ? "checked" : ""} />
      <label for="style__light">Light</label>
    </div>
    <div>
      <input id="style__dark" type="radio" value="dark" name="appearance-style" ${style === "dark" ? "checked" : ""}/>
      <label for="style__dark">Dark</label>
    </div>
  </fieldset>
</div>
`;
  }
  /* eslint-enable no-unused-vars */
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.memberSection = this.querySelector(".group-settings__members");
    this.panelDockSide = this.querySelector(".group-settings__panels");
    this.appearanceStyle = this.querySelector(".group-settings__style");
    this.subscribe("members-updated", this.handleUpdatedMembers.bind(this));
    this.eventListener(this.panelDockSide, "change", this.handlePanelDockSideChange.bind(this));
    this.eventListener(this.appearanceStyle, "change", this.handleStyleChange.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleStyleChange() {
    const style = this.querySelector(`input[name="appearance-style"]:checked`).value;
    appearance.setTheme(style);
  }
  handlePanelDockSideChange() {
    const side = this.querySelector(`input[name="panel-dock-side"]:checked`).value;
    if (side === "right") {
      appearance.setLayout("row-reverse");
    } else {
      appearance.setLayout("row");
    }
  }
  handleUpdatedMembers(members) {
    members = members.filter((member) => member.name !== "@SHARED");
    let memberEdits = document.createDocumentFragment();
    for (let i = 0; i < members.length; ++i) {
      const member = members[i];
      const memberEdit = document.createElement("edit-member");
      memberEdit.member = member;
      memberEdit.memberNumber = i + 1;
      memberEdits.appendChild(memberEdit);
    }
    if (members.length < 5) {
      const addMember = document.createElement("edit-member");
      addMember.memberNumber = members.length + 1;
      memberEdits.appendChild(addMember);
    }
    this.memberSection.innerHTML = "";
    this.memberSection.appendChild(memberEdits);
  }
};
customElements.define("group-settings", GroupSettings);

// resources/components/men-input/men-input.js
var MenInput = class extends BaseElement {
  constructor() {
    super();
  }
  /* eslint-disable no-unused-vars */
  html() {
    const id = this.getAttribute("input-id");
    const placeholder = this.getAttribute("placeholder-text");
    const label = this.getAttribute("input-label");
    const isPassword = this.hasAttribute("type-password");
    const maxLength = parseInt(this.getAttribute("max-length")) || 16;
    return `${label ? `<label for="${id}">${label}</label>` : ""} <input id="${id}" placeholder="${placeholder}"
maxlength="${maxLength}" ${isPassword ? `type="password"` : ""} />
<div class="validation-error"></div>
`;
  }
  /* eslint-enable no-unused-vars */
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.noTrim = this.hasAttribute("no-trim");
    this.input = this.querySelector("input");
    const initialValue = this.trim(this.getAttribute("input-value"));
    if (initialValue) {
      this.input.value = initialValue;
    }
    this.validationError = this.querySelector(".validation-error");
    this.eventListener(this.input, "blur", this.handleBlurEvent.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  trim(value) {
    if (this.noTrim) return value;
    return value?.trim();
  }
  handleBlurEvent() {
    this.updateValueAndValidity();
  }
  makeInvalid(invalidReason) {
    this.input.classList.add("invalid");
    this.validationError.innerHTML = invalidReason;
  }
  makeValid() {
    this.input.classList.remove("invalid");
    this.validationError.innerHTML = "";
  }
  get value() {
    return this.trim(this.input.value);
  }
  get valid() {
    return this.updateValueAndValidity();
  }
  updateValueAndValidity() {
    this.input.value = this.trim(this.input.value);
    if (this.validators) {
      for (const validator of this.validators) {
        const invalidReason = validator(this.input.value);
        if (invalidReason) {
          this.makeInvalid(invalidReason);
          return false;
        }
      }
    }
    this.makeValid();
    return true;
  }
};
customElements.define("men-input", MenInput);

// resources/components/member-name-input/member-name-input.js
var MemberNameInput = class extends MenInput {
  constructor() {
    super();
  }
  connectedCallback() {
    this.memberNumber = parseInt(this.getAttribute("member-number"));
    this.setAttribute("placeholder-text", "Player name");
    this.setAttribute("input-id", `member-name${this.memberNumber}`);
    this.setAttribute("input-label", `Name of member ${this.memberNumber}`);
    this.setAttribute("no-trim", "true");
    this.validators = [
      (value) => {
        return !validCharacters(value) ? "Character name has some unsupported special characters." : null;
      },
      (value) => {
        return !validLength(value) ? "Character name must be between 1 and 16 characters." : null;
      }
    ];
    super.connectedCallback();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("member-name-input", MemberNameInput);

// resources/components/confirm-dialog/confirm-dialog-manager.js
var ConfirmDialogManager = class {
  get globalConfirmDialog() {
    if (this._globalConfirmDialog) return this._globalConfirmDialog;
    this._globalConfirmDialog = document.querySelector("confirm-dialog");
    return this._globalConfirmDialog;
  }
  confirm(options) {
    const confirmDialog = this.globalConfirmDialog;
    confirmDialog.show(options);
  }
};
var confirmDialogManager = new ConfirmDialogManager();

// resources/components/edit-member/edit-member.js
var EditMember = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<member-name-input input-value="${this.member?.name || ""}" member-number="${this.memberNumber}"></member-name-input>

<div class="edit-member__buttons">
  ${this.member ? `
  <button class="edit-member__rename men-button small">Rename</button>
  <button class="edit-member__remove men-button small">Remove</button>
  ` : `
  <button class="edit-member__add men-button small">Add member</button>
  `}
</div>

<div class="edit-member__error validation-error"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.input = this.querySelector("member-name-input");
    this.error = this.querySelector(".edit-member__error");
    const renameButton = this.querySelector(".edit-member__rename");
    const removeButton = this.querySelector(".edit-member__remove");
    const addButton = this.querySelector(".edit-member__add");
    if (renameButton) {
      this.eventListener(renameButton, "click", this.renameMember.bind(this));
    }
    if (removeButton) {
      this.eventListener(removeButton, "click", this.removeMember.bind(this));
    }
    if (addButton) {
      this.eventListener(addButton, "click", this.addMember.bind(this));
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  hideError() {
    this.error.innerHTML = "";
  }
  showError(message) {
    this.error.innerHTML = message;
  }
  async renameMember() {
    this.hideError();
    if (!this.input.valid) return;
    const originalName = this.member.name;
    const newName = this.input.value;
    if (originalName === newName) {
      this.showError("New name is the same as the old name");
      return;
    }
    try {
      loadingScreenManager.showLoadingScreen();
      const result = await api.renameMember(originalName, newName);
      if (result.ok) {
        await api.restart();
        await pubsub.waitUntilNextEvent("get-group-data", false);
      } else {
        const message = await result.text();
        this.showError(`Failed to rename member ${message}`);
      }
    } catch (error) {
      this.showError(`Failed to rename member ${error}`);
    } finally {
      loadingScreenManager.hideLoadingScreen();
    }
  }
  removeMember() {
    this.hideError();
    confirmDialogManager.confirm({
      headline: `Delete ${this.member.name}?`,
      body: "All player data will be lost and cannot be recovered.",
      yesCallback: async () => {
        try {
          loadingScreenManager.showLoadingScreen();
          const result = await api.removeMember(this.member.name);
          if (result.ok) {
            await api.restart();
            await pubsub.waitUntilNextEvent("get-group-data", false);
          } else {
            const message = await result.text();
            this.showError(`Failed to remove member ${message}`);
          }
        } catch (error) {
          this.showError(`Failed to remove member ${error}`);
        } finally {
          loadingScreenManager.hideLoadingScreen();
        }
      },
      noCallback: () => {
      }
    });
  }
  async addMember() {
    this.hideError();
    if (!this.input.valid) return;
    try {
      loadingScreenManager.showLoadingScreen();
      const result = await api.addMember(this.input.value);
      if (result.ok) {
        await api.restart();
        await pubsub.waitUntilNextEvent("get-group-data", false);
      } else {
        const message = await result.text();
        this.showError(`Failed to add member ${message}`);
      }
    } catch (error) {
      this.showError(`Failed to add member ${error}`);
    } finally {
      loadingScreenManager.hideLoadingScreen();
    }
  }
};
customElements.define("edit-member", EditMember);

// resources/components/loading-screen/loading-screen.js
var LoadingScreen = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="loader"><div></div><div></div><div></div><div></div></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("loading-screen", LoadingScreen);

// resources/components/login-page/login-page.js
var LoginPage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="login__container rsborder rsbackground">
  <men-input
    class="login__name"
    input-id="groupName"
    placeholder-text="Group name"
    input-label="Group name"
  ></men-input>
  <men-input
    class="login__token"
    max-length="60"
    input-id="groupToken"
    placeholder-text="Group token"
    input-label="Group token"
    type-password
  ></men-input>
  <button class="login__button men-button">Login</button>
  <div class="login__error validation-error"></div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    const fieldRequiredValidator = (value) => {
      if (value.length === 0) {
        return "This field is required.";
      }
    };
    this.name = this.querySelector(".login__name");
    this.name.validators = [fieldRequiredValidator];
    this.token = this.querySelector(".login__token");
    this.token.validators = [fieldRequiredValidator];
    this.loginButton = this.querySelector(".login__button");
    this.error = this.querySelector(".login__error");
    this.eventListener(this.loginButton, "click", this.login.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  async login() {
    if (!this.name.valid || !this.token.valid) return;
    try {
      this.error.innerHTML = "";
      this.loginButton.disabled = true;
      const name = this.name.value;
      const token = this.token.value;
      api.setCredentials(name, token);
      const response = await api.amILoggedIn();
      if (response.ok) {
        storage.storeGroup(name, token);
        window.history.pushState("", "", "/group");
      } else {
        if (response.status === 401) {
          this.error.innerHTML = "Group name or token is incorrect";
        } else {
          const body = await response.text();
          this.error.innerHTML = `Unable to login ${body}`;
        }
      }
    } catch (error) {
      this.error.innerHTML = `Unable to login ${error}`;
    } finally {
      this.loginButton.disabled = false;
    }
  }
};
customElements.define("login-page", LoginPage);

// resources/components/logout-page/logout-page.js
var LogoutPage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    exampleData.disable();
    api.disable();
    storage.clearGroup();
    window.history.pushState("", "", "/");
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("logout-page", LogoutPage);

// resources/components/demo-page/demo-page.js
var DemoPage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    storage.storeGroup("@EXAMPLE", "00000000-0000-0000-0000-000000000000");
    window.history.pushState("", "", "/group");
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("demo-page", DemoPage);

// resources/components/social-links/social-links.js
var SocialLinks = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<a href="https://ko-fi.com/gimplugin" title="Support me on Ko-fi" target="_blank">
  <img loading="lazy" src="/images/kofi_p_logo_nolabel.webp" height="20"/>
</a>
<a href="https://github.com/christoabrown/group-ironmen-tracker" title="Github" target="_blank">
  <img loading="lazy" src="/images/github-light.webp" width="20" height="20" />
</a>
<a href="https://discord.gg/XmAPkvqVpP" title="Discord" target="_blank">
  <img loading="lazy" src="/images/discord-light.webp" width="18" height="20" />
</a>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("social-links", SocialLinks);

// resources/components/rune-pouch/rune-pouch.js
var RunePouch = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    const playerName = this.getAttribute("player-name");
    this.pouchName = this.getAttribute("pouch-name");
    this.subscribe(`runePouch:${playerName}`, this.handleUpdatedRunePouch.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleUpdatedRunePouch(runePouch) {
    this.runePouch = runePouch;
    this.render();
    let runeEls = document.createDocumentFragment();
    let tooltipRunes = [];
    for (const rune of this.runePouch) {
      const runeEl = document.createElement("div");
      runeEl.classList.add("rune-pouch__rune");
      if (rune.id > 0) {
        const itemBox = document.createElement("item-box");
        itemBox.setAttribute("very-short-quantity", "true");
        itemBox.setAttribute("no-tooltip", "true");
        itemBox.item = rune;
        runeEl.appendChild(itemBox);
        tooltipRunes.push(`${rune.quantity.toLocaleString()} ${rune.name}`);
      }
      runeEls.appendChild(runeEl);
    }
    this.appendChild(runeEls);
    this.enableTooltip();
    this.tooltipText = `${this.pouchName}<br />${tooltipRunes.join("<br />")}`;
  }
};
customElements.define("rune-pouch", RunePouch);

// resources/components/stat-bar/stat-bar.js
var StatBar = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.bar = this.querySelector(".stat-bar__current");
    this.color = this.getAttribute("bar-color");
    this.bgColor = this.getAttribute("bar-bgcolor");
    if (!this.bgColor && this.color.startsWith("#")) {
      const darkened = this.darkenColor(this.hexToRgb(this.color));
      this.bgColor = `rgb(${darkened.r}, ${darkened.g}, ${darkened.b})`;
    }
    if (this.color.startsWith("hsl")) {
      const [hue, saturation, lightness] = this.color.match(/\d+/g).map(Number);
      this.color = { hue, saturation, lightness };
    }
    const ratio = parseFloat(this.getAttribute("bar-ratio"), 10);
    if (!isNaN(ratio)) {
      this.update(ratio);
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  hexToRgb(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  darkenColor(color) {
    const d = 3;
    return {
      r: Math.round(color.r / d),
      g: Math.round(color.g / d),
      b: Math.round(color.b / d)
    };
  }
  getColor(ratio) {
    if (typeof this.color === "string") return this.color;
    const color = { ...this.color };
    color.hue = color.hue * ratio;
    return `hsl(${Math.round(color.hue)}, ${color.saturation}%, ${color.lightness}%)`;
  }
  update(ratio) {
    if (!this.isConnected) return;
    const x = ratio * 100;
    const color = this.getColor(ratio);
    if (ratio === 1) {
      this.style.background = color;
    } else {
      this.style.background = `linear-gradient(90deg, ${color}, ${x}%, ${this.bgColor} ${x}%)`;
    }
  }
};
customElements.define("stat-bar", StatBar);

// resources/components/player-interacting/player-interacting.js
var PlayerInteracting = class extends BaseElement {
  constructor() {
    super();
    this.staleTimeout = 30 * 1e3;
  }
  html() {
    return `<stat-bar bar-color="#A41623"></stat-bar>
<div class="player-interacting__name"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.hitpointsBar = this.querySelector("stat-bar");
    this.name = this.querySelector(".player-interacting__name");
    this.map = document.querySelector("#background-worldmap");
    const playerName = this.getAttribute("player-name");
    this.addMapMarker().then(() => {
      this.subscribe(`interacting:${playerName}`, this.handleInteracting.bind(this));
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.hideTimeout);
    if (this.marker) {
      this.map.removeInteractingMarker(this.marker);
    }
  }
  handleInteracting(interacting) {
    this.interacting = interacting;
    const timeSinceLastUpdate = utility.timeSinceLastUpdate(interacting.last_updated);
    const timeUntilHide = this.staleTimeout - timeSinceLastUpdate;
    if (timeUntilHide > 1e3) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = window.setTimeout(this.hide.bind(this), this.staleTimeout);
      this.hitpointsBar.update(interacting.ratio / interacting.scale);
      this.name.innerHTML = interacting.name;
      this.show();
    }
  }
  async addMapMarker() {
    this.marker = this.map.addInteractingMarker(0, 0, "");
  }
  hide() {
    this.style.visibility = "hidden";
    this.marker.coordinates = { x: -1e6, y: -1e6, plane: 0 };
  }
  show() {
    this.style.visibility = "visible";
    this.marker.coordinates = this.interacting.location;
    this.marker.label = this.interacting.name;
  }
};
customElements.define("player-interacting", PlayerInteracting);

// resources/components/skills-graphs/skills-graphs.js
var SkillsGraphs = class _SkillsGraphs extends BaseElement {
  constructor() {
    super();
  }
  /* eslint-disable no-unused-vars */
  html() {
    const skillNames = Object.values(SkillName).sort((a, b) => {
      if (a === "Overall") return -1;
      if (b === "Overall") return 1;
      return a.localeCompare(b);
    });
    return `<div class="skills-graphs__control-container">
  <button class="skills-graphs__refresh men-button">Refresh</button>

  <div class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    <select class="skills-graphs__period-select">
      <option value="Day">Period: 24 Hours</option>
      <option value="Week">Period: 7 Days</option>
      <option value="Month">Period: 30 Days</option>
      <option value="Year">Period: 12 Months</option>
    </select>
  </div>

  <div class="men-control-container rsborder-tiny rsbackground rsbackground-hover">
    <select class="skills-graphs__skill-select">
      ${skillNames.map((skillName) => `
      <option value="${skillName}">${skillName}</option>
      `).join("")}
    </select>
  </div>
</div>
<div class="skills-graphs__chart-container rsborder rsbackground"></div>
`;
  }
  /* eslint-enable no-unused-vars */
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.period = "Day";
    this.chartContainer = this.querySelector(".skills-graphs__chart-container");
    this.periodSelect = this.querySelector(".skills-graphs__period-select");
    this.refreshButton = this.querySelector(".skills-graphs__refresh");
    this.skillSelect = this.querySelector(".skills-graphs__skill-select");
    this.selectedSkill = this.skillSelect.value;
    this.eventListener(this.periodSelect, "change", this.handlePeriodChange.bind(this));
    this.eventListener(this.refreshButton, "click", this.handleRefreshClicked.bind(this));
    this.eventListener(this.skillSelect, "change", this.handleSkillSelectChange.bind(this));
    this.subscribeOnce("get-group-data", this.createChart.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleSkillSelectChange() {
    this.selectedSkill = this.skillSelect.value;
    this.subscribeOnce("get-group-data", this.createChart.bind(this));
  }
  handlePeriodChange() {
    this.period = this.periodSelect.value;
    this.subscribeOnce("get-group-data", this.createChart.bind(this));
  }
  handleRefreshClicked() {
    this.subscribeOnce("get-group-data", this.createChart.bind(this));
  }
  async createChart() {
    const loader = document.createElement("div");
    loader.classList.add("skills-graphs__loader");
    loader.classList.add("loader");
    this.chartContainer.appendChild(loader);
    try {
      const [skillDataForGroup] = await Promise.all([api.getSkillData(this.period), this.waitForChartjs()]);
      skillDataForGroup.sort((a, b) => a.name.localeCompare(b.name));
      skillDataForGroup.forEach((playerSkillData) => {
        playerSkillData.skill_data.forEach((x) => {
          x.time = new Date(x.time);
          x.data = GroupData.transformSkillsFromStorage(x.data);
        });
        playerSkillData.skill_data.sort((a, b) => b.time - a.time);
      });
      console.log(skillDataForGroup);
      this.chartContainer.innerHTML = "";
      Chart.defaults.scale.grid.borderColor = "rgba(255, 255, 255, 0)";
      const style = getComputedStyle(document.body);
      Chart.defaults.color = style.getPropertyValue("--primary-text");
      Chart.defaults.scale.grid.color = style.getPropertyValue("--graph-grid-border");
      const skillGraph = document.createElement("skill-graph");
      skillGraph.skillDataForGroup = skillDataForGroup;
      skillGraph.setAttribute("data-period", this.period);
      skillGraph.setAttribute("skill-name", this.selectedSkill);
      this.chartContainer.appendChild(skillGraph);
    } catch (err) {
      console.error(err);
      this.chartContainer.innerHTML = `Failed to load ${err}`;
    }
  }
  async waitForChartjs() {
    if (!_SkillsGraphs.chartJsScriptTag) {
      _SkillsGraphs.chartJsScriptTag = document.createElement("script");
      _SkillsGraphs.chartJsScriptTag.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js";
      document.body.appendChild(_SkillsGraphs.chartJsScriptTag);
    }
    while (typeof Chart === "undefined") {
      await new Promise((resolve) => setTimeout(() => resolve(true), 100));
    }
  }
};
customElements.define("skills-graphs", SkillsGraphs);

// resources/components/confirm-dialog/confirm-dialog.js
var ConfirmDialog = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="dialog__container confirm-dialog__container rsborder rsbackground">
  <h2>${this.headline}</h2>
  <p>${this.body}</p>
  <div class="confirm-dialog__buttons">
    <button class="confirm-dialog__yes men-button">
      Yes
    </button>
    <button class="confirm-dialog__no men-button">
      No
    </button>
  </div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  show(options) {
    this.headline = options.headline;
    this.body = options.body;
    this.render();
    const confirmYes = this.querySelector(".confirm-dialog__yes");
    const confirmNo = this.querySelector(".confirm-dialog__no");
    this.eventListener(confirmYes, "click", () => {
      this.unbindEvents();
      this.hide();
      options.yesCallback();
    });
    this.eventListener(confirmNo, "click", () => {
      this.unbindEvents();
      this.hide();
      options.noCallback();
    });
    this.classList.add("dialog__visible");
  }
  hide() {
    this.classList.remove("dialog__visible");
  }
};
customElements.define("confirm-dialog", ConfirmDialog);

// resources/components/panels-page/panels-page.js
var PanelsPage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return ``;
  }
  connectedCallback() {
    super.connectedCallback();
    document.body.classList.add("panels-page");
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.body.classList.remove("panels-page");
  }
};
customElements.define("panels-page", PanelsPage);

// resources/components/diary-dialog/diary-dialog.js
var DiaryDialog = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="dialog dialog__visible">
  <div class="dialog__container rsborder rsbackground">
    <div class="diary-dialog__header rsborder-tiny">
      <h2 class="diary-dialog__title">
        Achievement Diary - ${this.diaryName} - ${this.playerName}
      </h2>
      <button class="dialog__close">
        <img src="/ui/1731-0.png" alt="Close dialog" title="Close dialog" />
      </button>
    </div>

    <div class="diary-dialog__scroll-container">
      <div class="diary-dialog__section rsborder-tiny" diary-tier="Easy">
        <h2>Easy</h2>
      </div>
      <div class="diary-dialog__section rsborder-tiny" diary-tier="Medium">
        <h2>Medium</h2>
      </div>
      <div class="diary-dialog__section rsborder-tiny" diary-tier="Hard">
        <h2>Hard</h2>
      </div>
      <div class="diary-dialog__section rsborder-tiny" diary-tier="Elite">
        <h2>Elite</h2>
      </div>
    </div>
  </div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.diaryName = this.getAttribute("diary-name");
    this.playerName = this.getAttribute("player-name");
    this.render();
    this.background = this.querySelector(".dialog__visible");
    this.subscribeOnce(`diaries:${this.playerName}`, this.handleDiaries.bind(this));
    this.eventListener(this.querySelector(".dialog__close"), "click", this.close.bind(this));
    this.eventListener(this.background, "click", this.closeIfBackgroundClick.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  closeIfBackgroundClick(evt) {
    if (evt.target === this.background) {
      this.close();
    }
  }
  close() {
    this.remove();
  }
  handleDiaries(playerDiaries, player) {
    const diary = AchievementDiary.diaries[this.diaryName];
    let completeTiers = 0;
    for (const [tierName, tasks] of Object.entries(diary)) {
      const taskSection = document.createDocumentFragment();
      const completionData = playerDiaries.completion[this.diaryName][tierName];
      let complete = 0;
      for (let i = 0; i < tasks.length; ++i) {
        const task = tasks[i];
        const completed = completionData[i];
        const taskEl = document.createElement("div");
        taskEl.classList.add("diary-dialog__task");
        taskEl.innerText = task.task;
        if (completed) {
          taskEl.classList.add("diary-dialog__task-complete");
          ++complete;
        }
        const requirementsHtml = [];
        const combatRequirement = task.requirements?.combat;
        if (combatRequirement) {
          const playerCombat = player.combatLevel;
          const hasCombatRequirement = playerCombat >= combatRequirement;
          requirementsHtml.push(`
<span class="${hasCombatRequirement ? "diary-dialog__requirement-met" : ""}">
  ${playerCombat}/${combatRequirement} Combat
</span>`);
        }
        const skillRequirements = task.requirements?.skills;
        if (skillRequirements) {
          for (const [skillName, level] of Object.entries(skillRequirements)) {
            const playerLevel = player.skills[skillName].level;
            const hasSkillRequirement = playerLevel >= level;
            requirementsHtml.push(`
<span class="${hasSkillRequirement ? "diary-dialog__requirement-met" : ""}">
  ${playerLevel}/${level} <img title="${skillName}" alt="${skillName}" src="${Skill.getIcon(skillName)}" />
</span>
`);
          }
        }
        const questRequirements = task.requirements?.quests;
        if (questRequirements) {
          for (const quest of questRequirements) {
            const questComplete = player.hasQuestComplete(quest);
            requirementsHtml.push(
              `<span class="${questComplete ? "diary-dialog__requirement-met" : ""}">${quest}</span>`
            );
          }
        }
        if (requirementsHtml.length > 0) {
          const requirementsEl = document.createElement("div");
          requirementsEl.classList.add("diary-dialog__requirements");
          requirementsEl.innerHTML = `&nbsp;(${requirementsHtml.join(",&nbsp;")})`;
          taskEl.appendChild(requirementsEl);
        }
        taskSection.appendChild(taskEl);
      }
      const section = this.querySelector(`.diary-dialog__section[diary-tier="${tierName}"]`);
      const header = section.querySelector("h2");
      const sectionLink = `https://oldschool.runescape.wiki/w/${this.diaryName.replace(/ /g, "_")}_Diary#${tierName}`;
      header.innerHTML = `<a href="${sectionLink}" target="_blank">${header.innerText} - ${complete} / ${tasks.length}</a>`;
      if (complete === tasks.length) {
        section.classList.add("diary-dialog__tier-complete");
        ++completeTiers;
      }
      section.appendChild(taskSection);
    }
    if (completeTiers === 4) {
      this.classList.add("diary-dialog__diary-complete");
    }
    this.classList.add("dialog__visible");
  }
};
customElements.define("diary-dialog", DiaryDialog);

// resources/components/player-diaries/player-diaries.js
var PlayerDiaries = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<h2 class="player-diaries__title">Achievement Diaries</h2>
<div class="player-diaries__completions"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.playerName = this.getAttribute("player-name");
    this.completionsEl = this.querySelector(".player-diaries__completions");
    this.subscribe(`diaries:${this.playerName}`, this.handleDiaries.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handleDiaries(playerDiaries) {
    const completionEls = document.createDocumentFragment();
    for (const [diaryName, diaryCompletion] of Object.entries(playerDiaries.completion)) {
      const el = document.createElement("diary-completion");
      el.setAttribute("diary-name", diaryName);
      el.setAttribute("player-name", this.playerName);
      el.diaryCompletion = diaryCompletion;
      completionEls.appendChild(el);
    }
    this.completionsEl.innerHTML = "";
    this.completionsEl.appendChild(completionEls);
  }
};
customElements.define("player-diaries", PlayerDiaries);

// resources/components/diary-completion/diary-completion.js
var DiaryCompletion = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="rsborder-tiny diary-completion__container">
  <div class="diary-completion__top">
    <span>${this.diaryName}</span>
    <span>${this.totalComplete}/${this.total}</span>
  </div>
  <div class="diary-completion__bottom">
    <stat-bar bar-color="hsl(107, 100%, 41%)" bar-bgColor="rgba(0, 0, 0, 0.5)" bar-ratio="${this.tierCompletions.Easy.complete / this.tierCompletions.Easy.total}"></stat-bar>
    <stat-bar bar-color="hsl(107, 100%, 41%)" bar-bgColor="rgba(0, 0, 0, 0.5)" bar-ratio="${this.tierCompletions.Medium.complete / this.tierCompletions.Medium.total}"></stat-bar>
    <stat-bar bar-color="hsl(107, 100%, 41%)" bar-bgColor="rgba(0, 0, 0, 0.5)" bar-ratio="${this.tierCompletions.Hard.complete / this.tierCompletions.Hard.total}"></stat-bar>
    <stat-bar bar-color="hsl(107, 100%, 41%)" bar-bgColor="rgba(0, 0, 0, 0.5)" bar-ratio="${this.tierCompletions.Elite.complete / this.tierCompletions.Elite.total}"></stat-bar>
  </div>
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.playerName = this.getAttribute("player-name");
    this.diaryName = this.getAttribute("diary-name");
    const tierCompletions = {
      Easy: {
        total: 0,
        complete: 0
      },
      Medium: {
        total: 0,
        complete: 0
      },
      Hard: {
        total: 0,
        complete: 0
      },
      Elite: {
        total: 0,
        complete: 0
      }
    };
    for (const [tierName, completionState] of Object.entries(tierCompletions)) {
      const tierData = this.diaryCompletion[tierName];
      for (const completed of tierData) {
        ++completionState.total;
        if (completed) {
          ++completionState.complete;
        }
      }
    }
    this.tierCompletions = tierCompletions;
    this.total = tierCompletions.Easy.total + tierCompletions.Medium.total + tierCompletions.Hard.total + tierCompletions.Elite.total;
    this.totalComplete = tierCompletions.Easy.complete + tierCompletions.Medium.complete + tierCompletions.Hard.complete + tierCompletions.Elite.complete;
    this.render();
    this.eventListener(this, "click", this.openDiaryDialog.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  openDiaryDialog() {
    const diaryDialogEl = document.createElement("diary-dialog");
    diaryDialogEl.setAttribute("player-name", this.playerName);
    diaryDialogEl.setAttribute("diary-name", this.diaryName);
    document.body.appendChild(diaryDialogEl);
  }
};
customElements.define("diary-completion", DiaryCompletion);

// resources/components/canvas-map/animation.js
var Animation = class {
  constructor(options) {
    options = Object.assign(
      {
        current: 0,
        target: 0,
        progress: 0,
        time: 1
      },
      options
    );
    this.current = options.current;
    this.target = options.target;
    this.progress = options.progress;
    this.time = options.time;
    this.start = this.current;
  }
  goTo(target, time) {
    if (time <= 1) {
      this.current = target;
    }
    this.target = target;
    this.time = time;
    this.progress = 0;
    this.start = this.current;
  }
  animate(elapsed) {
    if (this.progress >= 1 || isNaN(this.progress) || this.time <= 1) {
      this.current = this.target;
      return false;
    }
    const target = this.target;
    let progress = this.progress;
    const time = this.time;
    const start = this.start;
    progress += elapsed / time;
    progress = Math.min(progress, 1);
    this.current = start * (1 - progress) + target * progress;
    this.progress = progress;
    return true;
  }
  cancelAnimation() {
    this.target = this.current;
    this.progress = 1;
  }
};

// resources/components/canvas-map/canvas-map.js
var CanvasMap = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<canvas></canvas>
<div class="canvas-map__coordinates"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.coordinatesDisplay = this.querySelector(".canvas-map__coordinates");
    this.canvas = this.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.eventListener(this, "mousedown", this.onPointerDown.bind(this));
    this.eventListener(this, "touchstart", this.onTouchStart.bind(this));
    this.eventListener(this, "mouseup", this.onPointerUp.bind(this));
    this.eventListener(this, "touchend", this.onPointerUp.bind(this));
    this.eventListener(this, "mousemove", this.onPointerMove.bind(this));
    this.eventListener(this, "touchmove", this.onTouchMove.bind(this));
    this.eventListener(this, "wheel", this.onScroll.bind(this));
    this.eventListener(this, "mouseleave", this.stopDragging.bind(this));
    this.eventListener(this, "mouseenter", this.stopDragging.bind(this));
    this.eventListener(this, "touchcancel", this.stopDragging.bind(this));
    this.eventListener(window, "resize", this.onResize.bind(this));
    this.playerMarkers = /* @__PURE__ */ new Map();
    this.interactingMarkers = /* @__PURE__ */ new Set();
    this.subscribe("members-updated", this.handleUpdatedMembers.bind(this));
    this.subscribe("coordinates", this.handleUpdatedCoordinates.bind(this));
    this.plane = 1;
    this.tileSize = 256;
    this.pixelsPerGameTile = 4;
    this.tiles = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
    this.tilesInView = [];
    this.previousFrameTime = performance.now();
    this.followingPlayer = {};
    this.onResize();
    this.camera = {
      x: new Animation({
        current: 0,
        target: 0,
        progress: 1
      }),
      y: new Animation({
        current: 0,
        target: 0,
        progress: 1
      }),
      zoom: new Animation({
        current: 1,
        target: 1,
        progress: 1
      }),
      maxZoom: 6,
      minZoom: 1,
      isDragging: false
    };
    this.cursor = {
      x: 0,
      y: 0,
      frameX: [0],
      frameY: [0]
    };
    this.touch = {
      pinchDistance: 0
    };
    const [startX, startY] = this.gamePositionToCameraCenter(3103, 3095);
    this.camera.x.goTo(startX, 1);
    this.camera.y.goTo(startY, 1);
    this.getMapJson();
    this.update = this._update.bind(this);
    this.requestUpdate();
    window.requestAnimationFrame(this.update);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  async getMapJson() {
    const response = await fetch("/data/map.json");
    const data = await response.json();
    this.validTiles = [];
    for (const x of data.tiles) {
      this.validTiles.push(new Set(x));
    }
    this.locations = {};
    for (const tileRegionX of Object.keys(data.icons)) {
      const x = parseInt(tileRegionX);
      this.locations[x] = {};
      for (const tileRegionY of Object.keys(data.icons[tileRegionX])) {
        const y = parseInt(tileRegionY);
        this.locations[x][y] = {};
        for (const spriteIndex of Object.keys(data.icons[tileRegionX][tileRegionY])) {
          this.locations[x][y][parseInt(spriteIndex)] = data.icons[tileRegionX][tileRegionY][spriteIndex];
        }
      }
    }
    this.mapLabels = {};
    for (const tileRegionX of Object.keys(data.labels)) {
      const x = parseInt(tileRegionX);
      this.mapLabels[x] = {};
      for (const tileRegionY of Object.keys(data.labels[tileRegionX])) {
        const y = parseInt(tileRegionY);
        this.mapLabels[x][y] = {};
        for (const z of Object.keys(data.labels[tileRegionX][tileRegionY])) {
          this.mapLabels[x][y][parseInt(z)] = data.labels[tileRegionX][tileRegionY][z];
        }
      }
    }
    this.locationIconsSheet = new Image();
    this.locationIconsSheet.src = utility.image("/map/icons/map_icons.webp");
    this.locationIconsSheet.onload = () => {
      this.requestUpdate();
    };
  }
  handleUpdatedMembers(members) {
    this.playerMarkers = /* @__PURE__ */ new Map();
    for (const member of members) {
      if (member.name === "@SHARED") continue;
      this.handleUpdatedCoordinates(member);
    }
  }
  isValidCoordinates(coordinates) {
    return !isNaN(coordinates?.x) && !isNaN(coordinates?.y) && !isNaN(coordinates?.plane);
  }
  handleUpdatedCoordinates(member) {
    const coordinates = member.coordinates || {};
    if (this.isValidCoordinates(coordinates)) {
      this.playerMarkers.set(member.name, {
        label: member.name,
        coordinates
      });
      if (this.followingPlayer.name === member.name) {
        this.followingPlayer.coordinates = coordinates;
      }
      if (this.isGameTileInView(coordinates.x, coordinates.y)) {
        this.requestUpdate();
      }
    }
  }
  followPlayer(playerName) {
    const marker = this.playerMarkers.get(playerName);
    const coordinates = marker?.coordinates;
    if (this.isValidCoordinates(coordinates)) {
      this.followingPlayer.name = playerName;
      this.followingPlayer.coordinates = marker.coordinates;
      this.requestUpdate();
    }
  }
  stopFollowingPlayer() {
    this.followingPlayer.name = null;
  }
  // Converts a position in the runescape world to a camera position at the center of the canvas
  gamePositionToCameraCenter(x, y) {
    const tileCenterOffset = this.pixelsPerGameTile * this.camera.zoom.current / 2;
    return [
      x * this.pixelsPerGameTile * this.camera.zoom.current - this.canvas.width / 2 + tileCenterOffset,
      (y * this.pixelsPerGameTile - this.tileSize) * this.camera.zoom.current + this.canvas.height / 2
    ];
  }
  // Converts a position in the runescape world to a client position relative to the camera.
  // If the result is between [0, canvas.height] and [0, canvas.width] then it is visible.
  gamePositionToClient(x, y) {
    const tileCenterOffset = this.pixelsPerGameTile * this.camera.zoom.current / 2;
    return [
      x * this.pixelsPerGameTile * this.camera.zoom.current + tileCenterOffset - this.camera.x.current,
      this.camera.y.current - (y * this.pixelsPerGameTile - this.tileSize) * this.camera.zoom.current
    ];
  }
  // Converts a game position to a position on the canvas that we can use to draw on.
  gamePositionToCanvas(x, y) {
    return [x * this.pixelsPerGameTile, -y * this.pixelsPerGameTile + this.tileSize];
  }
  // Checks if a tile in the runescape world is currently visible on the canvas
  isGameTileInView(x, y) {
    const padding = this.tileSize / this.pixelsPerGameTile;
    const [clientLeft, clientTop] = this.gamePositionToClient(x + padding, y - padding);
    const [clientRight, clientBottom] = this.gamePositionToClient(x - padding, y + padding);
    return clientLeft >= 0 && clientRight <= this.canvas.width && clientTop >= 0 && clientBottom <= this.canvas.height;
  }
  requestUpdate() {
    this.updateRequested = 1;
  }
  cantor(x, y) {
    return (x + y) * (x + y + 1) / 2 + y;
  }
  _update(timestamp) {
    let doAnotherUpdate = false;
    const elapsed = timestamp - this.previousFrameTime;
    this.previousFrameTime = timestamp;
    if (this.updateRequested-- > 0 && elapsed > 0) {
      const panStopThreshold = 1e-3;
      const speed = this.cursor.dx * this.cursor.dx + this.cursor.dy * this.cursor.dy;
      if (!this.camera.isDragging) {
        if (speed > panStopThreshold) {
          this.camera.x.goTo(this.camera.x.current + this.cursor.dx * elapsed, 1);
          this.camera.y.goTo(this.camera.y.current + this.cursor.dy * elapsed, 1);
        }
      }
      if (speed > panStopThreshold) {
        this.cursor.dx /= elapsed * 5e-3 + 1;
        this.cursor.dy /= elapsed * 5e-3 + 1;
        doAnotherUpdate = true;
      }
      const zooming = this.camera.zoom.animate(elapsed);
      doAnotherUpdate = zooming || doAnotherUpdate;
      if (!zooming && this.followingPlayer.name) {
        const [x, y] = this.gamePositionToCameraCenter(
          this.followingPlayer.coordinates.x,
          this.followingPlayer.coordinates.y
        );
        if (this.camera.x.target !== x) {
          this.camera.x.goTo(x, 100);
        }
        if (this.camera.y.target !== y) {
          this.camera.y.goTo(y, 100);
        }
        this.showPlane(this.followingPlayer.coordinates.plane + 1);
      }
      doAnotherUpdate = this.camera.x.animate(elapsed) || doAnotherUpdate;
      doAnotherUpdate = this.camera.y.animate(elapsed) || doAnotherUpdate;
      for (let i = 0; i < this.tilesInView.length; ++i) {
        doAnotherUpdate = this.tilesInView[i].animation?.animate(elapsed) || doAnotherUpdate;
      }
      this.ctx.resetTransform();
      this.ctx.fillStyle = "black";
      this.ctx.setTransform(
        this.camera.zoom.current,
        // horizontalScaling
        0,
        // vertical skewing
        0,
        // horizontal skewing
        this.camera.zoom.current,
        // vertical scaling
        Math.round(-this.camera.x.current),
        Math.round(this.camera.y.current)
      );
      const distanceLeftToTravel = (Math.abs((this.camera.x.target - this.camera.x.current) / this.camera.x.time) + Math.abs((this.camera.y.target - this.camera.y.current) / this.camera.y.time)) / this.camera.zoom.current;
      const isPanningABigDistance = !zooming && distanceLeftToTravel > 10;
      const s = this.tileSize * this.camera.zoom.current;
      const top = this.camera.y.current / s;
      const left = this.camera.x.current / s;
      const right = left + this.canvas.width / s;
      const bottom = top - this.canvas.height / s;
      this.view = {
        left: Math.floor(left),
        right: Math.ceil(right),
        top: Math.ceil(top),
        bottom: Math.floor(bottom)
      };
      this.drawMapSquaresInView(!isPanningABigDistance);
      this.drawLocations();
      this.drawMapAreaLabels(!isPanningABigDistance);
      this.drawTileMarkers(this.playerMarkers.values(), {
        fillColor: "#348feb",
        strokeColor: "#34d8eb",
        labelPosition: "top",
        labelFill: "yellow",
        labelStroke: "black"
      });
      this.drawTileMarkers(this.interactingMarkers.values(), {
        fillColor: "#a832a8",
        strokeColor: "#cc2ed1",
        labelPosition: "bottom",
        labelFill: "red",
        labelStroke: "black"
      });
      this.drawCursorTile();
    }
    this.updateRequested = doAnotherUpdate ? Math.max(1, this.updateRequested) : this.updateRequested;
    window.requestAnimationFrame(this.update);
  }
  addInteractingMarker(x, y, label) {
    const marker = {
      label,
      coordinates: { x, y, plane: 0 }
    };
    this.interactingMarkers.add(marker);
    return marker;
  }
  removeInteractingMarker(marker) {
    this.interactingMarkers.delete(marker);
  }
  drawGameTiles(positions, fillColor, strokeColor) {
    this.ctx.beginPath();
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 1;
    for (const position of positions) {
      this.ctx.rect(position.x, position.y, this.pixelsPerGameTile, this.pixelsPerGameTile);
    }
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();
  }
  drawLabels(labels, fillColor, strokeColor, position) {
    const groupedByTile = /* @__PURE__ */ new Map();
    for (const label of labels) {
      const x = this.cantor(label.x, label.y);
      if (!groupedByTile.has(x)) {
        groupedByTile.set(x, []);
      }
      groupedByTile.get(x).push(label);
    }
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.font = `${20 / this.camera.zoom.current}px rssmall`;
    this.ctx.textAlign = "center";
    this.ctx.lineWidth = 1 / this.camera.zoom.current;
    const xOffset = this.pixelsPerGameTile / 2;
    const strokeOffset = 1 / this.camera.zoom.current;
    const yOffsets = {
      top: -18 / this.camera.zoom.current,
      bottom: 18 / this.camera.zoom.current
    };
    for (const labelsOnTile of groupedByTile.values()) {
      let yOffset = position === "top" ? 0 : this.pixelsPerGameTile + yOffsets[position];
      for (const label of labelsOnTile) {
        let [x, y] = [label.x, label.y];
        x += xOffset;
        y += yOffset;
        yOffset += yOffsets[position];
        this.ctx.strokeText(label.text, x + strokeOffset, y + strokeOffset);
        this.ctx.fillText(label.text, x, y);
      }
    }
  }
  drawTileMarkers(markers, options) {
    const groupedByPlane = [[], [], [], []];
    for (const tileMarker of markers) {
      if (this.isValidCoordinates(tileMarker?.coordinates)) {
        groupedByPlane[tileMarker.coordinates.plane].push(tileMarker);
      }
    }
    for (let plane = 0; plane < groupedByPlane.length; ++plane) {
      const tilesOnPlane = groupedByPlane[plane];
      this.ctx.globalAlpha = 1 - Math.abs(this.plane - 1 - plane) * 0.25;
      const positions = [];
      for (const tileMarker of tilesOnPlane) {
        const [x, y] = this.gamePositionToCanvas(tileMarker.coordinates.x, tileMarker.coordinates.y);
        positions.push({ x, y, text: tileMarker.label });
      }
      this.drawGameTiles(positions, options.fillColor, options.strokeColor);
      this.drawLabels(positions, options.labelFill, options.labelStroke, options.labelPosition);
    }
    this.ctx.globalAlpha = 1;
  }
  drawCursorTile() {
    this.drawGameTiles([{ x: this.cursor.canvasX, y: this.cursor.canvasY }], "#348feb", "#34d8eb");
  }
  drawLocations() {
    if (!this.locations) return;
    const imageSize = 15;
    const imageSizeHalf = imageSize / 2;
    const scale = Math.min(this.camera.zoom.current, 3);
    const shift = imageSizeHalf / scale;
    const destinationSize = imageSize / scale;
    for (const tile of this.tilesInView) {
      const locations = this.locations[tile.regionX]?.[tile.regionY];
      if (locations) {
        for (const [spriteIndex, coordinates] of Object.entries(locations)) {
          for (let i = 0; i < coordinates.length; i += 2) {
            const [x, y] = this.gamePositionToCanvas(coordinates[i], coordinates[i + 1]);
            this.ctx.drawImage(
              this.locationIconsSheet,
              imageSize * spriteIndex,
              0,
              imageSize,
              imageSize,
              Math.round(x - shift),
              Math.round(y - shift),
              destinationSize,
              destinationSize
            );
          }
        }
      }
    }
  }
  drawMapAreaLabels(loadNewImages) {
    if (!this.mapLabels) return;
    this.mapLabelImages = this.mapLabelImages || /* @__PURE__ */ new Map();
    const scale = Math.min(this.camera.zoom.current, 2);
    for (let tileX = this.view.left - 1; tileX < this.view.right + 1; ++tileX) {
      for (let tileY = this.view.top + 1; tileY > this.view.bottom; --tileY) {
        const labels = this.mapLabels[tileX]?.[tileY]?.[this.plane - 1];
        if (labels) {
          for (let i = 0; i < labels.length; i += 3) {
            const [x, y] = this.gamePositionToCanvas(labels[i], labels[i + 1]);
            const labelId = labels[i + 2];
            const key = this.cantor(x, y);
            let mapLabelImage = this.mapLabelImages.get(key);
            if (!mapLabelImage && loadNewImages) {
              mapLabelImage = new Image();
              mapLabelImage.src = utility.image(`/map/labels/${labelId}.webp`);
              this.mapLabelImages.set(key, mapLabelImage);
            } else if (!mapLabelImage && !loadNewImages) {
              continue;
            }
            mapLabelImage.loaded = mapLabelImage.loaded || mapLabelImage.complete;
            if (mapLabelImage.loaded) {
              const width = mapLabelImage.width / scale;
              const height = mapLabelImage.height / scale;
              const shiftX = width / 2;
              this.ctx.drawImage(mapLabelImage, Math.round(x - shiftX), y, Math.round(width), Math.round(height));
            } else if (!mapLabelImage.onload) {
              mapLabelImage.onload = () => {
                mapLabelImage.loaded = true;
                this.requestUpdate();
              };
            }
          }
        }
      }
    }
  }
  drawMapSquaresInView(loadNewTiles) {
    const top = this.view.top;
    const left = this.view.left;
    const right = this.view.right;
    const bottom = this.view.bottom;
    const tiles = this.tiles[this.plane - 1];
    const imageSize = this.tileSize;
    this.tilesInView = [];
    for (let tileX = left; tileX < right; ++tileX) {
      const tileWorldX = tileX * imageSize;
      for (let tileY = top; tileY > bottom; --tileY) {
        const i = this.cantor(tileX, tileY);
        const tileWorldY = tileY * imageSize;
        if (this.validTiles && !this.validTiles[this.plane - 1].has(i)) {
          this.ctx.clearRect(tileWorldX, -tileWorldY, imageSize, imageSize);
          continue;
        }
        let tile = tiles.get(i);
        if (!tile && loadNewTiles) {
          tile = new Image(this.tileSize, this.tileSize);
          const tileFileBaseName = `${this.plane - 1}_${tileX}_${tileY}`;
          tile.src = utility.image(`/map/${tileFileBaseName}.webp`);
          tile.regionX = tileX;
          tile.regionY = tileY;
          tiles.set(i, tile);
        } else if (!tile && !loadNewTiles) {
          continue;
        }
        this.tilesInView.push(tile);
        tile.loaded = tile.loaded || tile.complete;
        if (tile.loaded && tile.animation) {
          const alpha = tile.animation.current;
          this.ctx.globalAlpha = alpha;
          try {
            if (alpha < 1) {
              this.ctx.clearRect(tileWorldX, -tileWorldY, imageSize, imageSize);
            }
            this.ctx.drawImage(tile, tileWorldX, -tileWorldY);
          } catch {
          }
        } else if (!tile.onload) {
          tile.onload = () => {
            tile.animation = new Animation({ current: 0, target: 1, time: 300 });
            tile.loaded = true;
            this.requestUpdate();
          };
        } else {
          this.ctx.clearRect(tileWorldX, -tileWorldY, imageSize, imageSize);
        }
      }
    }
    this.ctx.globalAlpha = 1;
  }
  showPlane(plane) {
    if (this.plane !== plane) {
      this.plane = plane;
      this.dispatchEvent(
        new CustomEvent("plane-changed", {
          detail: {
            plane
          }
        })
      );
      this.requestUpdate();
    }
  }
  onResize() {
    this.canvas.width = this.offsetWidth;
    this.canvas.height = this.offsetHeight;
    this.ctx.imageSmoothingEnabled = false;
    this.requestUpdate();
  }
  onPointerDown(event) {
    this.startDragging(event.clientX, event.clientY);
  }
  pinchDistance(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    const a = touch1.clientX - touch2.clientX;
    const b = touch1.clientY - touch2.clientY;
    return Math.sqrt(a * a + b * b);
  }
  pinchCenter(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return [(touch1.clientX + touch2.clientX) / 2, (touch1.clientY + touch2.clientY) / 2];
  }
  onTouchStart(event) {
    if (event.touches.length === 2) {
      this.touch.startDistance = this.pinchDistance(event.touches);
      this.touch.startZoom = this.camera.zoom.current;
    }
  }
  startDragging(x, y) {
    this.classList.add("dragging");
    this.camera.isDragging = true;
    this.camera.x.cancelAnimation();
    this.camera.y.cancelAnimation();
    this.camera.zoom.cancelAnimation();
    this.cursor.frameX = [];
    this.cursor.frameY = [];
    this.cursor.dx = 0;
    this.cursor.dy = 0;
    this.cursor.previousX = x;
    this.cursor.previousY = y;
    this.cursor.lastPointerMoveTime = performance.now();
    this.stopFollowingPlayer();
    this.requestUpdate();
  }
  onPointerUp() {
    this.stopDragging();
  }
  stopDragging() {
    this.classList.remove("dragging");
    const elapsed = performance.now() - this.cursor.lastPointerMoveTime;
    if (elapsed > 100) {
      this.cursor.dx = 0;
      this.cursor.dy = 0;
    }
    this.camera.isDragging = false;
    this.requestUpdate();
  }
  onPointerMove(event) {
    const x = event.clientX;
    const y = event.clientY;
    const dx = x - this.cursor.previousX || 0;
    const dy = y - this.cursor.previousY || 0;
    this.cursor.previousX = x;
    this.cursor.previousY = y;
    this.handleMovement(x, y, dx, dy);
  }
  onTouchMove(event) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      if (!this.camera.isDragging) {
        this.startDragging(touch.clientX, touch.clientY);
      }
      const x = touch.clientX;
      const y = touch.clientY;
      const dx = x - this.cursor.previousX || 0;
      const dy = y - this.cursor.previousY || 0;
      this.cursor.previousX = x;
      this.cursor.previousY = y;
      this.handleMovement(x, y, dx, dy);
    } else if (event.touches.length === 2) {
      this.stopDragging();
      const pinchDistance = this.pinchDistance(event.touches);
      const scale = pinchDistance / this.touch.startDistance;
      const a = scale * Math.pow(2, this.touch.startZoom);
      const zoom = Math.log(a) / Math.LN2;
      const [x, y] = this.pinchCenter(event.touches);
      this.zoomOntoPoint({
        x,
        y,
        zoom
      });
    }
  }
  handleMovement(x, y, dx, dy) {
    const elapsed = performance.now() - this.cursor.lastPointerMoveTime;
    this.cursor.lastPointerMoveTime = performance.now();
    if (elapsed) {
      const eventsToKeep = 10;
      this.cursor.frameX.push(-dx / elapsed);
      if (this.cursor.frameX.length > eventsToKeep) {
        this.cursor.frameX = this.cursor.frameX.slice(this.cursor.frameX.length - eventsToKeep);
      }
      this.cursor.frameY.push(dy / elapsed);
      if (this.cursor.frameY.length > eventsToKeep) {
        this.cursor.frameY = this.cursor.frameY.slice(this.cursor.frameY.length - eventsToKeep);
      }
    }
    if (this.camera.isDragging) {
      this.camera.x.goTo(this.camera.x.target - dx, 1);
      this.camera.y.goTo(this.camera.y.target + dy, 1);
      this.cursor.dx = utility.average(this.cursor.frameX) || 0;
      this.cursor.dy = utility.average(this.cursor.frameY) || 0;
    }
    this.cursor.x = x - this.canvas.offsetTop;
    this.cursor.y = y - this.canvas.offsetLeft;
    this.cursor.tileX = Math.floor((this.cursor.x + this.camera.x.current) / this.tileSize / this.camera.zoom.current);
    this.cursor.tileY = Math.floor(
      (this.camera.y.current - this.cursor.y + this.tileSize) / this.tileSize / this.camera.zoom.current
    );
    this.cursor.worldX = Math.floor(
      (this.cursor.x + this.camera.x.current) / this.pixelsPerGameTile / this.camera.zoom.current
    );
    this.cursor.worldY = Math.floor(
      (this.camera.y.current - this.cursor.y) / this.pixelsPerGameTile / this.camera.zoom.current + this.tileSize / this.pixelsPerGameTile
    );
    this.cursor.canvasX = this.cursor.worldX * this.pixelsPerGameTile;
    this.cursor.canvasY = -this.cursor.worldY * this.pixelsPerGameTile + this.tileSize - this.pixelsPerGameTile;
    this.requestUpdate();
    this.coordinatesDisplay.innerText = `${this.cursor.worldX}, ${this.cursor.worldY}`;
  }
  onScroll(event) {
    if (this.camera.isDragging) return;
    this.zoomOntoPoint({
      delta: -0.2 * Math.sign(event.deltaY) * this.camera.zoom.target,
      x: this.cursor.x,
      y: this.cursor.y,
      animationTime: 100
    });
  }
  // Zooms and keeps a point at the same screen position during the zoom
  zoomOntoPoint(options) {
    if (this.camera.isDragging) return;
    this.cursor.dx = 0;
    this.cursor.dy = 0;
    let newZoom;
    if (options.zoom === void 0) {
      const targetTileSize = this.tileSize * options.delta;
      const delta = Math.round(targetTileSize) / this.tileSize;
      if (options.delta > 0) {
        newZoom = Math.min(Math.max(this.camera.zoom.target + delta, this.camera.minZoom), this.camera.maxZoom);
      } else {
        newZoom = Math.min(Math.max(this.camera.zoom.target + delta, this.camera.minZoom), this.camera.maxZoom);
      }
    } else {
      newZoom = Math.min(Math.max(options.zoom, this.camera.minZoom), this.camera.maxZoom);
    }
    const zoomDelta = newZoom - this.camera.zoom.target;
    if (zoomDelta === 0) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    let x = options.x;
    let y = options.y;
    if (this.followingPlayer.name) {
      [x, y] = this.gamePositionToClient(this.followingPlayer.coordinates.x, this.followingPlayer.coordinates.y);
    }
    const wx = (-x - this.camera.x.target) / (width * this.camera.zoom.target);
    const wy = (y - this.camera.y.target) / (height * this.camera.zoom.target);
    this.camera.x.goTo(this.camera.x.target - wx * width * zoomDelta, options.animationTime || 1);
    this.camera.y.goTo(this.camera.y.target - wy * height * zoomDelta, options.animationTime || 1);
    this.camera.zoom.goTo(newZoom, options.animationTime || 1);
    this.requestUpdate();
  }
};
customElements.define("canvas-map", CanvasMap);

// resources/components/data/collection-log.js
var duplicateCollectionLogItems = /* @__PURE__ */ new Map([
  // Duplicate mining outfit from volcanic mine and motherlode mine pages
  [29472, 12013],
  // Prospector helmet
  [29474, 12014],
  // Prospector jacket
  [29476, 12015],
  // Prospector legs
  [29478, 12016]
  // Prospector boots
]);
var PlayerLog = class {
  constructor(playerName, logs) {
    this.logs = logs;
    this.unlockedItems = /* @__PURE__ */ new Map();
    this.unlockedItemsCountByPage = /* @__PURE__ */ new Map();
    for (const log of this.logs) {
      const items = log.items;
      const newItems = log.new_items;
      const itemSet = /* @__PURE__ */ new Set();
      for (const itemId of newItems) {
        itemSet.add(itemId);
        this.unlockedItems.set(itemId, 1);
      }
      for (let i = 0; i < items.length; i += 2) {
        this.unlockedItems.set(items[i], items[i + 1]);
        itemSet.add(items[i]);
      }
      this.unlockedItemsCountByPage.set(log.page_name, itemSet.size);
    }
  }
  isLogComplete(pageName) {
    return this.unlockedItemsCountByPage.get(pageName) === collectionLog.pageItems.get(pageName).length;
  }
  completionStateClass(pageName) {
    const unlockedItemsCount = this.unlockedItemsCountByPage.get(pageName);
    const totalItemsInPage = collectionLog.pageItems.get(pageName).length;
    if (totalItemsInPage === unlockedItemsCount) {
      return "collection-log__complete";
    } else if (unlockedItemsCount > 0) {
      return "collection-log__in-progress";
    }
    return "collection-log__not-started";
  }
  getPage(pageName) {
    return this.logs.find((log) => log.page_name === pageName);
  }
};
var CollectionLog = class {
  constructor() {
  }
  async initLogInfo() {
    if (this.info) return;
    this.info = await api.getCollectionLogInfo();
    this.pageItems = /* @__PURE__ */ new Map();
    const uniqueItems = /* @__PURE__ */ new Set();
    for (const tab of this.info) {
      for (const page of tab.pages) {
        page.items.forEach((item) => uniqueItems.add(item.id));
        this.pageItems.set(page.name, page.items);
        page.sortName = utility.removeArticles(page.name);
      }
    }
    this.totalUniqueItems = uniqueItems.size - duplicateCollectionLogItems.size;
  }
  async load() {
    this.playerLogs = /* @__PURE__ */ new Map();
    const apiResponse = await api.getCollectionLog();
    for (const [playerName, logs] of Object.entries(apiResponse)) {
      this.playerLogs.set(playerName, new PlayerLog(playerName, logs));
    }
    this.playerNames = Array.from(this.playerLogs.keys());
  }
  tabName(tabId) {
    switch (tabId) {
      case 0:
        return "Bosses";
      case 1:
        return "Raids";
      case 2:
        return "Clues";
      case 3:
        return "Minigames";
      case 4:
        return "Other";
    }
  }
  loadPlayer(playerName) {
    this.otherPlayers = this.playerNames.filter((x) => x !== playerName);
  }
  isLogComplete(playerName, pageName) {
    const playerLog = this.playerLogs.get(playerName);
    return playerLog?.isLogComplete(pageName) || false;
  }
  completionStateClass(playerName, pageName) {
    const playerLog = this.playerLogs.get(playerName);
    return playerLog?.completionStateClass(pageName) || "collection-log__not-started";
  }
  totalUnlockedItems(playerName) {
    const playerLog = this.playerLogs.get(playerName);
    const unlockedItems = playerLog?.unlockedItems;
    let unlockedItemsCount = 0;
    if (unlockedItems) {
      unlockedItemsCount = playerLog.unlockedItems.size;
      for (const [a, b] of duplicateCollectionLogItems.entries()) {
        if (unlockedItems.has(a) && unlockedItems.has(b)) {
          --unlockedItemsCount;
        }
      }
    }
    return unlockedItemsCount;
  }
  pageSize(pageName) {
    return this.pageItems.get(pageName).length;
  }
  completionCountForPage(playerName, pageName) {
    const playerLog = this.playerLogs.get(playerName);
    return playerLog?.unlockedItemsCountByPage.get(pageName) || 0;
  }
  pageInfo(pageName) {
    for (const tab of this.info) {
      for (const page of tab.pages) {
        if (page.name === pageName) return page;
      }
    }
    return null;
  }
  unlockedItemCount(playerName, itemId) {
    return this.playerLogs.get(playerName)?.unlockedItems.get(itemId) || 0;
  }
  isItemUnlocked(playerName, itemId) {
    return this.playerLogs.get(playerName)?.unlockedItems.has(itemId) || false;
  }
};
var collectionLog = new CollectionLog();

// resources/components/collection-log/collection-log.js
var CollectionLog2 = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="collection-log dialog dialog__visible">
  <div class="collection-log__container dialog__container metal-border rsbackground">
    <div class="collection-log__header">
      <div></div>
      <!-- <search-element class="collection-log__search input-small" placeholder="Search"></search-element> -->
      <h2 class="collection-log__title">
        ${this.playerName}'s Collection Log - ${this.unlockedUniqueItems}/${this.totalUniqueItems}
      </h2>
      <button class="collection-log__close dialog__close">
        <img src="/ui/1731-0.png" alt="Close dialog" title="Close dialog" />
      </button>
    </div>

    <div class="collection-log__title-border"></div>

    <div class="collection-log__main">
      <div class="collection-log__tab-buttons">
        ${collectionLog.info.map((tab) => `<button tab-id="${tab.tabId}">${collectionLog.tabName(tab.tabId)}</button>`).join("")}
      </div>

      <div class="collection-log__tab-container">
      </div>
    </div>
  </div>
</div>
`;
  }
  async connectedCallback() {
    super.connectedCallback();
    loadingScreenManager.showLoadingScreen();
    this.playerName = this.getAttribute("player-name");
    await this.init();
    this.totalUniqueItems = collectionLog.totalUniqueItems;
    this.unlockedUniqueItems = collectionLog.totalUnlockedItems(this.playerName);
    this.render();
    this.tabContent = this.querySelector(".collection-log__tab-container");
    this.tabButtons = this.querySelector(".collection-log__tab-buttons");
    this.background = this.querySelector(".dialog__visible");
    this.showTab(0);
    this.eventListener(this.tabButtons, "click", this.handleTabClick.bind(this));
    this.eventListener(this.background, "click", this.closeIfBackgroundClick.bind(this));
    this.eventListener(this.querySelector(".dialog__close"), "click", this.close.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    loadingScreenManager.hideLoadingScreen();
  }
  closeIfBackgroundClick(evt) {
    if (evt.target === this.background) {
      this.close();
    }
  }
  close() {
    this.remove();
  }
  async init() {
    await Promise.all([collectionLog.initLogInfo(), collectionLog.load()]);
    collectionLog.loadPlayer(this.playerName);
    loadingScreenManager.hideLoadingScreen();
  }
  handleTabClick(event) {
    const tabId = event?.target?.getAttribute("tab-id");
    if (tabId) {
      this.showTab(tabId);
    }
  }
  showTab(tabId) {
    this.tabButtons.querySelectorAll("button[tab-id]").forEach((button) => {
      if (button.getAttribute("tab-id") === `${tabId}`) button.classList.add("collection-log__tab-button-active");
      else button.classList.remove("collection-log__tab-button-active");
    });
    this.tabContent.innerHTML = `<collection-log-tab player-name="${this.playerName}" tab-id="${tabId}"></collection-log-tab>`;
  }
};
customElements.define("collection-log", CollectionLog2);

// resources/components/collection-log-page/collection-log-page.js
var CollectionLogPage = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="collection-log__page-top">
  <h2 class="rstext">
    <a href="${this.pageTitleLink}" target="_blank">${this.pageTitle}</a>
  </h2>
  <div>Obtained: <span class="${this.completionStateClass}">${this.unlockedItemsCount}/${this.pageItems.length}</span></div>
  ${this.pageCountLabels.map((label, i) => `
  <div>${label}: <span class="collection-log__count">${this.completionCounts[i] || 0}</span></div>
  `).join("")}
</div>
<div class="collection-log__page-items">
  ${this.pageItems.map((item) => `
  <collection-log-item player-name="${this.playerName}" item-id="${item.id}"></collection-log-item>
  `).join("")}
</div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.playerName = this.getAttribute("player-name");
    this.tabId = parseInt(this.getAttribute("tab-id"));
    this.pageName = this.getAttribute("page-name");
    this.pageInfo = collectionLog.pageInfo(this.pageName);
    this.pageTitle = this.pageInfo.name;
    this.pageCountLabels = this.pageInfo.completion_labels;
    this.pageItems = collectionLog.pageItems.get(this.pageName);
    const playerLog = collectionLog.playerLogs.get(this.playerName);
    this.completionCounts = playerLog?.getPage(this.pageName)?.completion_counts || [];
    this.unlockedItemsCount = collectionLog.completionCountForPage(this.playerName, this.pageName);
    this.completionStateClass = collectionLog.completionStateClass(this.playerName, this.pageName);
    if (this.tabId === 2) {
      if (this.pageTitle.startsWith("Shared")) {
        this.pageTitleLink = "https://oldschool.runescape.wiki/w/Collection_log#Shared_Treasure_Trail_Rewards";
      } else {
        const difficulty = this.pageTitle.split(" ")[0].toLowerCase();
        this.pageTitleLink = `https://oldschool.runescape.wiki/w/Clue_scroll_(${difficulty})`;
      }
    } else {
      this.pageTitleLink = `https://oldschool.runescape.wiki/w/Special:Lookup?type=npc&name=${this.pageTitle}`;
    }
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("collection-log-page", CollectionLogPage);

// resources/components/collection-log-tab/collection-log-tab.js
var CollectionLogTab = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<div class="collection-log__tab-list">
  ${this.pages.map((page) => `
  <button class="${collectionLog.isLogComplete(this.playerName, page.name) ? "collection-log__complete" : ""}" page-name="${page.name}">
    ${page.name} <span class="${collectionLog.completionStateClass(this.playerName, page.name)}">${collectionLog.completionCountForPage(this.playerName, page.name) || 0}/${collectionLog.pageSize(page.name)}</span>
  </button>`).join("")}
</div>
<div class="collection-log__page-container"></div>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.playerName = this.getAttribute("player-name");
    this.tabId = parseInt(this.getAttribute("tab-id"));
    this.pages = collectionLog.info[this.tabId].pages;
    this.render();
    this.pageContainer = this.querySelector(".collection-log__page-container");
    this.tabList = this.querySelector(".collection-log__tab-list");
    this.showPage(this.pages[0].name);
    this.eventListener(this.tabList, "click", this.handlePageClick.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  handlePageClick(event) {
    const pageName = event.target.getAttribute("page-name");
    if (pageName) {
      this.showPage(pageName);
    }
  }
  showPage(pageName) {
    this.tabList.querySelectorAll("button[page-name]").forEach((button) => {
      if (button.getAttribute("page-name") === `${pageName}`) button.classList.add("collection-log__page-active");
      else button.classList.remove("collection-log__page-active");
    });
    this.pageContainer.innerHTML = `<collection-log-page player-name="${this.playerName}" page-name="${pageName}" tab-id="${this.tabId}"></collection-log-page>`;
  }
};
customElements.define("collection-log-tab", CollectionLogTab);

// resources/components/collection-log-item/collection-log-item.js
var CollectionLogItem = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<a href="https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${this.itemId}" target="_blank">
  <item-box item-id="${this.itemId}"
            item-quantity="${collectionLog.unlockedItemCount(this.playerName, this.itemId)}"
            class="${collectionLog.isItemUnlocked(this.playerName, this.itemId) ? "collection-log__item-unlocked" : ""}"
            no-tooltip="true">
  </item-box>
  <div class="collection-log-item__other-players">
    ${this.otherPlayers.map((playerName) => {
      if (collectionLog.isItemUnlocked(playerName, this.itemId)) {
        return `<player-icon player-name="${playerName}"></player-icon>`;
      }
      return "";
    }).join("")}
  </div>
</a>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.playerName = this.getAttribute("player-name");
    this.itemId = parseInt(this.getAttribute("item-id"));
    this.enableTooltip();
    let tooltipLines = [Item.itemName(this.itemId)];
    for (const playerName of collectionLog.playerNames) {
      const quantity = collectionLog.unlockedItemCount(playerName, this.itemId);
      if (quantity > 0) {
        tooltipLines.push(`<player-icon player-name="${playerName}"></player-icon> ${playerName} - ${quantity}`);
      }
    }
    this.tooltipText = tooltipLines.join("<br >");
    this.otherPlayers = collectionLog.otherPlayers;
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("collection-log-item", CollectionLogItem);

// resources/components/player-icon/player-icon.js
var PlayerIcon = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<img src="/ui/player-icon.webp" width="12" height="15" />
`;
  }
  connectedCallback() {
    super.connectedCallback();
    const playerName = this.getAttribute("player-name");
    const hue = groupData.members.get(playerName).hue || 0;
    this.style.setProperty("--player-icon-color", `${hue}deg`);
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("player-icon", PlayerIcon);

// resources/components/donate-button/donate-button.js
var DonateButton = class extends BaseElement {
  constructor() {
    super();
  }
  html() {
    return `<a class="desktop" href="https://ko-fi.com/gimplugin" target="_blank">
  <button class="men-button" type="button">
    <img class="donate-button__logo" loading="lazy" src="/images/kofi_p_logo_nolabel.webp" height="20"/>
    <span>Support</span>
  </button>
</a>
`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
  }
};
customElements.define("donate-button", DonateButton);
//# sourceMappingURL=app.js.map

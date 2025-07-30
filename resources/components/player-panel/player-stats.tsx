import { type ReactElement, type ReactNode } from "react";

import "./player-stats.css";
import { StatBar } from "./stat-bar";
import * as Member from "../../game/member";
import { PlayerIcon } from "../player-icon/player-icon";
import { XpDropper } from "../xp-dropper/xp-dropper";
import {
  useMemberInteractingContext,
  useMemberLastUpdatedContext,
  useMemberStatsContext,
  useMemberXPDropsContext,
} from "../../context/group-state-context";

/**
 * Time in milliseconds before a player is considered offline/inactive.
 * When that is, they are displayed as all grey.
 */
const INACTIVE_TIMER_MS = 300 * 1000;
/**
 * Time in milliseconds before an npc interaction is considered stale and shouldn't be shown.
 */
const INTERACTION_TIMER_MS = 30 * 1000;
/**
 * Static colors to use for various stat bars.
 */
const COLORS = {
  player: {
    hitpoints: "#157145",
    hitpointsBG: "#073823",
    prayer: "#336699",
    prayerBG: "#112233",
    energy: "#a9a9a9",
    energyBG: "#383838",
  },
  interaction: {
    combat: "#A41623",
    combatBG: "#383838",
    nonCombat: "#333355",
  },
};

// Shows what the player is interacting with, like attacking/talking to an npc
const PlayerInteracting = ({ npcName, healthRatio }: { npcName: string; healthRatio?: number }): ReactElement => {
  const isNonCombatNPC = healthRatio === undefined;

  return (
    <div className="player-interacting">
      <StatBar
        color={isNonCombatNPC ? COLORS.interaction.nonCombat : COLORS.interaction.combat}
        bgColor={isNonCombatNPC ? COLORS.interaction.nonCombat : COLORS.interaction.combatBG}
        ratio={healthRatio}
      />
      <div className="player-interacting-name">{npcName}</div>
    </div>
  );
};

export const PlayerStats = ({ member }: { member: Member.Name }): ReactElement => {
  const interacting = useMemberInteractingContext(member);
  const stats = useMemberStatsContext(member);
  const lastUpdated = useMemberLastUpdatedContext(member);
  const xpDrops = useMemberXPDropsContext(member);

  const now = new Date();
  const online = now.getTime() - (lastUpdated ?? new Date(0)).getTime() < INACTIVE_TIMER_MS;

  let interactionBar: ReactNode = undefined;
  if (online && interacting !== undefined) {
    if (now.getTime() - interacting.lastUpdated.getTime() < INTERACTION_TIMER_MS) {
      const { healthRatio, name } = interacting;
      interactionBar = <PlayerInteracting healthRatio={healthRatio} npcName={name} />;
    }
  }

  let status: ReactNode = undefined;
  if (online && stats?.world !== undefined) {
    status = (
      <>
        - <span className="player-stats-world">{`W${stats.world}`}</span>
      </>
    );
  } else if (!online && lastUpdated && lastUpdated?.getTime() > 0) {
    status = <> - {lastUpdated.toLocaleString()}</>;
  }

  const healthRatio = (stats?.health?.current ?? 0) / (stats?.health?.max ?? 1);
  const prayerRatio = (stats?.prayer?.current ?? 0) / (stats?.prayer?.max ?? 1);
  const runRatio = (stats?.run?.current ?? 0) / (stats?.run?.max ?? 1);

  return (
    <div className={`player-stats ${online ? "" : "player-stats-inactive"}`}>
      <XpDropper xpDrops={xpDrops} />
      <div className="player-stats-hitpoints">
        <StatBar
          className="player-stats-hitpoints-bar"
          color={COLORS.player.hitpoints}
          bgColor={COLORS.player.hitpointsBG}
          ratio={healthRatio}
        />
        {interactionBar}
        <div className="player-stats-name">
          <PlayerIcon name={member} /> {member} {status}
        </div>
        <div className="player-stats-hitpoints-numbers">
          {stats ? `${stats.health.current} / ${stats.health.max}` : "10 / 10"}
        </div>
      </div>
      <div className="player-stats-prayer">
        <StatBar
          className="player-stats-prayer-bar"
          color={COLORS.player.prayer}
          bgColor={COLORS.player.prayerBG}
          ratio={prayerRatio}
        />
        <div className="player-stats-prayer-numbers">
          {stats ? `${stats.prayer.current} / ${stats?.prayer.max}` : "1 / 1"}
        </div>
      </div>
      <div className="player-stats-energy">
        <StatBar
          className="player-stats-energy-bar"
          color={COLORS.player.energy}
          bgColor={COLORS.player.energyBG}
          ratio={runRatio}
        />
      </div>
    </div>
  );
};

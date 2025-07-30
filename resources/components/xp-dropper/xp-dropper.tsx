import { type ReactElement } from "react";
import type * as Member from "../../game/member";
import { SkillIconsBySkill } from "../../game/skill";

import "./xp-dropper.css";

/**
 * Displays rising XP drops in the style of OSRS.
 */
export const XpDropper = ({ xpDrops }: { xpDrops: Member.ExperienceDrop[] | undefined }): ReactElement => {
  return (
    <div className="xp-dropper">
      {xpDrops?.map(({ id, skill, amount, seed }) => {
        // Spread out horizontally randomly
        const translateX = -Math.round(50 * seed);
        /*
         * Spread clustered drops that share close IDs vertically. The 5
         * represents that we expect the player to not get xp in more than 5
         * skills in an update.
         */
        const translateY = Math.round(10 * (id % 5));
        return (
          <div
            key={id}
            style={{
              transform: `translate(${translateX}px, ${translateY}px)`,
            }}
            className="xp-dropper-drop"
          >
            <img alt={skill} src={SkillIconsBySkill.get(skill)?.href ?? ""} />+{amount}
          </div>
        );
      })}
    </div>
  );
};

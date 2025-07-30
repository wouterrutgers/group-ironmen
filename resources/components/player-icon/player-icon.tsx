import type { ReactElement } from "react";
import * as Member from "../../game/member";

export const PlayerIcon = ({ name }: { name: Member.Name }): ReactElement => (
  <img
    alt={`Player icon for ${name}`}
    src="/ui/player-icon.webp"
    style={{ filter: `hue-rotate(${Member.computeMemberHueDegrees(name)}deg) saturate(75%)` }}
    width="12"
    height="15"
  />
);

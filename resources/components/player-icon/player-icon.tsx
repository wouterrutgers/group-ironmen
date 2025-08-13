import type { ReactElement } from "react";
import * as Member from "../../game/member";
import { CachedImage } from "../cached-image/cached-image";

export const PlayerIcon = ({ name }: { name: Member.Name }): ReactElement => {
  return (
    <CachedImage
      alt={`Player icon for ${name}`}
      src="/ui/player-icon.webp"
      style={{ filter: `hue-rotate(${Member.computeMemberHueDegrees(name)}deg) saturate(75%)` }}
      width="12"
      height="15"
    />
  );
};

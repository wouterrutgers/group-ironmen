import type { ReactElement } from "react";
import { useGroupListMembersContext } from "../../context/group-state-context";
import { PlayerPanel } from "../player-panel/player-panel";

export const PanelsPage = (): ReactElement => {
  const groupMembers = useGroupListMembersContext();

  const panels = groupMembers
    .filter((member) => member !== "@SHARED")
    .map<ReactElement>((member) => <PlayerPanel key={member} member={member} />);

  return <div id="panels-page-container">{panels}</div>;
};

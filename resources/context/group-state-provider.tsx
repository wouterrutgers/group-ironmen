import { useContext, useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { GroupState } from "../api/api";
import { Context as APIContext } from "./api-context";
import { GroupStateContext } from "./group-state-context";

export const GroupStateProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [group, setGroup] = useState<GroupState>();
  const { setUpdateCallbacks } = useContext(APIContext);

  useEffect(() => {
    if (!setUpdateCallbacks) return;

    setUpdateCallbacks({
      onGroupUpdate: (group) => setGroup(structuredClone(group)),
    });
  }, [setUpdateCallbacks]);

  return <GroupStateContext value={group}>{children}</GroupStateContext>;
};

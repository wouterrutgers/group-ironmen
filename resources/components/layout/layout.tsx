import { useContext, type ReactElement, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AppNavigation } from "../app-navigation/app-navigation.tsx";
import { PlayerPanel } from "../player-panel/player-panel.tsx";
import { Context as APIContext } from "../../context/api-context.tsx";
import { SettingsContext as SettingsContext } from "../../context/settings-context.tsx";
import { GroupMemberNamesContext } from "../../context/group-context.tsx";

import "./layout.css";

export const UnauthedLayout = ({ children }: { children?: ReactNode }): ReactElement => {
  return (
    <>
      <div id="unauthed-content">{children}</div>
    </>
  );
};

const SidePanels = (): ReactNode => {
  const groupMembers = useContext(GroupMemberNamesContext);

  if (groupMembers.size <= 0) return undefined;

  return (
    <div id="side-panels-container">
      {groupMembers
        .values()
        .filter((member) => member !== "@SHARED")
        .toArray()
        .sort((a, b) => a.localeCompare(b))
        .map<ReactElement>((member) => (
          <PlayerPanel key={member} member={member} />
        ))}
    </div>
  );
};

export const AuthedLayout = ({ children, showPanels }: { children?: ReactNode; showPanels: boolean }): ReactElement => {
  const { credentials } = useContext(APIContext);
  const { sidebarPosition, siteTheme } = useContext(SettingsContext);

  if (siteTheme === "dark") {
    document.documentElement.classList.add("dark-mode");
  } else {
    document.documentElement.classList.remove("dark-mode");
  }

  if (credentials === undefined) return <Navigate to="/" />;

  const mainContent = (
    <div id="main-content" className="pointer-passthrough">
      <AppNavigation groupName={credentials?.name} />
      {children}
    </div>
  );

  if (sidebarPosition === "right") {
    return (
      <>
        {mainContent}
        {showPanels ? <SidePanels /> : undefined}
      </>
    );
  } else {
    return (
      <>
        {showPanels ? <SidePanels /> : undefined}
        {mainContent}
      </>
    );
  }
};

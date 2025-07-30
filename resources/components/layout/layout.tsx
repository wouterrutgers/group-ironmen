import { useContext, type ReactElement, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AppNavigation } from "../app-navigation/app-navigation.tsx";
import { useGroupListMembersContext } from "../../context/group-state-context.ts";
import { PlayerPanel } from "../player-panel/player-panel.tsx";
import { Context as APIContext } from "../../context/api-context.tsx";
import { Context as SettingsContext } from "../../context/settings-context.tsx";

export const UnauthedLayout = ({ children }: { children?: ReactNode }): ReactElement => {
  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </>
  );
};

export const AuthedLayout = ({ children, showPanels }: { children?: ReactNode; showPanels: boolean }): ReactElement => {
  const { credentials } = useContext(APIContext);
  const groupMembers = useGroupListMembersContext();
  const { sidebarPosition, siteTheme } = useContext(SettingsContext);

  if (siteTheme === "dark") {
    document.documentElement.classList.add("dark-mode");
  } else {
    document.documentElement.classList.remove("dark-mode");
  }

  if (credentials === undefined) return <Navigate to="/" />;

  let sidePanels = undefined;
  if (showPanels && groupMembers.length > 0) {
    sidePanels = (
      <div id="side-panels-container">
        {groupMembers
          .filter((member) => member !== "@SHARED")
          .sort((a, b) => a.localeCompare(b))
          .map<ReactElement>((member) => (
            <PlayerPanel key={member} member={member} />
          ))}
      </div>
    );
  }

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
        {sidePanels}
      </>
    );
  } else {
    return (
      <>
        {sidePanels}
        {mainContent}
      </>
    );
  }
};

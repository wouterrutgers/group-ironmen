import { createContext, type ReactElement, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/local-storage";

export const SidebarPosition = ["left", "right"] as const;
export type SidebarPosition = (typeof SidebarPosition)[number];

export const SiteTheme = ["light", "dark"] as const;
export type SiteTheme = (typeof SiteTheme)[number];

interface Settings {
  siteTheme: SiteTheme;
  setSiteTheme?: (value: SiteTheme) => void;
  sidebarPosition: SidebarPosition;
  setSidebarPosition?: (value: SidebarPosition) => void;
}
const DEFAULT_SITE_SETTINGS = Object.freeze({ sidebarPosition: "left", siteTheme: "light" });

// eslint-disable-next-line react-refresh/only-export-components
export const Context = createContext<Settings>(DEFAULT_SITE_SETTINGS);

const KEY_SITE_THEME = "settings-site-theme";
const KEY_SIDEBAR_POSITION = "settings-sidebar-position";

const validateSiteTheme = (value: string | undefined): SiteTheme | undefined => {
  const validated = SiteTheme.find((theme) => theme === value);
  return validated;
};
const validateSidebarPosition = (value: string | undefined): SidebarPosition | undefined => {
  const validated = SidebarPosition.find((position) => position === value);
  return validated;
};

export const SettingsProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [siteTheme, setSiteTheme] = useLocalStorage<SiteTheme>({
    key: KEY_SITE_THEME,
    defaultValue: DEFAULT_SITE_SETTINGS.siteTheme,
    validator: validateSiteTheme,
  });
  const [sidebarPosition, setSidebarPosition] = useLocalStorage<SidebarPosition>({
    key: KEY_SIDEBAR_POSITION,
    defaultValue: DEFAULT_SITE_SETTINGS.sidebarPosition,
    validator: validateSidebarPosition,
  });

  return <Context value={{ siteTheme, sidebarPosition, setSidebarPosition, setSiteTheme }}>{children}</Context>;
};

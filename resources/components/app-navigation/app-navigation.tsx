import { Fragment, type ReactElement } from "react";
import { MenLink } from "../men-link/men-link";

import "./app-navigation.css";
import { useLocation } from "react-router-dom";

export const AppNavigation = ({ groupName }: { groupName: string }): ReactElement => {
  const location = useLocation();

  const mainLinks = [
    { label: "Items", href: "/group/items", mobileIconSource: "/ui/777-0.png" },
    { label: "Map", href: "/group/map", mobileIconSource: "/ui/1698-0.png" },
    { label: "Graphs", href: "/group/graphs", mobileIconSource: "/ui/3579-0.png" },
    { label: "Panels", href: "/group/panels", mobileIconSource: "/ui/1707-0.png" },
    { label: "Settings", href: "/group/settings", mobileIconSource: "/ui/785-0.png" },
  ];

  const rightAlignedLinks = [
    { label: "Setup", href: "/setup-instructions", mobileIconSource: "/ui/1094-0.png" },
    { label: "Logout", href: "/logout", mobileIconSource: "/ui/225-0.png" },
  ];

  const renderLinks = (links: typeof mainLinks): ReactElement[] =>
    links.map(({ label, href, mobileIconSource }) => (
      <Fragment key={label}>
        <span className="desktop">
          <MenLink key={label} href={href} selected={location.pathname === href}>
            {label}
          </MenLink>
        </span>
        <span className="mobile">
          <MenLink key={label} href={href} selected={location.pathname === href}>
            <img alt={label} src={mobileIconSource} />
          </MenLink>
        </span>
      </Fragment>
    ));

  return (
    <div id="app-navigation" className="rsborder-tiny rsbackground">
      <h4 id="app-navigation-group-name">{groupName}</h4>
      <nav id="app-navigation-nav">
        <div className="nav-main-links">{renderLinks(mainLinks)}</div>
        <div className="nav-right-links">{renderLinks(rightAlignedLinks)}</div>
      </nav>
    </div>
  );
};

import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router";

import "./men-link.css";

export interface MenLinkProps {
  children: ReactNode;
  href: string;
  selected?: boolean;
  className?: string;
}
export const MenLink = (props: MenLinkProps): ReactElement => {
  return (
    <Link className={`men-link men-button ${props.selected ? "active" : ""} ${props.className ?? ""}`} to={props.href}>
      {props.children}
    </Link>
  );
};

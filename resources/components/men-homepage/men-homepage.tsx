import { MenLink } from "../men-link/men-link.tsx";
import { SocialLinks } from "../social-links/social-links.tsx";
import { useContext, useEffect, useState, type ReactElement } from "react";
import { Context as APIContext } from "../../context/api-context.tsx";

import "./men-homepage.css";

export const MenHomepage = (): ReactElement => {
  const { logInLive } = useContext(APIContext) ?? {};
  const [hasLogin, setHasLogin] = useState<boolean>();

  useEffect(() => {
    if (!logInLive) return;

    logInLive()
      .then(() => {
        setHasLogin(true);
      })
      .catch(() => {
        setHasLogin(false);
      });
  }, [logInLive]);

  const groupLink = <MenLink href="/group">Go to Group</MenLink>;
  const loginLink = <MenLink href="/login">Login</MenLink>;

  if (hasLogin === undefined) {
    return <></>;
  }

  return (
    <div id="men-homepage">
      <SocialLinks />
      <h1>GroupIron.men</h1>
      <div id="men-homepage-links">
        <MenLink href="/create-group">Get started</MenLink>
        <MenLink href="/demo">Demo</MenLink>
        {hasLogin ? groupLink : loginLink}
      </div>
    </div>
  );
};

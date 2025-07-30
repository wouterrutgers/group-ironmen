import type { ReactElement } from "react";
import "./social-links.css";

export const SocialLinks = (): ReactElement => {
  return (
    <ul id="social-links">
      <li>
        <a href="https://ko-fi.com/gimplugin" title="Support the original creator on Ko-fi" target="_blank">
          <div>
            <img alt="kofi logo" loading="lazy" src="/images/kofi_p_logo_nolabel.webp" height="20" />
          </div>
          Support the original creator on Ko-fi
        </a>
      </li>
      <li>
        <a
          href="https://github.com/christoabrown/group-ironmen-tracker"
          title="Original Creator's Github"
          target="_blank"
        >
          <div>
            <img alt="github logo" loading="lazy" src="/images/github-light.webp" height="20" />
          </div>
          Original creator's GitHub
        </a>
      </li>
      <li>
        <a href="https://github.com/BunniesRabbits/group-ironmen" title="Github" target="_blank">
          <div>
            <img alt="github logo" loading="lazy" src="/images/github-light.webp" height="20" />
          </div>
          This site's GitHub
        </a>
      </li>
    </ul>
  );
};

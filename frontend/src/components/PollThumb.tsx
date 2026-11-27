import { IconPoll } from "@open-ent/react/icons/apps";
import { useState } from "react";

/** Vignette d'un sondage : son image, ou à défaut la tuile de l'application (couleur du module, suit le thème). */
export const PollThumb = ({ icon, size }: { icon?: string; size: number }) => {
  const [broken, setBroken] = useState(false);
  const style = { width: `${size / 10}rem`, height: `${size / 10}rem` };
  if (icon && !broken) {
    return (
      <img
        className="poll-thumb"
        src={`${icon}?thumbnail=120x120`}
        alt=""
        style={style}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className="poll-thumb app-icon icon-ratio rounded bg-light-poll color-app-poll icon-sm"
      style={style}
      aria-hidden="true"
    >
      <IconPoll />
    </span>
  );
};

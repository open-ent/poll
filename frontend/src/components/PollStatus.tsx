import { Badge } from "@open-ent/react";
import { useTranslation } from "react-i18next";
import { daysLeft, hasAlreadyVoted, Poll } from "../lib/polls";

/**
 * État d'un sondage. Une pastille seulement quand il faut agir ou que c'est fini (clôture imminente, déjà répondu,
 * terminé) ; sinon une simple mention de l'échéance.
 */
export const PollStatus = ({ poll, userId }: { poll: Poll; userId: string }) => {
  const { t } = useTranslation("poll");
  const left = daysLeft(poll);
  if (left === null)
    return (
      <Badge variant={{ type: "chip" }} data-poll-status="closed">
        {t("poll.closed", { defaultValue: "Terminé" })}
      </Badge>
    );
  if (hasAlreadyVoted(poll, userId))
    return (
      <Badge
        variant={{ type: "content", level: "success", background: true }}
        data-poll-status="voted"
      >
        {t("poll.voted", { defaultValue: "Répondu" })}
      </Badge>
    );
  if (left <= 1)
    return (
      <Badge
        variant={{ type: "content", level: "warning", background: true }}
        data-poll-status="closing"
      >
        {left === 0
          ? t("poll.closes.today", { defaultValue: "Clôture ce soir" })
          : t("poll.closes.tomorrow", { defaultValue: "Clôture demain" })}
      </Badge>
    );
  return (
    <small className="text-gray-700" data-poll-status="open">
      {t("poll.closes.in", {
        count: left,
        defaultValue: "Clôture dans [[count]] jours",
      })}
    </small>
  );
};

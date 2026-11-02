import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { endDate, hasExpired, Poll, totalVotes } from "../lib/polls";

/** Vignette d'un sondage : image, question, auteur, nombre de votes et échéance ; case à cocher si on peut le gérer. */
export const PollCard = ({
  poll,
  selected,
  onToggle,
}: {
  poll: Poll;
  selected: boolean;
  onToggle: (id: string) => void;
}) => {
  const { t } = useTranslation("poll");
  const expired = hasExpired(poll);
  return (
    <li
      className="border rounded p-8 d-flex gap-12 align-items-start"
      style={{ width: 300 }}
      data-poll={poll._id}
    >
      {poll.myRights?.manage && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(poll._id as string)}
          aria-label={poll.question}
          data-poll-select={poll._id}
        />
      )}
      <img
        src={
          poll.icon
            ? `${poll.icon}?thumbnail=120x120`
            : "/assets/themes/edifice-bootstrap/img/illustrations/poll-default.png"
        }
        alt=""
        width={56}
        height={56}
        style={{ objectFit: "cover", borderRadius: 6 }}
        loading="lazy"
        onError={(e) =>
          ((e.target as HTMLImageElement).style.visibility = "hidden")
        }
      />
      <div style={{ minWidth: 0 }}>
        <Link
          to={`/view/${poll._id}`}
          className="d-block fw-bold text-truncate"
          title={poll.question}
          data-poll-open={poll._id}
        >
          {poll.question}
        </Link>
        <small className="d-block text-truncate">
          {poll.owner?.displayName}
        </small>
        <small className="d-block">
          {totalVotes(poll)} {t("poll.vote", { defaultValue: "vote(s)" })}
        </small>
        <small className="d-block text-muted">
          {expired
            ? t("poll.expired")
            : endDate(poll).toLocaleDateString("fr-FR")}
        </small>
      </div>
    </li>
  );
};

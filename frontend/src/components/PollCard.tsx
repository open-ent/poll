import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { leaderIndex, percent, Poll, totalVotes } from "../lib/polls";
import { PollStatus } from "./PollStatus";
import { PollThumb } from "./PollThumb";

/**
 * Carte d'un sondage : vignette, question, auteur, état et nombre de votants. Les sondages dont on peut voir les résultats
 * (les miens, terminés, déjà répondus) montrent en plus la réponse en tête. Toute la carte ouvre le sondage ; la case à
 * cocher (gestionnaires) reste au-dessus du lien.
 */
export const PollCard = ({
  poll,
  userId,
  showResults,
  selected,
  onToggle,
}: {
  poll: Poll;
  userId: string;
  showResults: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
}) => {
  const { t } = useTranslation("poll");
  const total = totalVotes(poll);
  const lead = showResults ? leaderIndex(poll) : null;
  const leader = lead === null ? null : poll.answers[lead];
  return (
    <li
      className={`card poll-card${selected ? " poll-card--selected" : ""}`}
      data-poll={poll._id}
    >
      <div className="d-flex gap-12 align-items-start">
        <PollThumb icon={poll.icon} size={56} />
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <Link
            to={`/view/${poll._id}`}
            className="poll-card-question stretched-link text-truncate-2"
            title={poll.question}
            data-poll-open={poll._id}
          >
            {poll.question}
          </Link>
          <small className="d-block text-gray-700 text-truncate">
            {poll.owner?.displayName}
          </small>
        </div>
        {poll.myRights?.manage && (
          <input
            type="checkbox"
            className="form-check-input poll-card-select"
            checked={selected}
            onChange={() => onToggle(poll._id as string)}
            aria-label={t("poll.select.one", {
              question: poll.question,
              defaultValue: "Sélectionner « [[question]] »",
            })}
            data-poll-select={poll._id}
          />
        )}
      </div>

      {leader && (
        <div className="poll-lead" data-poll-lead>
          <div className="d-flex justify-content-between gap-8 small">
            <span className="text-truncate">{leader.value}</span>
            <strong>{percent(leader, total)} %</strong>
          </div>
          <div className="poll-lead-track" aria-hidden="true">
            <div
              className="poll-lead-fill"
              style={{ width: `${percent(leader, total)}%` }}
            />
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center gap-8 mt-auto pt-12">
        <PollStatus poll={poll} userId={userId} />
        <small className="text-gray-700" data-poll-votes>
          {t("poll.voters", {
            count: total,
            defaultValue: "[[count]] votant(s)",
          })}
        </small>
      </div>
    </li>
  );
};

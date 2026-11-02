import { Button } from "@open-ent/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  canVote,
  hasAlreadyVoted,
  hasExpired,
  percent,
  totalVotes,
} from "../lib/polls";
import { ShareModal } from "../components/ShareModal";
import { pollService } from "../services/poll.service";
import { usePolls, useUserId } from "../services/queries";

const COLORS = ["#2a9cc8", "#f0ad4e", "#5cb85c", "#d9534f"];

/** Un sondage : on vote (une seule fois) tant qu'il est ouvert, sinon on voit les résultats en barres. */
export const PollView = () => {
  const { t } = useTranslation("poll");
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const polls = usePolls();
  const me = useUserId();
  const [choice, setChoice] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (polls.isLoading || me.isLoading) return null;
  const poll = (polls.data ?? []).find((p) => p._id === id);
  const userId = me.data ?? "";

  if (!poll) {
    return (
      <div data-poll-notfound>
        <h2 className="h3">{t("oops", { defaultValue: "Oups !" })}</h2>
        <p>{t("poll.or.page.notfound.or.unauthorized")}</p>
        <Button type="button" color="primary" onClick={() => navigate("/")}>
          {t("back", { defaultValue: "Retour" })}
        </Button>
      </div>
    );
  }

  const total = totalVotes(poll);
  const voting = canVote(poll, userId);
  const vote = async () => {
    setBusy(true);
    const answers = poll.answers.map((a, i) =>
      i === choice ? { ...a, votes: [...(a.votes ?? []), userId] } : a,
    );
    try {
      await pollService.vote({ ...poll, answers });
      await qc.invalidateQueries({ queryKey: ["polls"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article data-poll-view={poll._id}>
      <p>
        <Link to="/" data-poll-back>
          ← {t("poll.title")}
        </Link>
      </p>
      <h2 className="h3">{poll.question}</h2>
      {voting ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void vote();
          }}
          data-poll-vote-form
        >
          {poll.answers.map((a, i) => (
            <label key={i} className="d-block mb-8">
              <input
                type="radio"
                name="answer"
                checked={choice === i}
                onChange={() => setChoice(i)}
                data-poll-choice={i}
              />{" "}
              {a.value}
            </label>
          ))}
          <Button type="submit" color="primary" disabled={busy} data-poll-vote>
            {t("poll.vote")}
          </Button>
        </form>
      ) : (
        <div data-poll-results>
          <ul className="list-unstyled">
            {poll.answers.map((a, i) => (
              <li key={i} className="mb-12" data-poll-result={i}>
                <strong>
                  {a.value} : {percent(a, total)} %
                </strong>
                <div
                  style={{ background: "#e9ecef", height: 14, borderRadius: 7 }}
                >
                  <div
                    style={{
                      width: `${percent(a, total)}%`,
                      background: COLORS[i % 4],
                      height: 14,
                      borderRadius: 7,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p data-poll-total>
            <strong>
              {t("poll.total.vote")} {total}
            </strong>
          </p>
          {hasExpired(poll) && (
            <p className="text-muted">{t("poll.expired")}</p>
          )}
          {!hasExpired(poll) && hasAlreadyVoted(poll, userId) && (
            <p className="text-muted">
              {t("poll.answered", { defaultValue: "Vous avez répondu." })}
            </p>
          )}
        </div>
      )}
      {poll.myRights?.manage && (
        <div className="mt-16">
          <Button
            type="button"
            color="primary"
            variant="outline"
            onClick={() => navigate(`/edit/${poll._id}`)}
            data-poll-edit
          >
            {t("poll.head.modify")}
          </Button>{" "}
          <Button
            type="button"
            color="primary"
            variant="outline"
            onClick={() => setSharing(true)}
            data-poll-share
          >
            {t("poll.share")}
          </Button>
          <ShareModal
            poll={sharing ? poll : null}
            onClose={() => setSharing(false)}
          />
        </div>
      )}
    </article>
  );
};

import illuError from "@images/emptyscreen/illu-error.svg";
import { Badge, Button, EmptyScreen } from "@open-ent/react";
import { IconArrowLeft, IconEdit, IconShare } from "@open-ent/react/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ShareModal } from "../components/ShareModal";
import { PollThumb } from "../components/PollThumb";
import {
  canVote,
  endDate,
  hasExpired,
  leaderIndex,
  percent,
  Poll,
  totalVotes,
} from "../lib/polls";
import { pollService } from "../services/poll.service";
import { usePolls, useUserId } from "../services/queries";

const longDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Résultats : chaque réponse garde la forme d'une ligne du bulletin et se remplit à sa part des votes. La barre ne
 * s'anime qu'une fois, à l'arrivée (rien si l'usager a demandé moins d'animations).
 */
const Results = ({ poll, userId }: { poll: Poll; userId: string }) => {
  const { t } = useTranslation("poll");
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const total = totalVotes(poll);
  const lead = leaderIndex(poll);
  return (
    <ul className="list-unstyled poll-options" data-poll-results>
      {poll.answers.map((a, i) => {
        const pct = percent(a, total);
        const mine = (a.votes ?? []).includes(userId);
        return (
          <li
            key={i}
            className={`poll-option poll-result${i === lead ? " poll-result--lead" : ""}`}
            data-poll-result={i}
          >
            <span
              className="poll-result-fill"
              style={{ width: shown ? `${pct}%` : 0 }}
              aria-hidden="true"
            />
            <span className="poll-option-label">
              {a.value}
              {mine && (
                <Badge
                  className="ms-8"
                  variant={{ type: "content", level: "info", background: true }}
                  data-poll-mine
                >
                  {t("poll.your.answer", { defaultValue: "Votre réponse" })}
                </Badge>
              )}
            </span>
            <span className="poll-result-figures">
              <span className="poll-result-pct">{pct} %</span>
              <small className="text-gray-700">
                {t("poll.votes", {
                  count: a.votes?.length ?? 0,
                  defaultValue: "[[count]] vote(s)",
                })}
              </small>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/** Un sondage : on vote (une seule fois) tant qu'il est ouvert, sinon on voit les résultats. */
export const PollView = () => {
  const { t } = useTranslation("poll");
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const polls = usePolls();
  const me = useUserId();
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (polls.isLoading || me.isLoading) return null;
  const poll = (polls.data ?? []).find((p) => p._id === id);
  const userId = me.data ?? "";

  if (!poll) {
    return (
      <div className="py-48 d-flex flex-column align-items-center gap-16" data-poll-notfound>
        <EmptyScreen
          imageSrc={illuError}
          title={t("poll.notfound.title", { defaultValue: "Sondage introuvable" })}
          text={t("poll.or.page.notfound.or.unauthorized")}
        />
        <Button type="button" color="primary" onClick={() => navigate("/")}>
          {t("poll.back", { defaultValue: "Tous les sondages" })}
        </Button>
      </div>
    );
  }

  const total = totalVotes(poll);
  const voting = canVote(poll, userId);
  const expired = hasExpired(poll);
  const vote = async () => {
    if (choice === null) return;
    setBusy(true);
    const answers = poll.answers.map((a, i) =>
      i === choice ? { ...a, votes: [...(a.votes ?? []), userId] } : a,
    );
    try {
      await pollService.vote({ ...poll, answers });
      await qc.invalidateQueries({ queryKey: ["polls"] });
      setJustVoted(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="poll-view py-16" data-poll-view={poll._id}>
      <Link to="/" className="poll-back" data-poll-back>
        <IconArrowLeft width={16} height={16} aria-hidden="true" />
        {t("poll.back", { defaultValue: "Tous les sondages" })}
      </Link>

      <header className="d-flex gap-16 align-items-start mt-16 mb-24">
        <PollThumb icon={poll.icon} size={72} />
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <h2 className="poll-view-question">{poll.question}</h2>
          <p className="d-flex flex-wrap column-gap-16 row-gap-4 text-gray-700 mb-0">
            {poll.owner?.displayName && (
              <span>
                {t("poll.by", {
                  name: poll.owner.displayName,
                  defaultValue: "Par [[name]]",
                })}
              </span>
            )}
            <span>
              {expired
                ? t("poll.ended.on", {
                    date: longDate(endDate(poll)),
                    defaultValue: "Terminé le [[date]]",
                  })
                : t("poll.ends.on", {
                    date: longDate(endDate(poll)),
                    defaultValue: "Clôture le [[date]]",
                  })}
            </span>
          </p>
            {poll.myRights?.manage && (
              <div className="d-flex gap-8 mt-12 ms-n12">
                <Button
                  type="button"
                  color="tertiary"
                  variant="ghost"
                  leftIcon={<IconEdit />}
                  onClick={() => navigate(`/edit/${poll._id}`)}
                  data-poll-edit
                >
                  {t("poll.edit", { defaultValue: "Modifier" })}
                </Button>
                <Button
                  type="button"
                  color="tertiary"
                  variant="ghost"
                  leftIcon={<IconShare />}
                  onClick={() => setSharing(true)}
                  data-poll-share
                >
                  {t("poll.share")}
                </Button>
              </div>
            )}
        </div>
      </header>

      {voting ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void vote();
          }}
          data-poll-vote-form
        >
          <fieldset>
            <legend className="visually-hidden">{poll.question}</legend>
            <div className="poll-options">
              {poll.answers.map((a, i) => (
                <label
                  key={i}
                  className={`poll-option poll-choice${choice === i ? " poll-choice--checked" : ""}`}
                >
                  <input
                    type="radio"
                    className="form-check-input m-0"
                    name="answer"
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                    data-poll-choice={i}
                  />
                  <span className="poll-option-label">{a.value}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="d-flex align-items-center gap-16 mt-16">
            <Button
              type="submit"
              color="primary"
              disabled={busy || choice === null}
              isLoading={busy}
              data-poll-vote
            >
              {t("poll.vote")}
            </Button>
            <small className="text-gray-700">
              {t("poll.vote.once", {
                defaultValue: "Un seul vote, qui ne pourra plus être changé.",
              })}
            </small>
          </div>
        </form>
      ) : (
        <>
          <Results poll={poll} userId={userId} />
          <p className="d-flex flex-wrap align-items-center gap-12 mt-16 mb-0">
            <strong data-poll-total>
              {t("poll.voters", {
                count: total,
                defaultValue: "[[count]] votant(s)",
              })}
            </strong>
            {justVoted && (
              <span className="text-success" role="status">
                {t("poll.voted.thanks", {
                  defaultValue: "Votre vote est enregistré.",
                })}
              </span>
            )}
          </p>
        </>
      )}

      {poll.myRights?.manage && (
        <ShareModal
          poll={sharing ? poll : null}
          onClose={() => setSharing(false)}
        />
      )}
    </article>
  );
};

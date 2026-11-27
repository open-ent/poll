import { Alert, Button, IconButton } from "@open-ent/react";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconDelete,
  IconPlus,
} from "@open-ent/react/icons";
import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PollThumb } from "../components/PollThumb";
import {
  Answer,
  defaultEnd,
  draftProblem,
  endDate,
  fromInputDate,
  MAX_ANSWER,
  moveAnswer,
  removeAnswer,
  toInputDate,
  toPayload,
  totalVotes,
} from "../lib/polls";
import { pollService } from "../services/poll.service";
import { usePolls } from "../services/queries";

/** Création ou modification d'un sondage. Une fois qu'il a reçu des votes, la question et les réponses ne changent plus. */
export const PollEdit = () => {
  const { t } = useTranslation("poll");
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const polls = usePolls();
  const existing = (polls.data ?? []).find((p) => p._id === id);

  const [question, setQuestion] = useState("");
  const [end, setEnd] = useState(toInputDate(defaultEnd()));
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [answers, setAnswers] = useState<Answer[]>([
    { value: "" },
    { value: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setQuestion(existing.question);
      setEnd(toInputDate(endDate(existing)));
      setIcon(existing.icon);
      setAnswers(existing.answers.map((a) => ({ ...a })));
    }
  }, [existing]);

  const locked = !!existing && totalVotes(existing) > 0;
  const problem = draftProblem(question, answers);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (problem || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = toPayload({
        icon,
        question,
        end: fromInputDate(end),
        answers,
      });
      if (existing?._id) await pollService.update(existing._id, body);
      else await pollService.create(body);
      await qc.invalidateQueries({ queryKey: ["polls"] });
      navigate(existing?._id ? `/view/${existing._id}` : "/");
    } catch {
      setError(
        t("poll.error.save", {
          defaultValue: "Le sondage n'a pas pu être enregistré. Réessayez.",
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => navigate(existing?._id ? `/view/${existing._id}` : "/");

  return (
    <form onSubmit={submit} className="poll-edit py-16" data-poll-form>
      <Link
        to={existing?._id ? `/view/${existing._id}` : "/"}
        className="poll-back"
      >
        <IconArrowLeft width={16} height={16} aria-hidden="true" />
        {existing
          ? t("poll.back.view", { defaultValue: "Retour au sondage" })
          : t("poll.back", { defaultValue: "Tous les sondages" })}
      </Link>
      <h2 className="h3 mt-16 mb-24">
        {existing
          ? t("poll.edit.title", { defaultValue: "Modifier le sondage" })
          : t("poll.new.title", { defaultValue: "Nouveau sondage" })}
      </h2>

      {locked && (
        <div className="mb-24" data-poll-locked>
          <Alert type="info">
            {t("poll.locked", {
              defaultValue:
                "Ce sondage a déjà reçu des votes : la question et les réponses ne peuvent plus changer. Vous pouvez encore modifier l'image et la date de clôture.",
            })}
          </Alert>
        </div>
      )}

      <div className="poll-edit-head mb-24">
        <div className="d-flex flex-column align-items-center gap-8">
          <PollThumb icon={icon} size={96} />
          <label className="poll-link-button mb-0" data-poll-icon-change>
            {icon
              ? t("poll.image.change", { defaultValue: "Changer l'image" })
              : t("poll.image.choose", { defaultValue: "Ajouter une image" })}
            <input
              type="file"
              accept="image/*"
              className="visually-hidden"
              data-poll-icon-input
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  setIcon(await pollService.uploadImage(file));
                } catch {
                  setError(
                    t("poll.error.image", {
                      defaultValue:
                        "L'image n'a pas pu être envoyée. Essayez un fichier JPEG ou PNG plus léger.",
                    }),
                  );
                }
              }}
            />
          </label>
          {icon && (
            <button
              type="button"
              className="poll-link-button text-gray-700"
              onClick={() => setIcon(undefined)}
              data-poll-icon-remove
            >
              {t("poll.icon.remove", { defaultValue: "Retirer l'image" })}
            </button>
          )}
        </div>

        <div className="d-flex flex-column gap-16" style={{ minWidth: 0 }}>
          <div>
            <label htmlFor="poll-question" className="form-label">
              {t("poll.question")}
            </label>
            <input
              id="poll-question"
              className="form-control form-control-lg"
              value={question}
              disabled={locked}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("poll.question.placeholder", {
                defaultValue: "Par exemple : quel jour pour la sortie au musée ?",
              })}
              required
              data-poll-question
            />
          </div>
          <div>
            <label htmlFor="poll-end" className="form-label">
              {t("poll.end")}
            </label>
            <input
              id="poll-end"
              className="form-control poll-date"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-describedby="poll-end-help"
              required
              data-poll-end
            />
            <small id="poll-end-help" className="d-block text-gray-700 mt-4">
              {t("poll.end.help", {
                defaultValue: "Les votes restent ouverts jusqu'au soir de cette date.",
              })}
            </small>
          </div>
        </div>
      </div>

      <fieldset className="mb-24">
        <legend className="form-label">{t("poll.answers")}</legend>
        <ol className="list-unstyled d-flex flex-column gap-8 mb-12">
          {answers.map((a, i) => (
            <li
              key={i}
              className="d-flex gap-8 align-items-center"
              data-poll-answer={i}
            >
              <span className="poll-answer-index" aria-hidden="true">
                {i + 1}
              </span>
              <input
                className="form-control"
                value={a.value ?? ""}
                maxLength={MAX_ANSWER}
                disabled={locked}
                placeholder={t("poll.answer.placeholder", {
                  n: i + 1,
                  defaultValue: "Réponse [[n]]",
                })}
                aria-label={t("poll.answer.placeholder", {
                  n: i + 1,
                  defaultValue: "Réponse [[n]]",
                })}
                onChange={(e) =>
                  setAnswers(
                    answers.map((x, j) =>
                      j === i ? { ...x, value: e.target.value } : x,
                    ),
                  )
                }
                data-poll-answer-input={i}
              />
              <IconButton
                type="button"
                color="tertiary"
                variant="ghost"
                icon={<IconArrowUp />}
                disabled={locked || i === 0}
                onClick={() => setAnswers(moveAnswer(answers, i, -1))}
                aria-label={t("poll.answer.up", {
                  n: i + 1,
                  defaultValue: "Monter la réponse [[n]]",
                })}
                data-poll-up={i}
              />
              <IconButton
                type="button"
                color="tertiary"
                variant="ghost"
                icon={<IconArrowDown />}
                disabled={locked || i === answers.length - 1}
                onClick={() => setAnswers(moveAnswer(answers, i, 1))}
                aria-label={t("poll.answer.down", {
                  n: i + 1,
                  defaultValue: "Descendre la réponse [[n]]",
                })}
                data-poll-down={i}
              />
              <IconButton
                type="button"
                color="tertiary"
                variant="ghost"
                icon={<IconDelete />}
                disabled={locked || answers.length <= 2}
                onClick={() => setAnswers(removeAnswer(answers, i))}
                aria-label={t("poll.answer.remove", {
                  n: i + 1,
                  defaultValue: "Supprimer la réponse [[n]]",
                })}
                data-poll-remove={i}
              />
            </li>
          ))}
        </ol>
        {!locked && (
          <Button
            type="button"
            color="primary"
            variant="ghost"
            leftIcon={<IconPlus />}
            onClick={() => setAnswers([...answers, { value: "" }])}
            data-poll-add
          >
            {t("poll.answer.add", { defaultValue: "Ajouter une réponse" })}
          </Button>
        )}
      </fieldset>

      {error && (
        <div className="mb-16" role="alert" data-poll-form-error>
          <Alert type="danger">{error}</Alert>
        </div>
      )}
      <div className="poll-edit-footer">
        <small className="text-gray-700 me-auto" data-poll-problem>
          {problem === "question" &&
            t("poll.draft.question", {
              defaultValue: "Saisissez la question pour continuer.",
            })}
          {problem === "answers" &&
            t("poll.draft.answers", {
              defaultValue: "Saisissez au moins deux réponses pour continuer.",
            })}
        </small>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={cancel}
          data-poll-cancel
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          color="primary"
          disabled={!!problem || busy}
          isLoading={busy}
          data-poll-save
        >
          {existing
            ? t("poll.save", { defaultValue: "Enregistrer" })
            : t("poll.create.submit", { defaultValue: "Créer le sondage" })}
        </Button>
      </div>
    </form>
  );
};

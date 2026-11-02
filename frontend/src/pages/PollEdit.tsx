import { Button } from "@open-ent/react";
import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
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
      navigate("/");
    } catch {
      setError(
        t("poll.error.save", { defaultValue: "L'enregistrement a échoué." }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} data-poll-form>
      <h2 className="h3">
        {existing ? t("poll.head.modify") : t("poll.head.create")}
      </h2>

      <div className="mb-16">
        <label className="d-block fw-bold">{t("poll.image")}</label>
        <div className="d-flex align-items-center gap-12">
          {icon && (
            <img
              src={`${icon}?thumbnail=120x120`}
              alt=""
              width={64}
              height={64}
              style={{ objectFit: "cover", borderRadius: 6 }}
            />
          )}
          <label className="btn btn-outline-primary mb-0" data-poll-icon-change>
            {t("poll.select", { defaultValue: "Choisir" })}
            <input
              type="file"
              accept="image/*"
              hidden
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
                      defaultValue: "L'image n'a pas pu être envoyée.",
                    }),
                  );
                }
              }}
            />
          </label>
          {icon && (
            <Button
              type="button"
              color="tertiary"
              variant="ghost"
              onClick={() => setIcon(undefined)}
              data-poll-icon-remove
            >
              {t("poll.icon.remove", { defaultValue: "Retirer l'image" })}
            </Button>
          )}
        </div>
      </div>

      <label className="d-block mb-16">
        <span className="fw-bold">{t("poll.question")}</span>
        <input
          className="form-control"
          value={question}
          disabled={locked}
          onChange={(e) => setQuestion(e.target.value)}
          required
          data-poll-question
        />
      </label>

      <label className="d-block mb-16">
        <span className="fw-bold">{t("poll.end")}</span>
        <input
          className="form-control"
          style={{ maxWidth: 220 }}
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
          data-poll-end
        />
      </label>

      <fieldset className="mb-16">
        <legend className="h6 fw-bold">{t("poll.answers")}</legend>
        {answers.map((a, i) => (
          <div
            key={i}
            className="d-flex gap-8 mb-8 align-items-center"
            data-poll-answer={i}
          >
            <input
              className="form-control"
              value={a.value ?? ""}
              maxLength={MAX_ANSWER}
              disabled={locked}
              aria-label={`${t("poll.answers")} ${i + 1}`}
              onChange={(e) =>
                setAnswers(
                  answers.map((x, j) =>
                    j === i ? { ...x, value: e.target.value } : x,
                  ),
                )
              }
              data-poll-answer-input={i}
            />
            <Button
              type="button"
              color="tertiary"
              variant="outline"
              disabled={locked || i === 0}
              onClick={() => setAnswers(moveAnswer(answers, i, -1))}
              aria-label="↑"
              data-poll-up={i}
            >
              ↑
            </Button>
            <Button
              type="button"
              color="tertiary"
              variant="outline"
              disabled={locked || i === answers.length - 1}
              onClick={() => setAnswers(moveAnswer(answers, i, 1))}
              aria-label="↓"
              data-poll-down={i}
            >
              ↓
            </Button>
            <Button
              type="button"
              color="tertiary"
              variant="outline"
              disabled={locked || answers.length <= 2}
              onClick={() => setAnswers(removeAnswer(answers, i))}
              aria-label="×"
              data-poll-remove={i}
            >
              ×
            </Button>
          </div>
        ))}
        {!locked && (
          <Button
            type="button"
            color="primary"
            variant="outline"
            onClick={() => setAnswers([...answers, { value: "" }])}
            data-poll-add
          >
            {t("add", { defaultValue: "Ajouter" })}
          </Button>
        )}
      </fieldset>

      {error && (
        <p className="text-danger" role="alert" data-poll-form-error>
          {error}
        </p>
      )}
      <div className="d-flex gap-8">
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={() => navigate("/")}
          data-poll-cancel
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          color="primary"
          disabled={!!problem || busy}
          data-poll-save
        >
          {t("save", { defaultValue: "Enregistrer" })}
        </Button>
      </div>
    </form>
  );
};

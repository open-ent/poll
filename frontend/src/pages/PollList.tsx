import { Button, Modal } from "@open-ent/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ShareModal } from "../components/ShareModal";
import { PollCard } from "../components/PollCard";
import { Poll, sortPolls } from "../lib/polls";
import { pollService } from "../services/poll.service";
import { usePolls, useUserId } from "../services/queries";

const Section = ({
  title,
  polls,
  selected,
  onToggle,
  id,
}: {
  title: string;
  polls: Poll[];
  selected: string[];
  onToggle: (id: string) => void;
  id: string;
}) => (
  <section className="mb-24" data-poll-section={id}>
    <h2 className="h4">{title}</h2>
    {polls.length === 0 ? (
      <p className="text-muted mb-0" data-poll-section-empty={id}>
        —
      </p>
    ) : null}
    <ul className="list-unstyled d-flex flex-wrap gap-16">
      {polls.map((p) => (
        <PollCard
          key={p._id}
          poll={p}
          selected={selected.includes(p._id as string)}
          onToggle={onToggle}
        />
      ))}
    </ul>
  </section>
);

/** Accueil : sondages à répondre, les miens, terminés ; recherche par question, sélection et suppression. */
export const PollList = () => {
  const { t } = useTranslation("poll");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const polls = usePolls();
  const me = useUserId();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [sharing, setSharing] = useState(false);

  const q = search.trim().toLowerCase();
  const all = (polls.data ?? []).filter(
    (p) => !q || p.question.toLowerCase().includes(q),
  );
  const sorted = sortPolls(all, me.data ?? "");
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  const toRemove = (polls.data ?? []).filter((p) =>
    selected.includes(p._id as string),
  );

  return (
    <div>
      <div className="d-flex gap-16 flex-wrap align-items-center justify-content-between mb-24">
        <input
          className="form-control"
          style={{ maxWidth: 360 }}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("poll.search", {
            defaultValue: "Rechercher un sondage",
          })}
          aria-label={t("poll.search", {
            defaultValue: "Rechercher un sondage",
          })}
          data-poll-search
        />
        <div className="d-flex gap-8">
          {toRemove.length === 1 && (
            <Button
              type="button"
              color="primary"
              variant="outline"
              onClick={() => setSharing(true)}
              data-poll-share-selected
            >
              {t("poll.share")}
            </Button>
          )}
          {selected.length > 0 && (
            <Button
              type="button"
              color="danger"
              variant="outline"
              onClick={() => setConfirm(true)}
              data-poll-delete-selected
            >
              {t("poll.delete", { defaultValue: "Supprimer" })} (
              {selected.length})
            </Button>
          )}
          <Button
            type="button"
            color="primary"
            onClick={() => navigate("/new")}
            data-poll-new
          >
            {t("poll.new")}
          </Button>
        </div>
      </div>
      {polls.isError && (
        <div className="alert alert-danger" role="alert" data-poll-error>
          {t("poll.error", {
            defaultValue: "Les sondages n'ont pas pu être chargés.",
          })}
        </div>
      )}
      <Section
        id="unanswered"
        title={t("poll.unanswered")}
        polls={sorted.unanswered}
        selected={selected}
        onToggle={toggle}
      />
      <Section
        id="submitted"
        title={t("poll.submitted")}
        polls={sorted.submitted}
        selected={selected}
        onToggle={toggle}
      />
      <Section
        id="finished"
        title={t("poll.finished")}
        polls={sorted.finished}
        selected={selected}
        onToggle={toggle}
      />

      <ShareModal
        poll={sharing ? (toRemove[0] ?? null) : null}
        onClose={() => setSharing(false)}
      />
      <Modal
        id="poll-delete"
        isOpen={confirm}
        onModalClose={() => setConfirm(false)}
      >
        <Modal.Header onModalClose={() => setConfirm(false)}>
          {t("poll.delete", { defaultValue: "Supprimer" })}
        </Modal.Header>
        <Modal.Body>
          <p>{t("poll.delete.confirm")}</p>
          <ul>
            {toRemove.map((p) => (
              <li key={p._id}>{p.question}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            color="tertiary"
            variant="ghost"
            onClick={() => setConfirm(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            color="danger"
            onClick={async () => {
              await Promise.all(
                toRemove.map((p) => pollService.remove(p._id as string)),
              );
              setSelected([]);
              setConfirm(false);
              await qc.invalidateQueries({ queryKey: ["polls"] });
            }}
            data-poll-delete-confirm
          >
            {t("remove", { defaultValue: "Supprimer" })}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

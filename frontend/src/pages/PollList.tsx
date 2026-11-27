import illuSearch from "@images/emptyscreen/illu-search.svg";
import illuEmpty from "@images/emptyscreen/illu-timelinegenerator.svg";
import {
  ActionBar,
  Alert,
  Badge,
  Button,
  EmptyScreen,
  Modal,
  SearchBar,
} from "@open-ent/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShareModal } from "../components/ShareModal";
import { PollCard } from "../components/PollCard";
import { Poll, sortPolls } from "../lib/polls";
import { pollService } from "../services/poll.service";
import { usePolls, useUserId } from "../services/queries";

type SectionId = "unanswered" | "submitted" | "finished";

const Section = ({
  id,
  title,
  empty,
  polls,
  userId,
  selected,
  onToggle,
}: {
  id: SectionId;
  title: string;
  empty: string;
  polls: Poll[];
  userId: string;
  selected: string[];
  onToggle: (id: string) => void;
}) => (
  <section className="mb-32" data-poll-section={id}>
    <h2 className="h4 d-flex align-items-center gap-8 mb-12">
      {title}
      {polls.length > 0 && (
        <Badge variant={{ type: "chip" }}>{polls.length}</Badge>
      )}
    </h2>
    {polls.length === 0 ? (
      <p className="text-gray-700 mb-0" data-poll-section-empty={id}>
        {empty}
      </p>
    ) : (
      <ul className="list-unstyled poll-grid mb-0">
        {polls.map((p) => (
          <PollCard
            key={p._id}
            poll={p}
            userId={userId}
            showResults={id !== "unanswered"}
            selected={selected.includes(p._id as string)}
            onToggle={onToggle}
          />
        ))}
      </ul>
    )}
  </section>
);

/** Accueil : sondages à répondre, les miens, terminés ; recherche par question, sélection, partage et suppression. */
export const PollList = () => {
  const { t } = useTranslation("poll");
  const qc = useQueryClient();
  const polls = usePolls();
  const me = useUserId();
  const userId = me.data ?? "";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [sharing, setSharing] = useState(false);

  const q = search.trim().toLowerCase();
  const source = polls.data ?? [];
  const all = source.filter((p) => !q || p.question.toLowerCase().includes(q));
  const sorted = sortPolls(all, userId);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  const chosen = source.filter((p) => selected.includes(p._id as string));

  const searchLabel = t("poll.search", {
    defaultValue: "Rechercher un sondage",
  });

  let body;
  if (polls.isLoading) body = null;
  else if (source.length === 0 && !polls.isError)
    body = (
      <div className="py-48" data-poll-empty>
        <EmptyScreen
          imageSrc={illuEmpty}
          title={t("poll.empty.title", {
            defaultValue: "Aucun sondage pour l'instant",
          })}
          text={t("poll.empty.text", {
            defaultValue:
              "Posez une question à vos élèves, à leurs familles ou à vos collègues : chacun répond en un clic et vous suivez les résultats en direct.",
          })}
        />
      </div>
    );
  else if (q && all.length === 0)
    body = (
      <div className="py-48" data-poll-search-empty>
        <EmptyScreen
          imageSrc={illuSearch}
          title={t("poll.search.empty", {
            query: search.trim(),
            defaultValue: "Aucun sondage ne correspond à « [[query]] »",
          })}
          text={t("poll.search.empty.text", {
            defaultValue: "La recherche porte sur la question posée.",
          })}
        />
      </div>
    );
  else
    body = (
      <>
        <Section
          id="unanswered"
          title={t("poll.unanswered")}
          empty={t("poll.section.unanswered.empty", {
            defaultValue: "Aucun sondage n'attend votre réponse.",
          })}
          polls={sorted.unanswered}
          userId={userId}
          selected={selected}
          onToggle={toggle}
        />
        <Section
          id="submitted"
          title={t("poll.submitted")}
          empty={t("poll.section.submitted.empty", {
            defaultValue: "Vous n'avez aucun sondage en cours.",
          })}
          polls={sorted.submitted}
          userId={userId}
          selected={selected}
          onToggle={toggle}
        />
        <Section
          id="finished"
          title={t("poll.finished")}
          empty={t("poll.section.finished.empty", {
            defaultValue: "Aucun sondage terminé pour l'instant.",
          })}
          polls={sorted.finished}
          userId={userId}
          selected={selected}
          onToggle={toggle}
        />
      </>
    );

  return (
    <div className="py-16">
      <div className="poll-search mb-24">
        <SearchBar
          isVariant
          clearable
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
          data-poll-search
        />
      </div>

      {polls.isError && (
        <div className="mb-24" data-poll-error>
          <Alert type="danger">
            {t("poll.error", {
              defaultValue:
                "Les sondages n'ont pas pu être chargés. Rechargez la page.",
            })}
          </Alert>
        </div>
      )}

      {body}

      {selected.length > 0 && (
        <ActionBar>
          {chosen.length === 1 && (
            <Button
              type="button"
              color="primary"
              variant="filled"
              onClick={() => setSharing(true)}
              data-poll-share-selected
            >
              {t("poll.share")}
            </Button>
          )}
          <Button
            type="button"
            color="primary"
            variant="filled"
            onClick={() => setConfirm(true)}
            data-poll-delete-selected
          >
            {t("poll.delete", { defaultValue: "Supprimer" })}
          </Button>
        </ActionBar>
      )}

      <ShareModal
        poll={sharing ? (chosen[0] ?? null) : null}
        onClose={() => setSharing(false)}
      />
      <Modal
        id="poll-delete"
        isOpen={confirm}
        onModalClose={() => setConfirm(false)}
      >
        <Modal.Header onModalClose={() => setConfirm(false)}>
          {t("poll.delete.title", {
            count: chosen.length,
            defaultValue: "Supprimer [[count]] sondage(s)",
          })}
        </Modal.Header>
        <Modal.Body>
          <p>
            {t("poll.delete.text", {
              defaultValue:
                "Les votes sont supprimés avec le sondage. Cette action est définitive.",
            })}
          </p>
          <ul className="mb-0">
            {chosen.map((p) => (
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
                chosen.map((p) => pollService.remove(p._id as string)),
              );
              setSelected([]);
              setConfirm(false);
              await qc.invalidateQueries({ queryKey: ["polls"] });
            }}
            data-poll-delete-confirm
          >
            {t("poll.delete", { defaultValue: "Supprimer" })}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

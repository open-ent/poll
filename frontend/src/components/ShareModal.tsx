import { Button, Modal } from "@open-ent/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  filterVisibles,
  Level,
  levelOf,
  LEVELS,
  shareBody,
  toggleLevel,
  Visible,
} from "../lib/share";
import { Poll } from "../lib/polls";
import { pollService } from "../services/poll.service";

const LABEL: Record<Level, string> = {
  "poll.read": "poll.read",
  "poll.contrib": "poll.contrib",
  "poll.manager": "poll.manager",
};

/** Partage d'un sondage : pour chaque personne ou groupe, trois niveaux cumulatifs (lire, répondre, gérer). */
export const ShareModal = ({
  poll,
  onClose,
}: {
  poll: Poll | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation("poll");
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["shares", poll?._id],
    enabled: !!poll,
    queryFn: () => pollService.shares(poll?._id as string),
    staleTime: 0,
  });
  const [users, setUsers] = useState<Record<string, string[]>>({});
  const [groups, setGroups] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (data.data) {
      setUsers(data.data.users.checked ?? {});
      setGroups(data.data.groups.checked ?? {});
      setQuery("");
      setError(false);
    }
  }, [data.data]);

  const actions = data.data?.actions ?? [];
  const row = (kind: "user" | "group", v: Visible) => {
    const map = kind === "user" ? users : groups;
    const set = kind === "user" ? setUsers : setGroups;
    const level = levelOf(actions, map[v.id]);
    return (
      <tr key={`${kind}-${v.id}`} data-share-row={`${kind}:${v.id}`}>
        <td>
          {kind === "group" ? "👥 " : ""}
          {v.username ?? v.name}
        </td>
        {LEVELS.map((l) => (
          <td key={l} className="text-center">
            <input
              type="checkbox"
              checked={
                level !== null && LEVELS.indexOf(level) >= LEVELS.indexOf(l)
              }
              onChange={() =>
                set({ ...map, [v.id]: toggleLevel(actions, map[v.id], l) })
              }
              aria-label={`${v.username ?? v.name} — ${t(LABEL[l])}`}
              data-share-level={`${kind}:${v.id}:${l}`}
            />
          </td>
        ))}
      </tr>
    );
  };

  const people = filterVisibles(data.data?.users.visibles ?? [], query);
  const teams = filterVisibles(data.data?.groups.visibles ?? [], query);
  // les destinataires déjà partagés restent en tête, même hors recherche
  const sharedFirst = (list: Visible[], map: Record<string, string[]>) =>
    list
      .slice()
      .sort(
        (a, b) =>
          Number((map[b.id]?.length ?? 0) > 0) -
          Number((map[a.id]?.length ?? 0) > 0),
      );

  return (
    <Modal id="poll-share" isOpen={!!poll} onModalClose={onClose} scrollable>
      <Modal.Header onModalClose={onClose}>
        {t("poll.share")} — {poll?.question}
      </Modal.Header>
      <Modal.Body>
        <input
          className="form-control mb-16"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("poll.share.search", {
            defaultValue: "Rechercher une personne ou un groupe",
          })}
          aria-label={t("poll.share.search", {
            defaultValue: "Rechercher une personne ou un groupe",
          })}
          data-share-search
        />
        <table className="table" data-share-table>
          <thead>
            <tr>
              <th />
              {LEVELS.map((l) => (
                <th key={l} className="text-center">
                  {t(LABEL[l])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sharedFirst(teams, groups).map((g) => row("group", g))}
            {sharedFirst(people, users).map((u) => row("user", u))}
          </tbody>
        </table>
        {error && (
          <p className="text-danger" role="alert" data-share-error>
            {t("poll.share.error", {
              defaultValue: "Le partage n'a pas pu être enregistré.",
            })}
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={onClose}
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          color="primary"
          disabled={busy || !data.data}
          onClick={async () => {
            setBusy(true);
            setError(false);
            try {
              await pollService.saveShares(
                poll?._id as string,
                shareBody(users, groups),
              );
              await qc.invalidateQueries({ queryKey: ["polls"] });
              onClose();
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
          data-share-save
        >
          {t("save", { defaultValue: "Enregistrer" })}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

import { odeServices } from "@open-ent/client";
import { Poll } from "../lib/polls";
import { ShareData } from "../lib/share";

export const pollService = {
  list: () => odeServices.http().get<Poll[]>("/poll/list/all"),
  create: (body: object) => odeServices.http().post<unknown>("/poll", body),
  update: (id: string, body: object) =>
    odeServices.http().put<unknown>(`/poll/${id}`, body),
  /**
   * Le serveur valide le corps contre un schéma qui n'accepte QUE ces quatre champs (propriétaire, droits… sont refusés) :
   * on envoie la question, l'image, la date de fin et les réponses, avec le vote ajouté à la réponse choisie.
   */
  vote: (poll: Poll) =>
    odeServices.http().put<unknown>(`/poll/vote/${poll._id}`, {
      icon: poll.icon,
      question: poll.question,
      end: poll.end,
      answers: poll.answers,
    }),
  shares: (id: string) =>
    odeServices.http().get<ShareData>(`/poll/share/json/${id}`),
  saveShares: (
    id: string,
    body: { users: Record<string, string[]>; groups: Record<string, string[]> },
  ) =>
    odeServices
      .http()
      .put<unknown>(`/poll/share/resource/${id}`, body, {
        headers: { "Content-Type": "application/json" },
      }),
  remove: (id: string) => odeServices.http().delete<unknown>(`/poll/${id}`),
  /** Image du sondage : le fichier est déposé dans l'espace documentaire (miniatures comprises), le sondage garde son adresse. */
  uploadImage: async (file: File): Promise<string> => {
    const xsrf = decodeURIComponent(
      /(?:^|; )XSRF-TOKEN=([^;]*)/.exec(document.cookie)?.[1] ?? "",
    );
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      "/workspace/document?protected=false&application=media-library&quality=1&thumbnail=120x120&thumbnail=290x290",
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-XSRF-TOKEN": xsrf },
        body: form,
      },
    );
    if (!res.ok) throw new Error("image");
    return `/workspace/document/${((await res.json()) as { _id: string })._id}`;
  },
  /** Identité de l'utilisateur : son identifiant et ceux de ses groupes (pour calculer ses droits sur les partages). */
  me: async () => {
    const u = await odeServices
      .http()
      .get<{ userId: string; groupsIds?: string[] }>("/auth/oauth2/userinfo");
    return { userId: u.userId, groupIds: u.groupsIds ?? [] };
  },
};

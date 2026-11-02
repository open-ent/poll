import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Poll, withRights } from "../lib/polls";
import { pollService } from "./poll.service";

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: pollService.me, staleTime: Infinity });
export const useUserId = () => {
  const me = useMe();
  return { ...me, data: me.data?.userId };
};

/** Les sondages avec les droits de l'utilisateur déjà calculés (`myRights`). */
export const usePolls = () => {
  const list = useQuery({ queryKey: ["polls"], queryFn: pollService.list });
  const me = useMe();
  const data = useMemo<Poll[] | undefined>(
    () =>
      list.data && me.data
        ? withRights(list.data, me.data.userId, me.data.groupIds)
        : undefined,
    [list.data, me.data],
  );
  return { ...list, data, isLoading: list.isLoading || me.isLoading };
};

import { collection, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { toUser, type AppUser } from "@/lib/users";

interface State {
  users: AppUser[];
  loading: boolean;
  error: Error | null;
}

export const useUsers = () => {
  const [state, setState] = useState<State>({
    users: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (snapshot) =>
          setState({
            users: snapshot.docs
              .flatMap((d) => {
                const user = toUser(
                  d.id,
                  d.data({ serverTimestamps: "estimate" }),
                );
                return user ? [user] : [];
              })
              .sort(
                (a, b) =>
                  a.createdAt.toMillis() - b.createdAt.toMillis() ||
                  a.name.localeCompare(b.name),
              ),
            loading: false,
            error: null,
          }),
        (error) => setState((s) => ({ ...s, loading: false, error })),
      ),
    [attempt],
  );

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
};

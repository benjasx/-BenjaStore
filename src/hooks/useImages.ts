import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

export interface ImageDoc {
  data: string;
}

export type ImageMap = Record<string, string>;

export const useImages = () => {
  const [images, setImages] = useState<ImageMap>({});
  const [error, setError] = useState<Error | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "images"),
        (snapshot) => {
          const next: ImageMap = {};
          for (const d of snapshot.docs) {
            const { data } = d.data() as Partial<ImageDoc>;
            if (typeof data === "string") next[d.id] = data;
          }
          setImages(next);
          setError(null);
        },
        setError,
      ),
    [],
  );

  return { images, error };
};

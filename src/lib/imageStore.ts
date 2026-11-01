import {
  deleteField,
  doc,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import type { ImageMap } from "@/hooks/useImages";
import { db } from "@/lib/firebase";
import { reencode } from "@/lib/image";

export const saveImage = (
  batch: WriteBatch,
  ownerId: string,
  data: string | undefined,
) => {
  const ref = doc(db, "images", ownerId);
  if (data) batch.set(ref, { data });
  else batch.delete(ref);
};

export interface LegacyImage {
  id: string;
  collection: "products" | "combos";
  image: string;
}

export const migrateImages = async (
  items: LegacyImage[],
  onProgress: (done: number, total: number) => void,
  existing: ImageMap = {},
): Promise<number> => {
  let done = 0;
  onProgress(0, items.length);
  for (const item of items) {
    const batch = writeBatch(db);
    if (!existing[item.id]) {
      saveImage(batch, item.id, await reencode(item.image));
    }
    batch.update(doc(db, item.collection, item.id), { image: deleteField() });
    await batch.commit();
    done += 1;
    onProgress(done, items.length);
  }
  return done;
};

import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { db } from "@/lib/firebase";
import { saveImage } from "@/lib/imageStore";
import { normalizeName } from "@/lib/text";

interface State {
  products: Product[];
  loading: boolean;
  error: Error | null;
}

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);

export const useProducts = () => {
  const [state, setState] = useState<State>({
    products: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "products"),
        (snapshot) =>
          setState({
            products: snapshot.docs
              .map((d) => ({ ...(d.data() as Omit<Product, "id">), id: d.id }))
              .sort(byName),
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

  const addProduct = async (product: Omit<Product, "id">) => {
    const { image, ...data } = product;
    const ref = doc(collection(db, "products"));
    const batch = writeBatch(db);
    batch.set(ref, { ...data, name: normalizeName(product.name) });
    if (image) saveImage(batch, ref.id, image);
    await batch.commit();
  };

  const setSoldOut = (id: string, soldOut: boolean) =>
    updateDoc(doc(db, "products", id), { soldOut });

  const updateProduct = async (
    id: string,
    changes: {
      name: string;
      price: number;
      description: string;
      image?: string;
      usesSauces?: boolean;
    },
  ) => {
    const name = normalizeName(changes.name);
    const description = changes.description.trim();
    if (!name || !(changes.price >= 0)) return;
    const ref = doc(db, "products", id);
    const batch = writeBatch(db);
    batch.update(ref, {
      name,
      price: changes.price,
      description: description || deleteField(),
      image: deleteField(),
      usesSauces: changes.usesSauces || deleteField(),
    });
    saveImage(batch, id, changes.image);
    await batch.commit();
  };

  const deleteProduct = async (id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "products", id));
    saveImage(batch, id, undefined);
    await batch.commit();
  };

  return {
    ...state,
    retry,
    addProduct,
    setSoldOut,
    updateProduct,
    deleteProduct,
  };
};

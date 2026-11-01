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

export interface ComboItem {
  productId: string;
  qty: number;
}

export interface Combo {
  id: string;
  name: string;
  price: number;
  items: ComboItem[];
  enabled: boolean;
  description?: string;
  image?: string;
  sauceCount?: number;
}

export interface ComboInput {
  name: string;
  price: number;
  items: ComboItem[];
  description: string;
  image?: string;
  sauceCount?: number;
}

export const isComboSoldOut = (combo: Combo, products: Product[]) =>
  combo.items.some((i) => {
    const product = products.find((p) => p.id === i.productId);
    return !product || !!product.soldOut;
  });

export const comboContents = (combo: Combo, products: Product[]) =>
  combo.items.length === 0
    ? (combo.description ?? "")
    : combo.items
        .map((i) => {
          const product = products.find((p) => p.id === i.productId);
          return `${i.qty}× ${product?.name ?? "producto eliminado"}`;
        })
        .join(", ");

interface State {
  combos: Combo[];
  loading: boolean;
  error: Error | null;
}

const byName = (a: Combo, b: Combo) => a.name.localeCompare(b.name);

const isValid = (name: string, input: ComboInput) =>
  !!name &&
  input.price >= 0 &&
  !!input.description.trim() &&
  (input.sauceCount === undefined ||
    (Number.isInteger(input.sauceCount) &&
      input.sauceCount >= 0 &&
      input.sauceCount <= 3)) &&
  input.items.every((i) => Number.isInteger(i.qty) && i.qty >= 1);

export const useCombos = () => {
  const [state, setState] = useState<State>({
    combos: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "combos"),
        (snapshot) =>
          setState({
            combos: snapshot.docs
              .map((d) => ({ ...(d.data() as Omit<Combo, "id">), id: d.id }))
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

  const createCombo = async (input: ComboInput) => {
    const name = normalizeName(input.name);
    if (!isValid(name, input)) return;
    const description = input.description.trim();
    const ref = doc(collection(db, "combos"));
    const batch = writeBatch(db);
    batch.set(ref, {
      name,
      price: input.price,
      items: input.items,
      enabled: true,
      ...(description && { description }),
      ...(input.sauceCount && { sauceCount: input.sauceCount }),
    });
    if (input.image) saveImage(batch, ref.id, input.image);
    await batch.commit();
  };

  const updateCombo = async (id: string, changes: ComboInput) => {
    const name = normalizeName(changes.name);
    if (!isValid(name, changes)) return;
    const description = changes.description.trim();
    const batch = writeBatch(db);
    batch.update(doc(db, "combos", id), {
      name,
      price: changes.price,
      items: changes.items,
      description: description || deleteField(),
      image: deleteField(),
      sauceCount: changes.sauceCount || deleteField(),
    });
    saveImage(batch, id, changes.image);
    await batch.commit();
  };

  const deleteCombo = async (id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "combos", id));
    saveImage(batch, id, undefined);
    await batch.commit();
  };

  const setComboEnabled = (id: string, enabled: boolean) =>
    updateDoc(doc(db, "combos", id), { enabled });

  return {
    ...state,
    retry,
    createCombo,
    updateCombo,
    deleteCombo,
    setComboEnabled,
  };
};

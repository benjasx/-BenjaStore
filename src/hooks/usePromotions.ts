import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type { Discount, Promotion, PromotionTarget } from "@/lib/pricing";
import { normalizeName } from "@/lib/text";

export type { Discount, Promotion, PromotionTarget };

export type PromotionInput = { name: string } & (
  | { scope: "item"; target: PromotionTarget; discount: Discount }
  | {
      scope: "sale";
      discount: Exclude<Discount, { type: "bundle" }>;
      minSubtotal?: number;
    }
);

interface State {
  promotions: Promotion[];
  loading: boolean;
  error: Error | null;
}

const byName = (a: Promotion, b: Promotion) => a.name.localeCompare(b.name);

const isValidDiscount = (d: Discount) => {
  switch (d.type) {
    case "percent":
      return d.value >= 1 && d.value <= 100;
    case "amount":
      return d.value > 0;
    case "bundle":
      return (
        Number.isInteger(d.buy) &&
        Number.isInteger(d.pay) &&
        d.pay >= 1 &&
        d.buy > d.pay
      );
  }
};

const isValid = (name: string, input: PromotionInput) =>
  !!name &&
  isValidDiscount(input.discount) &&
  (input.scope === "item"
    ? !!input.target.id
    : input.minSubtotal === undefined || input.minSubtotal >= 0);

export const usePromotions = () => {
  const [state, setState] = useState<State>({
    promotions: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "promotions"),
        (snapshot) =>
          setState({
            promotions: snapshot.docs
              .map((d) => ({ ...d.data(), id: d.id }) as Promotion)
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

  const createPromotion = async (input: PromotionInput) => {
    const name = normalizeName(input.name);
    if (!isValid(name, input)) return;
    await addDoc(collection(db, "promotions"), {
      name,
      enabled: true,
      scope: input.scope,
      discount: input.discount,
      ...(input.scope === "item"
        ? { target: input.target }
        : input.minSubtotal !== undefined && {
            minSubtotal: input.minSubtotal,
          }),
    });
  };

  const updatePromotion = async (id: string, changes: PromotionInput) => {
    const name = normalizeName(changes.name);
    if (!isValid(name, changes)) return;
    await updateDoc(doc(db, "promotions", id), {
      name,
      scope: changes.scope,
      discount: changes.discount,
      target: changes.scope === "item" ? changes.target : deleteField(),
      minSubtotal:
        changes.scope === "sale" && changes.minSubtotal !== undefined
          ? changes.minSubtotal
          : deleteField(),
    });
  };

  const deletePromotion = (id: string) => deleteDoc(doc(db, "promotions", id));

  const setPromotionEnabled = (id: string, enabled: boolean) =>
    updateDoc(doc(db, "promotions", id), { enabled });

  return {
    ...state,
    retry,
    createPromotion,
    updatePromotion,
    deletePromotion,
    setPromotionEnabled,
  };
};

import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  DEFAULT_ADVERTISING,
  parseAdvertising,
  validateBrand,
  type AdvertisingConfig,
} from "@/lib/advertising";

interface State {
  config: AdvertisingConfig;
  loading: boolean;
  error: Error | null;
}

export const useAdvertising = () => {
  const [state, setState] = useState<State>({
    config: DEFAULT_ADVERTISING,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        doc(db, "settings", "advertising"),
        (snapshot) =>
          setState({
            config: parseAdvertising(snapshot.data()),
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

  const save = async (config: AdvertisingConfig) => {
    const invalid = validateBrand(config.brand);
    if (invalid) throw new Error(invalid);
    const { brand } = config;
    await setDoc(doc(db, "settings", "advertising"), {
      brand: {
        name: brand.name.trim(),
        phone: brand.phone.trim(),
        address: brand.address.trim(),
        promoTitle: brand.promoTitle.trim(),
      },
      promoComboIds: config.promoComboIds,
      menuProductIds: config.menuProductIds,
      productBannerId: config.productBannerId ?? null,
    });
  };

  return { ...state, retry, save };
};

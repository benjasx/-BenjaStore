import { CartPanel } from "@/components/CartPanel";
import { Screen } from "@/components/Screen";
import type { Product } from "@/data/mock";
import type { Combo } from "@/hooks/useCombos";
import type { Promotion } from "@/hooks/usePromotions";

interface Props {
  products: Product[];
  combos: Combo[];
  promotions: Promotion[];
  cart: Record<string, number>;
  onChangeQty: (id: string, delta: number) => void;
  onClear: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

export const CartScreen = (props: Props) => (
  <Screen className="relative h-dvh overflow-hidden">
    <CartPanel {...props} />
  </Screen>
);

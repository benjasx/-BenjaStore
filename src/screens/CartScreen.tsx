import { CartPanel } from "@/components/CartPanel";
import { Screen } from "@/components/Screen";
import type { Product } from "@/data/mock";
import type { Combo } from "@/hooks/useCombos";
import type { Promotion } from "@/hooks/usePromotions";
import type { Sauce } from "@/hooks/useSauces";
import type { SaleData } from "@/lib/sales";

interface Props {
  products: Product[];
  combos: Combo[];
  promotions: Promotion[];
  sauces: Sauce[];
  cart: Record<string, number>;
  onChangeQty: (id: string, delta: number) => void;
  onClear: () => void;
  onBack: () => void;
  onConfirm: (sale: SaleData) => Promise<void>;
}

export const CartScreen = (props: Props) => (
  <Screen className="relative h-dvh overflow-hidden">
    <CartPanel {...props} />
  </Screen>
);

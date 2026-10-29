import { CartPanel } from "@/components/CartPanel";
import { Screen } from "@/components/Screen";
import type { Product } from "@/data/mock";

interface Props {
  products: Product[];
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

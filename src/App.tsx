import { useState } from "react";
import type { NavTab } from "@/components/BottomNav";
import { products as seedProducts, type Product } from "@/data/mock";
import { CartScreen } from "@/screens/CartScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { MenuAdminScreen } from "@/screens/MenuAdminScreen";
import { MoreScreen } from "@/screens/MoreScreen";
import { PinScreen } from "@/screens/PinScreen";
import { PosScreen } from "@/screens/PosScreen";
import { ProductFormScreen } from "@/screens/ProductFormScreen";
import { ReportsScreen } from "@/screens/ReportsScreen";
import { ShiftCloseScreen } from "@/screens/ShiftCloseScreen";

type View =
  | "login"
  | "pin"
  | "pos"
  | "cart"
  | "reports"
  | "more"
  | "menu"
  | "product-new"
  | "shift";

const tabView: Partial<Record<NavTab, View>> = {
  pos: "pos",
  reports: "reports",
  more: "more",
};

export const App = () => {
  const [view, setView] = useState<View>("login");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[]>(seedProducts);

  const addProduct = (product: Omit<Product, "id">) => {
    setProducts((list) => [...list, { ...product, id: crypto.randomUUID() }]);
    setView("menu");
  };

  const setSoldOut = (id: string, soldOut: boolean) =>
    setProducts((list) =>
      list.map((p) => (p.id === id ? { ...p, soldOut } : p)),
    );

  const changeQty = (id: string, delta: number) =>
    setCart((c) => {
      const qty = (c[id] ?? 0) + delta;
      const next = { ...c, [id]: qty };
      if (qty <= 0) delete next[id];
      return next;
    });

  const navigate = (tab: NavTab) => {
    const next = tabView[tab];
    if (next) setView(next);
  };

  switch (view) {
    case "login":
      return (
        <LoginScreen
          onLogin={() => setView("more")}
          onPin={() => setView("pin")}
        />
      );
    case "pin":
      return (
        <PinScreen
          onSuccess={() => setView("pos")}
          onAdmin={() => setView("login")}
        />
      );
    case "pos":
      return (
        <PosScreen
          products={products}
          cart={cart}
          onAdd={(id) => changeQty(id, 1)}
          onCheckout={() => setView("cart")}
          onNavigate={navigate}
        />
      );
    case "cart":
      return (
        <CartScreen
          products={products}
          cart={cart}
          onChangeQty={changeQty}
          onClear={() => setCart({})}
          onBack={() => setView("pos")}
          onConfirm={() => {
            setCart({});
            setView("pos");
          }}
        />
      );
    case "reports":
      return <ReportsScreen onNavigate={navigate} />;
    case "more":
      return (
        <MoreScreen
          onNavigate={navigate}
          onMenu={() => setView("menu")}
          onShiftClose={() => setView("shift")}
          onSwitchUser={() => setView("pin")}
          onLogout={() => setView("login")}
        />
      );
    case "menu":
      return (
        <MenuAdminScreen
          products={products}
          onToggleSoldOut={setSoldOut}
          onAddProduct={() => setView("product-new")}
          onBack={() => setView("more")}
          onNavigate={navigate}
        />
      );
    case "product-new":
      return (
        <ProductFormScreen onSave={addProduct} onBack={() => setView("menu")} />
      );
    case "shift":
      return (
        <ShiftCloseScreen
          onBack={() => setView("more")}
          onClose={() => setView("login")}
        />
      );
  }
};

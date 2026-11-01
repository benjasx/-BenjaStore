import { useState } from "react";
import type { NavTab } from "@/components/BottomNav";
import type { Product, User } from "@/data/mock";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useCategories } from "@/hooks/useCategories";
import { useCombos } from "@/hooks/useCombos";
import { useProducts } from "@/hooks/useProducts";
import { usePromotions } from "@/hooks/usePromotions";
import { useSauces } from "@/hooks/useSauces";
import { createSale, type Sale, type SaleData } from "@/lib/sales";
import { TicketSheet } from "@/components/TicketSheet";
import { CartScreen } from "@/screens/CartScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { MenuAdminScreen } from "@/screens/MenuAdminScreen";
import { MoreScreen } from "@/screens/MoreScreen";
import { PinScreen } from "@/screens/PinScreen";
import { PosScreen } from "@/screens/PosScreen";
import { ProductFormScreen } from "@/screens/ProductFormScreen";
import { ReportsScreen } from "@/screens/ReportsScreen";
import { SalesScreen } from "@/screens/SalesScreen";
import { ShiftCloseScreen } from "@/screens/ShiftCloseScreen";

type View =
  | "login"
  | "pin"
  | "pos"
  | "cart"
  | "reports"
  | "sales"
  | "more"
  | "menu"
  | "product-new"
  | "shift";

const tabView: Partial<Record<NavTab, View>> = {
  pos: "pos",
  reports: "reports",
  sales: "sales",
  more: "more",
};

export const App = () => {
  const [view, setView] = useState<View>("login");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ticket, setTicket] = useState<Sale | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [shiftStart, setShiftStart] = useState<Date | null>(null);
  const {
    products,
    loading: productsLoading,
    error: productsError,
    retry: retryProducts,
    addProduct: saveProduct,
    setSoldOut,
    updateProduct,
    deleteProduct,
  } = useProducts();

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    retry: retryCategories,
    createCategory,
    renameCategory,
    setCategoryEnabled,
    moveCategory,
  } = useCategories();

  const {
    combos,
    loading: combosLoading,
    error: combosError,
    retry: retryCombos,
    createCombo,
    updateCombo,
    deleteCombo,
    setComboEnabled,
  } = useCombos();

  const {
    promotions,
    loading: promotionsLoading,
    error: promotionsError,
    retry: retryPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    setPromotionEnabled,
  } = usePromotions();

  const {
    sauces,
    loading: saucesLoading,
    error: saucesError,
    retry: retrySauces,
    createSauce,
    updateSauce,
    deleteSauce,
    setSauceEnabled,
  } = useSauces();

  const loading =
    productsLoading ||
    categoriesLoading ||
    combosLoading ||
    promotionsLoading ||
    saucesLoading;
  const error =
    productsError ??
    categoriesError ??
    combosError ??
    promotionsError ??
    saucesError;
  const retry = () => {
    retryProducts();
    retryCategories();
    retryCombos();
    retryPromotions();
    retrySauces();
  };

  const addProduct = (product: Omit<Product, "id">) => {
    saveProduct(product).catch(console.error);
    setView("menu");
  };

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

  const confirmSale = async (data: SaleData) => {
    const sale = await createSale({
      ...data,
      ...(seller && { seller: { id: seller.id, name: seller.name } }),
    });
    setCart({});
    setView("pos");
    setTicket(sale);
  };

  const desktop = useIsDesktop();

  const renderView = () => {
    switch (view === "cart" && desktop ? "pos" : view) {
      case "login":
        return (
          <LoginScreen
            onLogin={() => {
              setSeller(null);
              setShiftStart(null);
              setView("more");
            }}
            onPin={() => setView("pin")}
          />
        );
      case "pin":
        return (
          <PinScreen
            onSuccess={(user) => {
              setSeller(user);
              setShiftStart(new Date());
              setView("pos");
            }}
            onAdmin={() => setView("login")}
          />
        );
      case "pos":
        return (
          <PosScreen
            products={products}
            categories={categories}
            combos={combos}
            promotions={promotions}
            sauces={sauces}
            loading={loading}
            error={error}
            onRetry={retry}
            cart={cart}
            onAdd={(id) => changeQty(id, 1)}
            onChangeQty={changeQty}
            onClear={() => setCart({})}
            onConfirm={confirmSale}
            seller={seller}
            shiftStart={shiftStart}
            onCheckout={() => setView("cart")}
            onNavigate={navigate}
          />
        );
      case "cart":
        return (
          <CartScreen
            products={products}
            combos={combos}
            promotions={promotions}
            sauces={sauces}
            cart={cart}
            onChangeQty={changeQty}
            onClear={() => setCart({})}
            onBack={() => setView("pos")}
            onConfirm={confirmSale}
          />
        );
      case "reports":
        return <ReportsScreen onNavigate={navigate} />;
      case "sales":
        return <SalesScreen seller={seller} onNavigate={navigate} />;
      case "more":
        return (
          <MoreScreen
            productCount={productsLoading ? null : products.length}
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
            categories={categories}
            sauces={sauces}
            onCreateSauce={(input) => createSauce(input).catch(console.error)}
            onUpdateSauce={(id, input) =>
              updateSauce(id, input).catch(console.error)
            }
            onDeleteSauce={(id) => deleteSauce(id).catch(console.error)}
            onToggleSauce={(id, enabled) =>
              setSauceEnabled(id, enabled).catch(console.error)
            }
            combos={combos}
            onCreateCombo={(input) => createCombo(input).catch(console.error)}
            onUpdateCombo={(id, input) =>
              updateCombo(id, input).catch(console.error)
            }
            onDeleteCombo={(id) => deleteCombo(id).catch(console.error)}
            onToggleCombo={(id, enabled) =>
              setComboEnabled(id, enabled).catch(console.error)
            }
            promotions={promotions}
            onCreatePromotion={(input) =>
              createPromotion(input).catch(console.error)
            }
            onUpdatePromotion={(id, input) =>
              updatePromotion(id, input).catch(console.error)
            }
            onDeletePromotion={(id) => deletePromotion(id).catch(console.error)}
            onTogglePromotion={(id, enabled) =>
              setPromotionEnabled(id, enabled).catch(console.error)
            }
            onCreateCategory={(name) =>
              createCategory(name).catch(console.error)
            }
            onRenameCategory={(id, name) =>
              renameCategory(id, name).catch(console.error)
            }
            onToggleCategory={(id, enabled) =>
              setCategoryEnabled(id, enabled).catch(console.error)
            }
            onMoveCategory={(id, direction) =>
              moveCategory(id, direction).catch(console.error)
            }
            loading={loading}
            error={error}
            onRetry={retry}
            onToggleSoldOut={setSoldOut}
            onDeleteProduct={(id) => deleteProduct(id).catch(console.error)}
            onUpdateProduct={(id, changes) =>
              updateProduct(id, changes).catch(console.error)
            }
            onAddProduct={() => setView("product-new")}
            onBack={() => setView("more")}
            onNavigate={navigate}
          />
        );
      case "product-new":
        return (
          <ProductFormScreen
            categories={categories}
            onSave={addProduct}
            onBack={() => setView("menu")}
          />
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

  return (
    <>
      {renderView()}
      {ticket && <TicketSheet sale={ticket} onClose={() => setTicket(null)} />}
    </>
  );
};

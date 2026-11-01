import { lazy, Suspense, useState } from "react";
import type { NavTab } from "@/components/BottomNav";
import type { Product, User } from "@/data/mock";
import { useImages } from "@/hooks/useImages";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useCategories } from "@/hooks/useCategories";
import { useCombos } from "@/hooks/useCombos";
import { useProducts } from "@/hooks/useProducts";
import { usePromotions } from "@/hooks/usePromotions";
import { useSauces } from "@/hooks/useSauces";
import { createSale, type Sale, type SaleData } from "@/lib/sales";
import { findOpenShift, openShift, type Shift } from "@/lib/shifts";
import { OpenShiftSheet } from "@/components/OpenShiftSheet";
import { TicketSheet } from "@/components/TicketSheet";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { CartScreen } from "@/screens/CartScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { MoreScreen } from "@/screens/MoreScreen";
import { PinScreen } from "@/screens/PinScreen";
import { PosScreen } from "@/screens/PosScreen";

const MenuAdminScreen = lazy(() =>
  import("@/screens/MenuAdminScreen").then((m) => ({
    default: m.MenuAdminScreen,
  })),
);
const ProductFormScreen = lazy(() =>
  import("@/screens/ProductFormScreen").then((m) => ({
    default: m.ProductFormScreen,
  })),
);
const ReportsScreen = lazy(() =>
  import("@/screens/ReportsScreen").then((m) => ({ default: m.ReportsScreen })),
);
const SalesScreen = lazy(() =>
  import("@/screens/SalesScreen").then((m) => ({ default: m.SalesScreen })),
);
const ShiftCloseScreen = lazy(() =>
  import("@/screens/ShiftCloseScreen").then((m) => ({
    default: m.ShiftCloseScreen,
  })),
);

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
  const [shift, setShift] = useState<Shift | null>(null);
  const [pendingSeller, setPendingSeller] = useState<User | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinKey, setPinKey] = useState(0);
  const [shiftBack, setShiftBack] = useState<View>("more");
  const [openWithdrawal, setOpenWithdrawal] = useState(false);
  const [afterShift, setAfterShift] = useState<"pin" | "login">("login");
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

  const { images } = useImages();

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

  const startShift = (user: User, active: Shift) => {
    setSeller(user);
    setShift(active);
    setPendingSeller(null);
    setView("pos");
  };

  const handlePin = async (user: User) => {
    setPinError(null);
    try {
      const open = await findOpenShift(user.id);
      if (open) startShift(user, open);
      else setPendingSeller(user);
    } catch (e) {
      console.error(e);
      setPinError("No se pudo revisar el turno. Intenta de nuevo.");
      setPinKey((k) => k + 1);
    }
  };

  const goToCut = (next: "pin" | "login") => {
    if (!shift) {
      setView(next);
      return;
    }
    setAfterShift(next);
    setShiftBack("more");
    setOpenWithdrawal(false);
    setView("shift");
  };

  const cancelOpenShift = () => {
    setPendingSeller(null);
    setPinKey((k) => k + 1);
  };

  const confirmSale = async (data: SaleData) => {
    if (!shift) throw new Error("Abre un turno para cobrar.");
    const sale = await createSale({
      ...data,
      shiftId: shift.id,
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
              setShift(null);
              setView("more");
            }}
            onPin={() => setView("pin")}
          />
        );
      case "pin":
        return (
          <>
            <PinScreen
              key={pinKey}
              onSuccess={handlePin}
              onAdmin={() => setView("login")}
              error={pinError}
            />
            {pendingSeller && (
              <OpenShiftSheet
                sellerName={pendingSeller.name}
                onClose={cancelOpenShift}
                onConfirm={async (openingFloat) =>
                  startShift(
                    pendingSeller,
                    await openShift(
                      { id: pendingSeller.id, name: pendingSeller.name },
                      openingFloat,
                    ),
                  )
                }
              />
            )}
          </>
        );
      case "pos":
        return (
          <PosScreen
            products={products}
            categories={categories}
            combos={combos}
            promotions={promotions}
            sauces={sauces}
            images={images}
            loading={loading}
            error={error}
            onRetry={retry}
            cart={cart}
            onAdd={(id) => changeQty(id, 1)}
            onChangeQty={changeQty}
            onClear={() => setCart({})}
            onConfirm={confirmSale}
            seller={seller}
            shiftStart={shift?.openedAt.toDate() ?? null}
            onWithdraw={() => {
              setShiftBack("pos");
              setOpenWithdrawal(true);
              setView("shift");
            }}
            onCloseShift={() => {
              setAfterShift("login");
              setShiftBack("pos");
              setOpenWithdrawal(false);
              setView("shift");
            }}
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
            onShiftClose={() => {
              setShiftBack("more");
              setOpenWithdrawal(false);
              setAfterShift("login");
              setView("shift");
            }}
            onSwitchUser={() => goToCut("pin")}
            onLogout={() => goToCut("login")}
          />
        );
      case "menu":
        return (
          <MenuAdminScreen
            products={products}
            categories={categories}
            sauces={sauces}
            images={images}
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
            shift={shift}
            startWithdrawing={openWithdrawal}
            onWithdrawal={(w) =>
              setShift((s) =>
                s ? { ...s, withdrawals: [...s.withdrawals, w] } : s,
              )
            }
            onBack={() => setView(shiftBack)}
            onExit={() => {
              setShift(null);
              setSeller(null);
              setView(afterShift);
            }}
          />
        );
    }
  };

  return (
    <>
      <Suspense
        fallback={
          <div className="bg-ink grid min-h-dvh place-items-center">
            <p className="text-muted text-[15px]">Cargando…</p>
          </div>
        }
      >
        {renderView()}
      </Suspense>
      <UpdatePrompt />
      {ticket && <TicketSheet sale={ticket} onClose={() => setTicket(null)} />}
    </>
  );
};

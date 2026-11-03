import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { NavTab } from "@/components/BottomNav";
import type { Product } from "@/data/mock";
import { useImages } from "@/hooks/useImages";
import { RoleContext } from "@/hooks/useRole";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useCategories } from "@/hooks/useCategories";
import { useCombos } from "@/hooks/useCombos";
import { useProducts } from "@/hooks/useProducts";
import { usePromotions } from "@/hooks/usePromotions";
import { useSauces } from "@/hooks/useSauces";
import { useUsers } from "@/hooks/useUsers";
import {
  createUser,
  deleteUser,
  setUserActive,
  updateUser,
  type AppUser,
  type NewUserInput,
  type UserChanges,
} from "@/lib/users";
import { createSale, type Sale, type SaleData } from "@/lib/sales";
import { homeView, allowedViews, type View } from "@/lib/permissions";
import { hashToView, restorable, viewToHash } from "@/lib/route";
import { clearSession, loadSession, saveSession } from "@/lib/session";
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
const CutsScreen = lazy(() =>
  import("@/screens/CutsScreen").then((m) => ({ default: m.CutsScreen })),
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

const tabView: Partial<Record<NavTab, View>> = {
  pos: "pos",
  reports: "reports",
  sales: "sales",
  more: "more",
};

const initialView = (): View => {
  const fromHash = hashToView(window.location.hash);
  return fromHash ? restorable(fromHash) : "login";
};

export const App = () => {
  const [view, setViewState] = useState<View>(initialView);
  const [restoring, setRestoring] = useState(() => loadSession() !== null);
  const setView = useCallback((next: View) => {
    setViewState(next);
    const hash = viewToHash(next);
    if (window.location.hash !== hash) window.location.hash = hash;
  }, []);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ticket, setTicket] = useState<Sale | null>(null);
  const [seller, setSeller] = useState<AppUser | null>(null);
  const [admin, setAdmin] = useState<AppUser | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [pendingSeller, setPendingSeller] = useState<AppUser | null>(null);
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

  const {
    users,
    loading: usersLoading,
    error: usersError,
    retry: retryUsers,
  } = useUsers();
  const sessionUser = seller ?? admin;
  const account = users.find((u) => u.id === sessionUser?.id) ?? sessionUser;
  const seenActive = useRef<string | null>(null);

  const endSession = useCallback(() => {
    clearSession();
    setSeller(null);
    setAdmin(null);
    setShift(null);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = hashToView(window.location.hash);
      if (next) setViewState(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!restoring || usersLoading) return;
    let cancelled = false;
    const finish = (next: View | null) => {
      if (cancelled) return;
      setRestoring(false);
      if (next) setView(next);
    };
    const restore = async () => {
      const session = loadSession();
      if (usersError) return finish("login");
      const user = session
        ? users.find((u) => u.id === session.userId && u.active)
        : undefined;
      if (!session || !user) {
        clearSession();
        return finish("login");
      }
      const open = (next: View) =>
        allowedViews(user.role).includes(next) &&
        next !== "login" &&
        next !== "pin"
          ? next
          : homeView(user.role, session.mode);
      if (session.mode === "admin") {
        if (!user.admin) {
          clearSession();
          return finish("login");
        }
        if (cancelled) return;
        setAdmin(user);
        return finish(open(view));
      }
      try {
        const active = await findOpenShift(user.id);
        if (cancelled) return;
        if (!active) {
          clearSession();
          return finish("pin");
        }
        setSeller(user);
        setShift(active);
        finish(open(view));
      } catch (e) {
        console.error(e);
        clearSession();
        finish("login");
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
    // Se restaura una sola vez, cuando ya cargaron los usuarios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoring, usersLoading]);

  useEffect(() => {
    if (restoring || usersLoading || usersError || !sessionUser) return;
    const live = users.find((u) => u.id === sessionUser.id);
    if (live && live.active) {
      seenActive.current = live.id;
      return;
    }
    // Aún no llega a la lista el usuario recién creado: no es una baja.
    if (seenActive.current !== sessionUser.id) return;
    endSession();
    setView("login");
  }, [
    restoring,
    usersLoading,
    usersError,
    users,
    sessionUser,
    endSession,
    setView,
  ]);

  const guardView = (): View => {
    if (restoring) return view;
    if (!account) return view === "login" || view === "pin" ? view : "login";
    if (view === "login" || view === "pin") return view;
    return allowedViews(account.role).includes(view)
      ? view
      : homeView(account.role, seller ? "pin" : "admin");
  };
  const safeView = guardView();

  useEffect(() => {
    const hash = viewToHash(safeView);
    if (!restoring && window.location.hash !== hash)
      window.history.replaceState(null, "", hash);
  }, [safeView, restoring, view]);

  const startShift = (user: AppUser, active: Shift) => {
    saveSession({ v: 1, userId: user.id, mode: "pin" });
    setAdmin(null);
    setSeller(user);
    setShift(active);
    setPendingSeller(null);
    setView("pos");
  };

  const handlePin = async (user: AppUser) => {
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

  const enterAsAdmin = (user: AppUser) => {
    saveSession({ v: 1, userId: user.id, mode: "admin" });
    setSeller(null);
    setShift(null);
    setAdmin(user);
    setView("more");
  };

  const goToCut = (next: "pin" | "login") => {
    if (!shift) {
      endSession();
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
    switch (safeView === "cart" && desktop ? "pos" : safeView) {
      case "login":
        return (
          <LoginScreen
            users={users}
            loading={usersLoading}
            error={usersError}
            onRetry={retryUsers}
            onAdminLogin={enterAsAdmin}
            onSetupDone={enterAsAdmin}
            onPin={() => setView("pin")}
          />
        );
      case "pin":
        return (
          <>
            <PinScreen
              key={pinKey}
              users={users}
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
            onCuts={() => setView("cuts")}
            onSwitchUser={() => goToCut("pin")}
            onLogout={() => goToCut("login")}
            account={account}
            users={users}
            usersError={usersError}
            onRetryUsers={retryUsers}
            onCreateUser={async (input: NewUserInput) => {
              await createUser(input);
            }}
            onUpdateUser={(id: string, changes: UserChanges) =>
              updateUser(id, changes)
            }
            onSetUserActive={(id, active) =>
              setUserActive(id, active, account?.id)
            }
            onDeleteUser={(id) => deleteUser(id, account?.id)}
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
      case "cuts":
        return <CutsScreen onBack={() => setView("more")} />;
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
              endSession();
              setView(afterShift);
            }}
          />
        );
    }
  };

  return (
    <>
      <RoleContext.Provider value={account?.role ?? "cashier"}>
        <Suspense
          fallback={
            <div className="bg-ink grid min-h-dvh place-items-center">
              <p className="text-muted text-[15px]">Cargando…</p>
            </div>
          }
        >
          {restoring ? (
            <div className="bg-ink grid min-h-dvh place-items-center">
              <p className="text-muted text-[15px]">Cargando…</p>
            </div>
          ) : (
            renderView()
          )}
        </Suspense>
      </RoleContext.Provider>
      <UpdatePrompt />
      {ticket && <TicketSheet sale={ticket} onClose={() => setTicket(null)} />}
    </>
  );
};

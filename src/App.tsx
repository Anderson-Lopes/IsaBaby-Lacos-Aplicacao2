import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, LoaderCircle, Ribbon, ShoppingBag } from 'lucide-react';
import type { CartItem, Product } from '@/types';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { CatalogScreen } from '@/screens/CatalogScreen';
import { NewProductScreen } from '@/screens/NewProductScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { ProductDetails } from '@/components/details/ProductDetails';
import { AuthProvider } from '@/hooks/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { useShopData } from '@/hooks/useShopData';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { AuthScreen } from '@/screens/AuthScreen';
import { ChangePasswordScreen } from '@/screens/ChangePasswordScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { AdminScreen } from '@/screens/AdminScreen';
import { CartScreen } from '@/screens/CartScreen';

export type Screen = 'catalog' | 'newProduct' | 'orders' | 'admin' | 'account' | 'auth' | 'cart';

function ConfigurationNotice() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <section className="max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <h1 className="font-display text-xl font-semibold text-primary">Configure a conexão Supabase</h1>
        <p className="mt-2 text-sm text-muted">
          Crie um arquivo <code>.env.local</code> na raiz e informe `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
          As etapas estão documentadas no manual. Nunca use a chave `service_role` no navegador.
        </p>
      </section>
    </main>
  );
}

function ShopApplication() {
  const auth = useAuth();
  const isAdmin = auth.profile?.role === 'admin';
  const shop = useShopData(auth.user?.id ?? null, isAdmin);
  const [screen, setScreen] = useState<Screen>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | undefined>();
  const [passwordChangeRequested, setPasswordChangeRequested] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeout = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeout.current !== null) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => {
      setToast(null);
      toastTimeout.current = null;
    }, 3500);
  }, []);

  useEffect(() => () => {
    if (toastTimeout.current !== null) window.clearTimeout(toastTimeout.current);
  }, []);

  useEffect(() => {
    const paymentResult = new URLSearchParams(window.location.search).get('payment');
    if (paymentResult === 'success') showToast('O provedor confirmou o retorno do pagamento. O status será atualizado pelo webhook.');
    if (paymentResult === 'pending') showToast('Pagamento pendente. Consulte o pedido após a confirmação do provedor.');
    if (paymentResult === 'failure') showToast('O pagamento não foi aprovado.');
    if (paymentResult) {
      window.history.replaceState({}, '', window.location.pathname);
      setScreen('orders');
    }
  }, [showToast]);

  const selectedProduct = selectedProductId
    ? shop.products.find((product) => product.id === selectedProductId) ?? null
    : null;

  const handleAddToOrder = async (item: CartItem) => {
    if (!auth.user) {
      setScreen('auth');
      showToast('Entre ou crie uma conta para adicionar produtos ao carrinho.');
      return;
    }
    try {
      await shop.addToCart({
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        notes: item.notes,
      });
      showToast(`${item.productName} adicionado ao carrinho.`);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Não foi possível adicionar ao carrinho.');
    }
  };

  const handleSaveProduct = async (
    data: Parameters<typeof shop.saveProduct>[0],
    files: File[],
    productId?: string,
    primaryImageRef?: string,
    removedImageIds?: string[],
  ) => {
    await shop.saveProduct(data, files, productId, primaryImageRef, removedImageIds);
    setProductToEdit(undefined);
    setScreen('admin');
    showToast(`${data.name} salvo com sucesso.`);
  };

  const handleCheckout = async (addressId: string) => {
    const checkoutUrl = await shop.createPayment(addressId);
    window.location.assign(checkoutUrl);
  };

  const handleSchedule = async (orderId: string, date: string, time: string) => {
    await shop.requestPickup(orderId, date, time);
    showToast('Retirada agendada para o pedido.');
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setScreen('catalog');
      setSelectedProductId(null);
      showToast('Você saiu da sua conta.');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Não foi possível sair da conta.');
    }
  };

  if (auth.loading || shop.loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-secondary">
        <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />
        <span className="ml-2 text-sm">Carregando loja...</span>
      </main>
    );
  }

  if (auth.user && !auth.profile) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <section className="max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold text-primary">Não foi possível carregar o perfil</h1>
          <p role="alert" className="mt-2 text-sm text-muted">{auth.error ?? 'O perfil do usuário não existe. Verifique a migration de signup.'}</p>
          <button type="button" onClick={() => void signOut()} className="mt-4 text-sm text-secondary underline">Sair</button>
        </section>
      </main>
    );
  }

  if (auth.profile?.accountStatus === 'suspended') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <section className="max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
          <h1 className="font-display text-xl font-semibold text-primary">Conta suspensa</h1>
          <p className="mt-2 text-sm text-muted">Entre em contato com a loja para obter ajuda.</p>
          <button type="button" onClick={() => void signOut()} className="mt-4 text-sm text-secondary underline">Sair</button>
        </section>
      </main>
    );
  }

  if (auth.profile?.mustChangePassword || auth.passwordRecovery || passwordChangeRequested) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <ChangePasswordScreen
          onChangePassword={auth.changePassword}
          onSignOut={signOut}
          onComplete={() => {
            setPasswordChangeRequested(false);
            setScreen('account');
            showToast('Senha atualizada com sucesso.');
          }}
        />
      </main>
    );
  }

  const cartCount = shop.cart.reduce((sum, item) => sum + item.quantity, 0);
  const showDetails = screen === 'catalog' && selectedProduct !== null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        profile={auth.profile}
        cartCount={cartCount}
        onNewProduct={() => {
          if (isAdmin) {
            setProductToEdit(undefined);
            setScreen('newProduct');
          }
        }}
        onSignIn={() => setScreen('auth')}
        onAccount={() => setScreen(auth.user ? 'account' : 'auth')}
        onAdmin={() => setScreen('admin')}
        onCart={() => setScreen(auth.user ? 'cart' : 'auth')}
        onSignOut={() => void signOut()}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-24">
        {shop.error && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-surface p-3 text-sm text-primary">
            <span>{shop.error}</span>
            <button type="button" onClick={() => void shop.reload().catch(() => undefined)} className="underline">Tentar novamente</button>
          </div>
        )}
        {showDetails ? (
          <ProductDetails
            product={selectedProduct}
            onAddToOrder={handleAddToOrder}
            onBack={() => setSelectedProductId(null)}
          />
        ) : screen === 'catalog' ? (
          <CatalogScreen productCount={shop.products.length}>
            <ProductGrid
              products={shop.products.filter((product) => product.isActive)}
              onSelect={(product) => setSelectedProductId(product.id)}
              onNewProduct={isAdmin ? () => {
                setProductToEdit(undefined);
                setScreen('newProduct');
              } : undefined}
            />
            {auth.user && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setScreen('cart')}
                  disabled={!shop.cart.length}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-background transition-colors hover:bg-secondary/85 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  Ver carrinho ({cartCount})
                </button>
              </div>
            )}
          </CatalogScreen>
        ) : screen === 'auth' ? (
          <AuthScreen onBack={() => setScreen('catalog')} />
        ) : screen === 'account' && auth.profile ? (
          <AccountScreen
            profile={auth.profile}
            addresses={shop.addresses}
            onUpdateProfile={auth.updateProfile}
            onSaveAddress={shop.saveAddress}
            onDeleteAddress={shop.deleteAddress}
            onSetDefaultAddress={shop.setDefaultAddress}
            onChangePassword={() => setPasswordChangeRequested(true)}
          />
        ) : screen === 'cart' && auth.user ? (
          <CartScreen
            cart={shop.cart}
            addresses={shop.addresses}
            onSetQuantity={shop.setCartQuantity}
            onRemove={shop.removeCartItem}
            onCheckout={handleCheckout}
            onManageAddresses={() => setScreen('account')}
            onBack={() => setScreen('catalog')}
          />
        ) : screen === 'admin' && isAdmin ? (
          <AdminScreen
            products={shop.products}
            orders={shop.orders}
            users={shop.users}
            currentUserId={auth.user?.id ?? ''}
            onNewProduct={() => { setProductToEdit(undefined); setScreen('newProduct'); }}
            onEditProduct={(product) => { setProductToEdit(product); setScreen('newProduct'); }}
            onDeleteProduct={shop.deleteProduct}
            onUpdateOrderStatus={shop.updateOrderStatus}
            onSetAccountStatus={shop.setAccountStatus}
          />
        ) : screen === 'newProduct' && isAdmin ? (
          <NewProductScreen
            product={productToEdit}
            onSave={handleSaveProduct}
            onCancel={() => { setProductToEdit(undefined); setScreen('admin'); }}
          />
        ) : screen === 'orders' && auth.user ? (
          <OrdersScreen
            orders={shop.orders}
            pendingCount={shop.counts.pending}
            onSchedule={handleSchedule}
          />
        ) : (
          <CatalogScreen productCount={shop.products.length}>
            <ProductGrid products={shop.products.filter((product) => product.isActive)} onSelect={(product) => setSelectedProductId(product.id)} onNewProduct={() => setScreen('catalog')} />
          </CatalogScreen>
        )}
      </main>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/40 bg-surface-hover px-5 py-3 text-sm text-primary shadow-lifted md:bottom-8">
          <Ribbon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {toast}
        </div>
      )}

      <BottomNavigation
        active={screen === 'newProduct' ? 'admin' : screen === 'cart' || screen === 'auth' ? 'catalog' : screen}
        authenticated={Boolean(auth.user)}
        isAdmin={isAdmin}
        onChange={(next) => {
          if (next === 'catalog') setSelectedProductId(null);
          setScreen(next);
        }}
      />
    </div>
  );
}

function App() {
  if (!supabaseConfigured || !supabase) return <ConfigurationNotice />;
  return (
    <AuthProvider>
      <ShopApplication />
    </AuthProvider>
  );
}

export default App;

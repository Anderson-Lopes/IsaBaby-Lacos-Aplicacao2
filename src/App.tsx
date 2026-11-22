import { useCallback, useState } from 'react';
import { Ribbon, ShoppingBag } from 'lucide-react';
import type { CartItem, Product, ProductDraft } from '@/types';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { CatalogScreen } from '@/screens/CatalogScreen';
import { NewProductScreen } from '@/screens/NewProductScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { ProductDetails } from '@/components/details/ProductDetails';
import { CartScreen } from '@/screens/CartScreen';
import { useAuth } from '@/hooks/useAuth';
import { useShopData } from '@/hooks/useShopData';
import { useCart } from '@/hooks/useCart';
import { deleteProductImage, uploadProductImage } from '@/lib/productImages';
import { createWhatsAppOrderUrl } from '@/lib/whatsapp';
import { getGuestOrderStatus, newOrderToken, registerGuestOrder } from '@/lib/guestOrders';

export type Screen = 'catalog' | 'newProduct' | 'orders' | 'cart' | 'admin' | 'changePassword';

function App() {
  const auth = useAuth();
  const isAdmin = auth.profile?.role === 'admin';
  const { products, orders, counts, loading, error, saveProduct, deleteProduct, updateOrderStatus, confirmOrderPaid, refreshOrders } = useShopData(isAdmin);
  const { items: cart, setItems: setCart, error: cartError, syncError } = useCart();
  const [screen, setScreen] = useState<Screen>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const selectedProduct = selectedProductId
    ? products.find((product) => product.id === selectedProductId) ?? null
    : null;
  const editingProduct = editingProductId
    ? products.find((product) => product.id === editingProductId)
    : undefined;

  const handleSignOut = async () => {
    const result = await auth.signOut();
    if (result.error) {
      showToast(result.error);
      return;
    }
    setSelectedProductId(null);
    setScreen('catalog');
  };

  const handleSaveProduct = async (data: ProductDraft) => {
    const uploadedImages: string[] = [];
    let saving = false;
    try {
      for (const file of data.imageFiles ?? []) uploadedImages.push(await uploadProductImage(file));
      const imageUrls = [...data.imageUrls, ...uploadedImages];
      saving = true;
      const saved = await saveProduct({ ...data, imageUrl: imageUrls[0], imageUrls }, editingProductId ?? undefined);
      let cleanupWarning: string | null = null;
      for (const url of editingProduct?.imageUrls ?? []) {
        if (imageUrls.includes(url)) continue;
        try {
          await deleteProductImage(url);
        } catch (imageError) {
          cleanupWarning = imageError instanceof Error ? imageError.message : 'Produto salvo, mas a imagem anterior não foi removida.';
        }
      }
      setEditingProductId(null);
      setScreen('catalog');
      setSelectedProductId(saved.id);
      showToast(cleanupWarning ? `${saved.name} salvo. ${cleanupWarning}` : `${saved.name} salvo com sucesso.`);
    } catch (saveError) {
      if (!saving) {
        for (const url of uploadedImages) {
          try {
            await deleteProductImage(url);
          } catch (cleanupError) {
            showToast(cleanupError instanceof Error ? cleanupError.message : 'Uma imagem enviada não pôde ser removida.');
          }
        }
      }
      throw saveError;
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Excluir “${product.name}” do catálogo?`)) return;
    try {
      await deleteProduct(product);
      if (selectedProductId === product.id) setSelectedProductId(null);
      try {
        for (const url of product.imageUrls) await deleteProductImage(url);
        showToast('Produto excluído.');
      } catch (imageError) {
        showToast(imageError instanceof Error ? `Produto excluído, mas ${imageError.message}` : 'Produto excluído, mas a imagem não foi removida.');
      }
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o produto.');
    }
  };

  const handleAddToCart = (item: CartItem) => {
    setCart((current) => {
      if (editingCartIndex !== null) {
        return current.map((cartItem, index) => index === editingCartIndex ? item : cartItem);
      }
      return [...current, item];
    });
    setEditingCartIndex(null);
    setSelectedProductId(null);
    showToast(editingCartIndex !== null ? 'Item atualizado no carrinho.' : `${item.productName} adicionado ao carrinho.`);
  };

  const sendPendingOrder = async (items: CartItem[], pending: NonNullable<CartItem['pendingOrder']>) => {
    createWhatsAppOrderUrl(items, pending.customerName, pending.observations);
    const whatsappWindow = window.open('about:blank', '_blank');
    if (!whatsappWindow) throw new Error('Permita a abertura de novas abas para enviar o pedido pelo WhatsApp.');
    whatsappWindow.opener = null;
    try {
      const number = await registerGuestOrder(pending.token, pending.customerName, pending.observations, items);
      setCart((current) => current.map((item) => item.pendingOrder?.token === pending.token
        ? { ...item, pendingOrder: { ...item.pendingOrder, number } }
        : item));
      whatsappWindow.location.replace(createWhatsAppOrderUrl(items, pending.customerName, pending.observations, number));
      showToast('Pedido registrado. Envie a mensagem no WhatsApp e volte à loja.');
    } catch (cause) {
      whatsappWindow.close();
      throw cause;
    }
  };

  const handleWhatsAppCheckout = async (customerName: string, observations: string) => {
    const items = cart.filter((item) => !item.pendingOrder);
    createWhatsAppOrderUrl(items, customerName, observations);
    const pending = { token: newOrderToken(), customerName, observations };
    setCart((current) => current.map((item) => item.pendingOrder ? item : { ...item, pendingOrder: pending }));
    await sendPendingOrder(items, pending);
  };

  const handleRetryOrder = async (token: string) => {
    const items = cart.filter((item) => item.pendingOrder?.token === token);
    const pending = items[0]?.pendingOrder;
    if (!pending) throw new Error('Pedido não encontrado no carrinho.');
    await sendPendingOrder(items, pending);
  };

  const handleReleaseDraft = async (token: string) => {
    const status = await getGuestOrderStatus(token);
    if (status) throw new Error('Este pedido já foi registrado. Peça à administração para cancelá-lo se precisar alterá-lo.');
    setCart((current) => current.map((item) => item.pendingOrder?.token === token
      ? { ...item, pendingOrder: undefined }
      : item));
  };

  const showAdminAuth = screen === 'admin' && !isAdmin;
  const showPasswordScreen = isAdmin && (
    auth.passwordRecovery || auth.profile?.must_change_password || screen === 'changePassword'
  );

  if (showAdminAuth || showPasswordScreen) {
    return (
      <AuthScreen
        key={showPasswordScreen ? 'changePassword' : 'login'}
        configurationError={auth.configurationError}
        accessError={!auth.loading && auth.user && auth.profile?.role === 'customer'
          ? 'Esta conta não tem permissão de administrador. Use a conta administrativa autorizada.'
          : null}
        loadingProfile={auth.loading && Boolean(auth.user)}
        passwordRecovery={auth.passwordRecovery}
        mustChangePassword={auth.profile?.must_change_password}
        changePassword={screen === 'changePassword'}
        onSignIn={auth.signIn}
        onSendPasswordReset={auth.sendPasswordReset}
        onUpdatePassword={auth.updatePassword}
        onSignOut={auth.user ? auth.signOut : undefined}
        onCancelPasswordChange={() => setScreen('catalog')}
      />
    );
  }

  const showDetails = screen === 'catalog' && selectedProduct;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        username={auth.profile?.username}
        isAdmin={isAdmin}
        cartCount={cartCount}
        onAdminLogin={() => {
          const enterAdmin = async () => {
            if (auth.user && !isAdmin) {
              const result = await auth.signOut();
              if (result.error) {
                showToast(result.error);
                return;
              }
            }
            setSelectedProductId(null);
            setScreen('admin');
          };
          void enterAdmin();
        }}
        onCart={() => {
          setSelectedProductId(null);
          setScreen('cart');
        }}
        onNewProduct={() => {
          setSelectedProductId(null);
          setEditingProductId(null);
          setScreen('newProduct');
        }}
        onChangePassword={() => setScreen('changePassword')}
        onSignOut={() => void handleSignOut()}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-24">
        {cartError && (
          <p role="alert" className="mb-4 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
            {cartError} Limpe o armazenamento local do site para criar um carrinho novo.
          </p>
        )}
        {syncError && <p role="alert" className="mb-4 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
          Não foi possível consultar os pagamentos: {syncError}. Tente novamente quando a conexão estiver disponível.
        </p>}
        {screen !== 'cart' && loading ? (
          <p className="text-sm text-muted text-center py-16">Carregando catálogo...</p>
        ) : screen !== 'cart' && error ? (
          <p className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary" role="alert">
            Não foi possível carregar os dados: {error}
          </p>
        ) : showDetails ? (
          <ProductDetails
            key={`${selectedProduct.id}-${editingCartIndex ?? 'new'}`}
            product={selectedProduct}
            initialItem={editingCartIndex === null ? undefined : cart[editingCartIndex]}
            onAddToOrder={handleAddToCart}
            onBack={() => {
              setSelectedProductId(null);
              setEditingCartIndex(null);
            }}
          />
        ) : screen === 'catalog' ? (
          <CatalogScreen productCount={products.length}>
            <ProductGrid
              products={products}
              isAdmin={isAdmin}
              onSelect={(product) => {
                setSelectedProductId(product.id);
                setEditingCartIndex(null);
              }}
              onEdit={(product) => {
                setEditingProductId(product.id);
                setScreen('newProduct');
              }}
              onDelete={(product) => void handleDeleteProduct(product)}
              onNewProduct={isAdmin ? () => setScreen('newProduct') : undefined}
            />
          </CatalogScreen>
        ) : screen === 'cart' ? (
          <CartScreen
            items={cart}
            onQuantityChange={(index, quantity) => {
              if (quantity < 1) return;
              setCart((current) => current.map((item, itemIndex) => itemIndex === index
                ? { ...item, quantity, total: item.unitPrice * quantity }
                : item));
            }}
            onRemove={(index) => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            onEdit={(index) => {
              setEditingCartIndex(index);
              setSelectedProductId(cart[index].productId);
              setScreen('catalog');
            }}
            onContinueShopping={() => setScreen('catalog')}
            onCheckout={handleWhatsAppCheckout}
            onRetry={handleRetryOrder}
            onReleaseDraft={handleReleaseDraft}
          />
        ) : screen === 'newProduct' && isAdmin ? (
          <NewProductScreen
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setEditingProductId(null);
              setScreen('catalog');
            }}
          />
        ) : screen === 'orders' && isAdmin ? (
          <OrdersScreen
            orders={orders}
            pendingCount={counts.pending}
            onRefresh={refreshOrders}
            onConfirmPaid={async (id) => {
              await confirmOrderPaid(id);
              showToast('Pagamento marcado como recebido.');
            }}
            onStatusChange={(orderId, status) => {
              void updateOrderStatus(orderId, status).catch((statusError: unknown) => {
                showToast(statusError instanceof Error ? statusError.message : 'Não foi possível atualizar o pedido.');
              });
            }}
          />
        ) : (
          <CatalogScreen productCount={products.length}>
            <ProductGrid products={products} onSelect={(product) => setSelectedProductId(product.id)} />
          </CatalogScreen>
        )}
      </main>

      {toast && (
        <div role="status" aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-50 flex items-center gap-2 rounded-full bg-surface-hover border border-primary/40 px-5 py-3 text-sm text-primary shadow-lifted">
          <Ribbon className="w-4 h-4 shrink-0" aria-hidden="true" />
          {toast}
        </div>
      )}

      <BottomNavigation active={screen} isAdmin={isAdmin}
        onChange={(next) => {
          if (next === 'catalog') {
            setSelectedProductId(null);
            setEditingCartIndex(null);
          }
          setScreen(next);
        }} />
      {cartCount > 0 && !isAdmin && screen !== 'cart' && (
        <button type="button" onClick={() => setScreen('cart')}
          className="fixed right-4 bottom-20 md:bottom-6 z-30 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-background shadow-lifted">
          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
          Ver carrinho ({cartCount})
        </button>
      )}
    </div>
  );
}

export default App;

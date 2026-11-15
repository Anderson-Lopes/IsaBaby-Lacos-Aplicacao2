import { useCallback, useState } from 'react';
import { Ribbon, ShoppingBag } from 'lucide-react';
import type { CartItem, Order, Product } from '@/types';
import { ProductGrid } from '@/components/catalog/ProductGrid';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { CatalogScreen } from '@/screens/CatalogScreen';
import { NewProductScreen } from '@/screens/NewProductScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { ProductDetails } from '@/components/details/ProductDetails';
import { useShopData } from '@/hooks/useShopData';

export type Screen = 'catalog' | 'newProduct' | 'orders';

function App() {
  const { products, orders, counts, addProduct, addOrder } = useShopData();
  const [screen, setScreen] = useState<Screen>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastScheduled, setLastScheduled] = useState<{ date: string; time: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId) ?? null
    : null;

  const handleSaveProduct = (data: Omit<Product, 'id' | 'createdAt'>) => {
    const created = addProduct(data);
    setScreen('catalog');
    setSelectedProductId(created.id);
    showToast(`${data.name} cadastrado com sucesso!`);
  };

  const handleAddToOrder = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
    showToast(`${item.productName} adicionado ao pedido!`);
  };

  const handleSchedule = (date: string, time: string) => {
    setLastScheduled({ date, time });
    showToast('Agendamento solicitado com sucesso!');
  };

  const handleConfirmPendingOrders = () => {
    if (cart.length === 0) {
      showToast('Adicione laços ao pedido no catálogo primeiro.');
      setScreen('catalog');
      return;
    }
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    addOrder({
      items: cart,
      total,
      status: 'pendente' as Order['status'],
    });
    setCart([]);
    setScreen('orders');
    showToast('Pedido registrado com sucesso!');
  };

  const showDetails = screen === 'catalog' && selectedProduct;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onNewProduct={() => {
          setSelectedProductId(null);
          setScreen('newProduct');
        }}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-24">
        {showDetails ? (
          <ProductDetails
            product={selectedProduct}
            onAddToOrder={handleAddToOrder}
            onBack={() => setSelectedProductId(null)}
          />
        ) : screen === 'catalog' ? (
          <CatalogScreen productCount={products.length}>
            <ProductGrid
              products={products}
              onSelect={(product) => setSelectedProductId(product.id)}
              onNewProduct={() => setScreen('newProduct')}
            />
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleConfirmPendingOrders}
                disabled={cart.length === 0}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-secondary text-background text-sm font-semibold hover:bg-secondary/85 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                {cart.length > 0
                  ? `Finalizar pedido (${cart.length} ${cart.length === 1 ? 'item' : 'itens'})`
                  : 'Finalizar pedido'}
              </button>
            </div>
          </CatalogScreen>
        ) : screen === 'newProduct' ? (
          <NewProductScreen onSave={handleSaveProduct} onCancel={() => setScreen('catalog')} />
        ) : (
          <OrdersScreen
            orders={orders}
            pendingCount={counts.pending}
            onSchedule={handleSchedule}
            lastScheduled={lastScheduled}
          />
        )}
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-50 flex items-center gap-2 rounded-full bg-surface-hover border border-primary/40 px-5 py-3 text-sm text-primary shadow-lifted"
        >
          <Ribbon className="w-4 h-4 shrink-0" aria-hidden="true" />
          {toast}
        </div>
      )}

      <BottomNavigation
        active={screen}
        onChange={(next) => {
          if (next === 'catalog') setSelectedProductId(null);
          setScreen(next);
        }}
      />
    </div>
  );
}

export default App;

import { useState } from 'react';
import { BadgeCheck, ClipboardList, CircleDashed, Package, Shield, Users } from 'lucide-react';
import type { Order, Product, UserProfile } from '@/types';
import { ORDER_STATUS_LABELS, formatPrice } from '@/lib/constants';
import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';

type AdminTab = 'products' | 'orders' | 'users';

interface AdminScreenProps {
  products: Product[];
  orders: Order[];
  users: UserProfile[];
  currentUserId: string;
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  onSetAccountStatus: (userId: string, status: UserProfile['accountStatus']) => Promise<void>;
}

export function AdminScreen({
  products,
  orders,
  users,
  currentUserId,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onSetAccountStatus,
}: AdminScreenProps) {
  const [tab, setTab] = useState<AdminTab>('products');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Excluir "${product.name}"? Essa ação não pode ser desfeita.`)) return;
    setError(null);
    setBusyId(product.id);
    try {
      await onDeleteProduct(product.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover o produto.');
    } finally {
      setBusyId(null);
    }
  };

  const changeOrderStatus = async (orderId: string, status: string) => {
    setError(null);
    setBusyId(orderId);
    try {
      await onUpdateOrderStatus(orderId, status as Order['status']);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setBusyId(null);
    }
  };

  const changeAccountStatus = async (user: UserProfile) => {
    const next = user.accountStatus === 'active' ? 'suspended' : 'active';
    setError(null);
    setBusyId(user.id);
    try {
      await onSetAccountStatus(user.id, next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a conta.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="admin-title" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 id="admin-title" className="font-display text-xl font-semibold text-primary">Painel administrativo</h2>
          <p className="text-xs text-muted">As permissões de escrita também são aplicadas no banco de dados.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Seções administrativas" className="flex flex-wrap gap-2">
        {([
          ['products', 'Produtos', Package],
          ['orders', 'Pedidos', ClipboardList],
          ['users', 'Usuários', Users],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium ${tab === id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted'}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-primary">{error}</p>}

      {tab === 'products' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">{products.length} produtos</p>
            <AppButton type="button" onClick={onNewProduct}>Novo produto</AppButton>
          </div>
          {products.length === 0 && <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">Nenhum produto cadastrado.</p>}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-background" />}
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-primary">{product.name}</h3>
                      <p className="text-xs text-muted">{product.model}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] ${product.isActive ? 'bg-ink/10 text-ink' : 'bg-background text-muted'}`}>
                      {product.isActive ? 'Publicado' : 'Oculto'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {product.promotionalPrice ? <><span className="mr-2 text-xs text-muted line-through">{formatPrice(product.price)}</span>{formatPrice(product.promotionalPrice)}</> : formatPrice(product.price)}
                    <span className="ml-2 text-xs font-normal text-muted">· {product.quantity} un.</span>
                  </p>
                  <div className="flex gap-2">
                    <AppButton type="button" variant="secondary" block onClick={() => onEditProduct(product)}>Editar</AppButton>
                    <button type="button" disabled={busyId === product.id} onClick={() => void removeProduct(product)} className="min-h-11 min-w-11 rounded-xl border border-border text-primary disabled:opacity-40" aria-label={`Excluir ${product.name}`}>×</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 && <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">Nenhum pedido registrado.</p>}
          {orders.map((order) => (
            <article key={order.id} className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-primary">Pedido #{order.number} · {order.customerName || 'Cliente'}</h3>
                  <p className="text-xs text-muted">{order.customerEmail}</p>
                </div>
                <p className="text-sm font-semibold text-ink">{formatPrice(order.total)}</p>
              </header>
              <div className="grid gap-3 text-xs text-muted sm:grid-cols-2">
                <p><strong className="text-secondary">Pagamento:</strong> {order.paymentStatus}</p>
                <p><strong className="text-secondary">Entrega:</strong> {[
                  order.addressSnapshot?.street,
                  order.addressSnapshot?.number,
                  order.addressSnapshot?.district,
                  order.addressSnapshot?.city,
                  order.addressSnapshot?.state,
                  order.addressSnapshot?.postal_code,
                ].filter(Boolean).join(', ') || 'Endereço indisponível'}</p>
              </div>
              <ul className="space-y-1">
                {order.items.map((item, index) => <li key={`${order.id}-${index}`} className="text-xs text-muted">{item.quantity} × {item.productName} · {item.color} / {item.size} · {formatPrice(item.total)}</li>)}
              </ul>
              <FormField
                kind="select"
                label="Status do pedido"
                name={`order-status-${order.id}`}
                value={order.status}
                disabled={busyId === order.id}
                onChange={(event) => void changeOrderStatus(order.id, event.target.value)}
                options={Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </article>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-semibold text-primary">{user.fullName || user.email}</p>
                <p className="text-xs text-muted">{user.email} · {user.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
                {user.phone && <p className="text-xs text-muted">{user.phone}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge icon={user.accountStatus === 'active' ? BadgeCheck : CircleDashed} label={user.accountStatus === 'active' ? 'Ativa' : 'Suspensa'} className={user.accountStatus === 'active' ? 'text-ink border-ink/40 bg-ink/10' : 'text-muted border-border bg-background'} />
                {user.id !== currentUserId && (
                  <AppButton
                    type="button"
                    variant="secondary"
                    disabled={busyId === user.id}
                    onClick={() => void changeAccountStatus(user)}
                  >
                    {user.accountStatus === 'active' ? 'Suspender' : 'Reativar'}
                  </AppButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

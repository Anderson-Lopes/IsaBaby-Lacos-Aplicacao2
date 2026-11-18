import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Address, CartLine, Order, Product, ProductImage, UserProfile } from '@/types';
import { supabase } from '@/lib/supabase';

export type ProductDraft = Pick<
  Product,
  'name' | 'model' | 'description' | 'price' | 'promotionalPrice' | 'quantity' | 'status' | 'isActive'
>;

export type AddressDraft = Omit<Address, 'id'>;

interface ProductImageRow {
  id: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string;
  is_primary: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  model: string;
  description: string;
  price: number;
  promotional_price: number | null;
  quantity: number;
  status: Product['status'];
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  product_images: ProductImageRow[] | null;
}

interface AddressRow {
  id: string;
  recipient_name: string;
  postal_code: string;
  state: string;
  city: string;
  district: string;
  street: string;
  number: string;
  complement: string | null;
  reference: string | null;
  is_default: boolean;
}

interface OrderItemRow {
  product_id: string | null;
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
}

interface OrderRow {
  id: string;
  number: number;
  status: Order['status'];
  payment_status: Order['paymentStatus'];
  total: number;
  pickup_date: string | null;
  pickup_time: string | null;
  address_snapshot: Record<string, string | null> | null;
  created_at: string;
  user_id: string;
  order_items: OrderItemRow[] | null;
}

interface CartProductRow {
  name: string;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  product_images: { image_url: string; is_primary: boolean }[] | null;
}

interface CartItemRow {
  id: string;
  product_id: string;
  color: string;
  size: string;
  quantity: number;
  notes: string | null;
  products: CartProductRow[] | null;
}

interface ProfileRow {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: UserProfile['role'];
  must_change_password: boolean;
  account_status: UserProfile['accountStatus'];
}

function mapProduct(row: ProductRow): Product {
  const images: ProductImage[] = (row.product_images ?? [])
    .map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      storagePath: image.storage_path,
      altText: image.alt_text,
      isPrimary: image.is_primary,
    }))
    .sort((a: ProductImage, b: ProductImage) => Number(b.isPrimary) - Number(a.isPrimary));
  const primaryImage = images.find((image) => image.isPrimary);
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    description: row.description,
    price: Number(row.price),
    promotionalPrice: row.promotional_price === null ? null : Number(row.promotional_price),
    quantity: row.quantity,
    status: row.status,
    isActive: row.is_active,
    imageUrl: primaryImage?.imageUrl ?? row.image_url ?? undefined,
    images,
    createdAt: row.created_at,
  };
}

function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    recipientName: row.recipient_name,
    postalCode: row.postal_code,
    state: row.state,
    city: row.city,
    district: row.district,
    street: row.street,
    number: row.number,
    complement: row.complement ?? '',
    reference: row.reference ?? '',
    isDefault: row.is_default,
  };
}

function mapOrder(row: OrderRow, profile?: UserProfile): Order {
  const items = (row.order_items ?? []).map((item) => ({
    productId: item.product_id ?? '',
    productName: item.product_name,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    total: Number(item.unit_price) * item.quantity,
    notes: item.notes ?? undefined,
  }));
  return {
    id: row.id,
    number: String(row.number).padStart(4, '0'),
    items,
    total: Number(row.total),
    status: row.status,
    paymentStatus: row.payment_status,
    pickupDate: row.pickup_date ?? undefined,
    pickupTime: row.pickup_time ?? undefined,
    customerName: profile?.fullName ?? '',
    customerEmail: profile?.email ?? '',
    addressSnapshot: row.address_snapshot ?? {},
    createdAt: row.created_at,
  };
}

export function useShopData(userId: string | null, isAdmin: boolean) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!supabase) throw new Error('Configure as variáveis do Supabase para carregar a loja.');
    setError(null);
    setLoading(true);
    try {
      const productResult = await supabase
        .from('products')
        .select('id,name,model,description,price,promotional_price,quantity,status,is_active,image_url,created_at,product_images(id,image_url,storage_path,alt_text,is_primary)')
        .order('created_at', { ascending: false });
      if (productResult.error) throw productResult.error;
      setProducts((productResult.data ?? []).map(mapProduct));

      if (!userId) {
        setOrders([]);
        setCart([]);
        setAddresses([]);
        setUsers([]);
        return;
      }

      const [addressResult, cartResult, orderResult] = await Promise.all([
        supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at'),
        supabase.from('carts').select('id').eq('user_id', userId).maybeSingle(),
        supabase
          .from('orders')
          .select('id,number,status,payment_status,total,pickup_date,pickup_time,address_snapshot,created_at,user_id,order_items(product_id,product_name,color,size,quantity,unit_price,notes)')
          .order('created_at', { ascending: false }),
      ]);
      if (addressResult.error) throw addressResult.error;
      if (cartResult.error) throw cartResult.error;
      if (orderResult.error) throw orderResult.error;
      setAddresses((addressResult.data ?? []).map(mapAddress));

      if (cartResult.data) {
        const cartItemsResult = await supabase
          .from('cart_items')
          .select('id,product_id,color,size,quantity,notes,products(name,price,promotional_price,image_url,product_images(image_url,is_primary))')
          .eq('cart_id', cartResult.data.id)
          .order('created_at');
        if (cartItemsResult.error) throw cartItemsResult.error;
        setCart((cartItemsResult.data ?? []).map((row: CartItemRow) => {
          const product = row.products?.[0] ?? null;
          const image = product?.product_images?.find((item) => item.is_primary)?.image_url ?? product?.image_url;
          const unitPrice = Number(product?.promotional_price ?? product?.price ?? 0);
          return {
            id: row.id,
            productId: row.product_id,
            productName: product?.name ?? 'Produto removido',
            color: row.color,
            size: row.size,
            quantity: row.quantity,
            unitPrice,
            total: unitPrice * row.quantity,
            notes: row.notes ?? undefined,
            imageUrl: image ?? undefined,
          };
        }));
      } else {
        setCart([]);
      }

      if (isAdmin) {
        const profileResult = await supabase
          .from('profiles')
          .select('id,username,email,full_name,phone,role,must_change_password,account_status')
          .order('created_at', { ascending: false });
        if (profileResult.error) throw profileResult.error;
        const profiles: UserProfile[] = (profileResult.data ?? []).map((row: ProfileRow) => ({
          id: row.id,
          username: row.username,
          email: row.email ?? '',
          fullName: row.full_name,
          phone: row.phone ?? '',
          role: row.role,
          mustChangePassword: row.must_change_password,
          accountStatus: row.account_status,
        }));
        setUsers(profiles);
        const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
        setOrders((orderResult.data ?? []).map((row: OrderRow) => mapOrder(row, profileById.get(row.user_id))));
      } else {
        setUsers([]);
        setOrders((orderResult.data ?? []).map((row: OrderRow) => mapOrder(row)));
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Falha ao carregar os dados da loja.';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId]);

  useEffect(() => {
    let active = true;
    reload().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar os dados da loja.');
    });
    return () => {
      active = false;
    };
  }, [reload]);

  const requestPickup = useCallback(async (orderId: string, date: string, time: string) => {
    if (!supabase) throw new Error('Configure o Supabase para solicitar a retirada.');
    const { error: pickupError } = await supabase.rpc('request_order_pickup', {
      p_order_id: orderId,
      p_date: date,
      p_time: time,
    });
    if (pickupError) throw pickupError;
    await reload();
  }, [reload]);

  const addToCart = useCallback(async (item: Omit<CartLine, 'id' | 'productName' | 'unitPrice' | 'total' | 'imageUrl'>) => {
    if (!supabase || !userId) throw new Error('Entre na sua conta para adicionar produtos ao carrinho.');
    const { error: addError } = await supabase.rpc('add_to_cart', {
      p_product_id: item.productId,
      p_color: item.color,
      p_size: item.size,
      p_quantity: item.quantity,
      p_notes: item.notes ?? null,
    });
    if (addError) throw addError;
    await reload();
  }, [reload, userId]);

  const setCartQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!supabase) throw new Error('Configure o Supabase para alterar o carrinho.');
    const { error: updateError } = await supabase.rpc('update_cart_item_quantity', {
      p_item_id: itemId,
      p_quantity: quantity,
    });
    if (updateError) throw updateError;
    await reload();
  }, [reload]);

  const removeCartItem = useCallback(async (itemId: string) => {
    if (!supabase) throw new Error('Configure o Supabase para alterar o carrinho.');
    const { error: deleteError } = await supabase.from('cart_items').delete().eq('id', itemId);
    if (deleteError) throw deleteError;
    await reload();
  }, [reload]);

  const saveAddress = useCallback(async (draft: AddressDraft, addressId?: string) => {
    if (!supabase) throw new Error('Configure o Supabase para salvar endereços.');
    const row = {
      recipient_name: draft.recipientName.trim(),
      postal_code: draft.postalCode.replace(/\D/g, ''),
      state: draft.state.trim().toUpperCase(),
      city: draft.city.trim(),
      district: draft.district.trim(),
      street: draft.street.trim(),
      number: draft.number.trim(),
      complement: draft.complement.trim() || null,
      reference: draft.reference.trim() || null,
      is_default: false,
    };
    const result = addressId
      ? await supabase.from('addresses').update(row).eq('id', addressId).select('id').single()
      : await supabase.from('addresses').insert(row).select('id').single();
    if (result.error) throw result.error;
    if (draft.isDefault || addresses.length === 0) {
      const { error: defaultError } = await supabase.rpc('set_default_address', { p_address_id: result.data.id });
      if (defaultError) throw defaultError;
    }
    await reload();
  }, [addresses.length, reload]);

  const deleteAddress = useCallback(async (addressId: string) => {
    if (!supabase) throw new Error('Configure o Supabase para remover endereços.');
    const wasDefault = addresses.some((address) => address.id === addressId && address.isDefault);
    const { error: deleteError } = await supabase.from('addresses').delete().eq('id', addressId);
    if (deleteError) throw deleteError;
    const nextDefault = addresses.find((address) => address.id !== addressId);
    if (wasDefault && nextDefault) {
      const { error: defaultError } = await supabase.rpc('set_default_address', { p_address_id: nextDefault.id });
      if (defaultError) throw defaultError;
    }
    await reload();
  }, [addresses, reload]);

  const setDefaultAddress = useCallback(async (addressId: string) => {
    if (!supabase) throw new Error('Configure o Supabase para selecionar endereços.');
    const { error: updateError } = await supabase.rpc('set_default_address', { p_address_id: addressId });
    if (updateError) throw updateError;
    await reload();
  }, [reload]);

  const saveProduct = useCallback(async (
    draft: ProductDraft,
    files: File[],
    productId?: string,
    primaryImageRef?: string,
    removedImageIds: string[] = []
  ) => {
    if (!supabase) throw new Error('Configure o Supabase para gerenciar produtos.');
    const productRow = {
      name: draft.name.trim(),
      model: draft.model.trim(),
      description: draft.description.trim(),
      price: draft.price,
      promotional_price: draft.promotionalPrice ?? null,
      quantity: draft.quantity,
      status: draft.status,
      is_active: draft.isActive,
    };
    const productResult = productId
      ? await supabase.from('products').update(productRow).eq('id', productId).select('id').single()
      : await supabase.from('products').insert(productRow).select('id').single();
    if (productResult.error) throw productResult.error;
    const savedProductId = productResult.data.id as string;
    const newImages: ProductImage[] = [];

    for (const [index, file] of files.entries()) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        throw new Error('Use imagens JPEG, PNG ou WebP de até 5 MB.');
      }
      const path = `${savedProductId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path);
      const { data: imageRow, error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: savedProductId,
          storage_path: path,
          image_url: publicUrl.publicUrl,
          alt_text: `${draft.name} — imagem ${index + 1}`,
        })
        .select('id,image_url,storage_path,alt_text,is_primary')
        .single();
      if (insertError) throw insertError;
      newImages.push({
        id: imageRow.id,
        imageUrl: imageRow.image_url,
        storagePath: imageRow.storage_path,
        altText: imageRow.alt_text,
        isPrimary: imageRow.is_primary,
      });
    }

    let primaryId: string | undefined;
    if (primaryImageRef?.startsWith('existing:')) primaryId = primaryImageRef.slice('existing:'.length);
    if (primaryImageRef?.startsWith('new:')) primaryId = newImages[Number(primaryImageRef.slice('new:'.length))]?.id;
    if (!primaryId && !productId && newImages.length) primaryId = newImages[0].id;
    if (!primaryId && productId) {
      const existing = products.find((product) => product.id === productId);
      primaryId = existing?.images.find((image) => image.isPrimary && !removedImageIds.includes(image.id))?.id;
      if (!primaryId && newImages.length) primaryId = newImages[0].id;
    }
    if (primaryId) {
      const { error: primaryError } = await supabase.rpc('set_product_primary_image', {
        p_product_id: savedProductId,
        p_image_id: primaryId,
      });
      if (primaryError) throw primaryError;
    }

    const removed = products
      .find((product) => product.id === productId)?.images
      .filter((image) => removedImageIds.includes(image.id)) ?? [];
    const storagePaths = removed.flatMap((image) => image.storagePath ? [image.storagePath] : []);
    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage.from('product-images').remove(storagePaths);
      if (storageError) throw storageError;
    }
    if (removedImageIds.length) {
      const { error: imageDeleteError } = await supabase.from('product_images').delete().in('id', removedImageIds);
      if (imageDeleteError) throw imageDeleteError;
    }
    if (!primaryId && removed.some((image) => image.isPrimary)) {
      const { error: clearPrimaryError } = await supabase
        .from('products')
        .update({ image_url: null })
        .eq('id', savedProductId);
      if (clearPrimaryError) throw clearPrimaryError;
    }
    await reload();
    return savedProductId;
  }, [products, reload]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (!supabase) throw new Error('Configure o Supabase para remover produtos.');
    const product = products.find((item) => item.id === productId);
    const paths = product?.images.flatMap((image) => image.storagePath ? [image.storagePath] : []) ?? [];
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('product-images').remove(paths);
      if (storageError) throw storageError;
    }
    const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
    if (deleteError) throw deleteError;
    await reload();
  }, [products, reload]);

  const createPayment = useCallback(async (addressId: string) => {
    if (!supabase) throw new Error('Configure o Supabase para finalizar o pedido.');
    const { data, error: paymentError } = await supabase.functions.invoke('create-payment', {
      body: { addressId },
    });
    if (paymentError) throw paymentError;
    if (!data?.checkoutUrl || typeof data.checkoutUrl !== 'string') {
      throw new Error('O provedor de pagamento não retornou o endereço de checkout.');
    }
    return data.checkoutUrl as string;
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    if (!supabase) throw new Error('Configure o Supabase para atualizar pedidos.');
    const { error: updateError } = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: status,
    });
    if (updateError) throw updateError;
    await reload();
  }, [reload]);

  const setAccountStatus = useCallback(async (profileId: string, status: UserProfile['accountStatus']) => {
    if (!supabase) throw new Error('Configure o Supabase para gerenciar usuários.');
    const { error: updateError } = await supabase.rpc('admin_set_account_status', {
      p_user_id: profileId,
      p_status: status,
    });
    if (updateError) throw updateError;
    await reload();
  }, [reload]);

  const counts = useMemo(() => ({
    products: products.length,
    orders: orders.length,
    pending: orders.filter((order) => order.status === 'pendente').length,
  }), [orders, products]);

  return {
    products,
    orders,
    cart,
    addresses,
    users,
    counts,
    loading,
    error,
    reload,
    addToCart,
    setCartQuantity,
    removeCartItem,
    saveAddress,
    deleteAddress,
    setDefaultAddress,
    saveProduct,
    deleteProduct,
    createPayment,
    updateOrderStatus,
    setAccountStatus,
    requestPickup,
  };
}

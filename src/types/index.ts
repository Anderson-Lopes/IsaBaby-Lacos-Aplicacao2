export type ProductStatus = 'ativo' | 'sob_encomenda' | 'indisponivel';

export type OrderStatus =
  | 'pendente'
  | 'confirmado'
  | 'em_producao'
  | 'pronto_retirada'
  | 'entregue'
  | 'cancelado';

export type UserRole = 'admin' | 'customer';
export type AccountStatus = 'active' | 'suspended';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  mustChangePassword: boolean;
  accountStatus: AccountStatus;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  storagePath: string | null;
  altText: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  model: string;
  description: string;
  price: number;
  promotionalPrice?: number | null;
  quantity: number;
  status: ProductStatus;
  isActive: boolean;
  imageUrl?: string;
  images: ProductImage[];
  createdAt: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface Order {
  id: string;
  number: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: 'not_required' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  pickupDate?: string;
  pickupTime?: string;
  customerName?: string;
  customerEmail?: string;
  addressSnapshot?: Record<string, string | null>;
  createdAt: string;
}

export interface Address {
  id: string;
  recipientName: string;
  postalCode: string;
  state: string;
  city: string;
  district: string;
  street: string;
  number: string;
  complement: string;
  reference: string;
  isDefault: boolean;
}

export interface CartLine extends CartItem {
  id: string;
  imageUrl?: string;
}

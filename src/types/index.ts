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

export interface ProductOption {
  id: string;
  optionName: string;
  optionValues: string[];
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
  category?: string | null;
  imageUrl?: string;
  images: ProductImage[];
  options: ProductOption[];
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  selections: { optionName: string; value: string }[];
  notes?: string;
  total: number;
}

export interface Order {
  id: string;
  number: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  notes?: string;
  createdAt: string;
}

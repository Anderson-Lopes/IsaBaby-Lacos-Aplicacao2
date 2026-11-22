export type ProductStatus = 'ativo' | 'sob_encomenda' | 'indisponivel';

export type OrderStatus =
  | 'pendente'
  | 'confirmado'
  | 'em_producao'
  | 'pronto_retirada'
  | 'entregue'
  | 'cancelado';

export interface Product {
  id: string;
  name: string;
  model: string;
  description: string;
  price: number;
  quantity: number;
  status: ProductStatus;
  category?: string | null;
  options: ProductOption[];
  imageUrl?: string;
  createdAt: string;
}

export interface ProductOption {
  id?: string;
  name: string;
  values: string[];
}

export interface CartItem {
  productId: string;
  productName: string;
  imageUrl?: string;
  customizations: Record<string, string>;
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
  pickupDate?: string;
  createdAt: string;
}

export type ProductDraft = Omit<Product, 'id' | 'createdAt'> & {
  imageFile?: File;
};

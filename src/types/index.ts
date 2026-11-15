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
  imageUrl?: string;
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
  pickupDate?: string;
  createdAt: string;
}

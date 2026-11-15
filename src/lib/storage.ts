import type { Product, Order } from '@/types';

const PRODUCTS_KEY = 'isababy.products.v1';
const ORDERS_KEY = 'isababy.orders.v1';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadProducts(): Product[] {
  return read<Product[]>(PRODUCTS_KEY) ?? seedProducts();
}

export function saveProducts(products: Product[]): void {
  write(PRODUCTS_KEY, products);
}

export function loadOrders(): Order[] {
  return read<Order[]>(ORDERS_KEY) ?? [];
}

export function saveOrders(orders: Order[]): void {
  write(ORDERS_KEY, orders);
}

function seedProducts(): Product[] {
  const products: Omit<Product, 'id' | 'createdAt'>[] = [
    {
      name: 'Laço Boutique',
      model: 'Modelo clássico',
      description:
        'O laço clássico que nunca sai de moda. Feito em gorgurão de alta qualidade, com nó central reforçado à mão. Perfeito para o dia a dia e ocasiões especiais.',
      price: 18,
      quantity: 12,
      status: 'ativo',
      imageUrl:
        'https://images.pexels.com/photos/7123092/pexels-photo-7123092.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    },
    {
      name: 'Laço Isa',
      model: 'Modelo premium',
      description:
        'Nosso modelo premium, com camadas duplas de fita e acabamento impecável. Um laço sofisticado para compor penteados mais elaborados.',
      price: 20,
      quantity: 8,
      status: 'ativo',
      imageUrl:
        'https://images.pexels.com/photos/37420551/pexels-photo-37420551.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    },
    {
      name: 'Laço Escolar',
      model: 'Modelo tradicional',
      description:
        'Resistente e confortável, pensado para acompanhar a rotina escolar. Fita macia, presilha firme e cores que combinam com qualquer uniforme.',
      price: 18,
      quantity: 20,
      status: 'ativo',
      imageUrl:
        'https://images.pexels.com/photos/7123117/pexels-photo-7123117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    },
    {
      name: 'Laço Florzinha',
      model: 'Modelo delicado',
      description:
        'Delicado e leve, com pétalas moldadas uma a uma. Um charme para looks suaves e festivos. Produzido sob encomenda com todo cuidado.',
      price: 16,
      quantity: 5,
      status: 'sob_encomenda',
      imageUrl:
        'https://images.pexels.com/photos/23495730/pexels-photo-23495730.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    },
    {
      name: 'Laço Luxo',
      model: 'Modelo especial',
      description:
        'Peça especial com detalhes em renda e pérolas aplicadas à mão. Edição limitada para momentos que pedem um toque a mais de elegância.',
      price: 25,
      quantity: 4,
      status: 'ativo',
      imageUrl:
        'https://images.pexels.com/photos/23495728/pexels-photo-23495728.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    },
    {
      name: 'Laço Glitter',
      model: 'Modelo brilhante',
      description:
        'Fita com brilho espelhado que ilumina qualquer penteado. Um favorito das pequenas em festas e apresentações.',
      price: 18,
      quantity: 0,
      status: 'indisponivel',
      imageUrl:
        'https://images.pexels.com/photos/7123100/pexels-photo-7123100.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    },
  ];

  const seeded: Product[] = products.map((p, i) => ({
    ...p,
    id: `seed-${i + 1}`,
    createdAt: new Date('2026-11-01T09:00:00').toISOString(),
  }));
  saveProducts(seeded);
  return seeded;
}

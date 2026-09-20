// TypeScript type definitions for Pharm D Intern Notes

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  mobile: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  category_id: string;
  category?: Category;
  price: number;
  pages: number;
  cover_url: string | null;
  preview_url: string | null;
  topics: string[];
  is_published: boolean;
  file_path: string | null;  // Stage 3: private PDF storage path
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
}

export type SortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular';

export interface ProductFilters {
  search: string;
  category: string;
  sort: SortOption;
  maxPrice: number | null;
}

// ─── Stage 2 types ────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending_payment'
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  product_id: string;
  product_title: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: OrderStatus;
  utr_number: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOrder extends Order {
  user_email: string;
  user_name: string | null;
}

// Stage 3: admin types
export interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_published: boolean;
  file_path: string | null;
  updated_at: string;
}

export interface AdminUserAccess {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  product_id: string;
  product_title: string;
  order_id: string;
  order_number: string;
  status: 'active' | 'revoked';
  granted_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event: string;
  note: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface UserAccess {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  granted_at: string;
}

export interface SiteSetting {
  key: string;
  value: string;
  updated_at: string;
}

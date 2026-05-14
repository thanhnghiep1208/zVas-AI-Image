/**
 * GA4 (gtag) — chỉ gửi khi `import.meta.env.PROD` để tránh nhiễu property đơn lẻ G-W5YSHKJ7ZD.
 * @see https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function isGa4Enabled(): boolean {
  return import.meta.env.PROD === true;
}

export function sendGa4Event(eventName: string, params?: Record<string, unknown>): void {
  if (!isGa4Enabled()) return;
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params ?? {});
  } catch {
    // ignore analytics failures
  }
}

export function ga4Login(method: string = 'google'): void {
  sendGa4Event('login', { method });
}

export interface Ga4EcommerceItem {
  item_id: string;
  item_name: string;
  quantity: number;
  price?: number;
}

export function ga4BeginCheckout(params: {
  currency?: string;
  value: number;
  items: Ga4EcommerceItem[];
}): void {
  sendGa4Event('begin_checkout', {
    currency: params.currency ?? 'USD',
    value: params.value,
    items: params.items,
  });
}

export function ga4Purchase(params: {
  transaction_id: string;
  value: number;
  currency?: string;
  items: Ga4EcommerceItem[];
}): void {
  sendGa4Event('purchase', {
    transaction_id: params.transaction_id,
    value: params.value,
    currency: params.currency ?? 'USD',
    items: params.items,
  });
}

export function ga4Exception(description: string, fatal: boolean = false): void {
  const safe = description.slice(0, 150);
  sendGa4Event('exception', { description: safe, fatal });
}

export function ga4FileDownload(params: {
  file_extension: string;
  remove_background?: boolean;
  generation_view?: string;
}): void {
  sendGa4Event('file_download', {
    file_extension: params.file_extension,
    remove_background: params.remove_background ?? false,
    generation_view: params.generation_view,
  });
}

export function ga4SelectContent(content_type: string, item_id: string): void {
  sendGa4Event('select_content', { content_type, item_id });
}

export function ga4SelectItem(params: {
  item_id: string;
  item_name: string;
  item_list_name?: string;
}): void {
  sendGa4Event('select_item', {
    items: [
      {
        item_id: params.item_id,
        item_name: params.item_name,
        item_list_name: params.item_list_name ?? 'header_model',
      },
    ],
  });
}

export function newGa4TransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `gen_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

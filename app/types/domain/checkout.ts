export const checkoutStatuses = ['awaiting_payment', 'committing', 'paid', 'cancel_pending', 'cancelled', 'expired', 'review_required', 'refund_pending', 'refunded'] as const;
export type CheckoutStatus = typeof checkoutStatuses[number];
export type PaymentStatus = 'not_started' | 'pending' | 'authorized' | 'processing' | 'succeeded' | 'canceled' | 'unknown' | 'refunding' | 'refunded';
export interface CheckoutSummary {
  id: number;
  hold_id: number;
  trip_id: number;
  status: CheckoutStatus;
  payment_status: PaymentStatus;
  amount_minor: number;
  currency: 'RUB';
  is_demo: true;
  test: true;
  passenger_name: string;
  boarding_name: string;
  alighting_name: string;
  departure_time: string;
  arrival_time: string;
  timezone: string;
  arrival_timezone: string | null;
  seat_number: number;
  created_at: string;
  updated_at: string;
  hold_expires_at: string;
  actions: {
    can_pay: boolean;
    can_cancel: boolean;
    can_reconcile: boolean;
    can_view_confirmation: boolean;
  };
}
export interface CheckoutDetail extends CheckoutSummary {
  payment: { confirmation_url: string | null };
  next_poll_after_ms: number | null;
}

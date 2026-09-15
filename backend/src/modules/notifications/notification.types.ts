export const NotificationType = {
  PRICE_DROP: 'PRICE_DROP',
  PRICE_RISE: 'PRICE_RISE',
  BACK_IN_STOCK: 'BACK_IN_STOCK',
  NEW_OFFER: 'NEW_OFFER',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NOTIFICATION_DEDUP_HOURS = 24;

import { pgTable, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

/**
 * Better Auth tables — generated schema matching better-auth v1.3+ expectations.
 * Keep in sync with better-auth adapter if version bumped.
 */

export const users = pgTable('users', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Freemium tier
  tier:          text('tier').notNull().default('free'), // 'free' | 'premium'
  // Expo push notification token (registered from mobile app)
  pushToken:     text('push_token'),
});

export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:     text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id:                   text('id').primaryKey(),
  userId:               text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId:            text('account_id').notNull(),
  providerId:           text('provider_id').notNull(),
  accessToken:          text('access_token'),
  refreshToken:         text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  scope:                text('scope'),
  password:             text('password'),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const wishlists = pgTable('wishlists', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const priceAlerts = pgTable('price_alerts', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId:       text('product_id').notNull(),
  targetPriceGbp:  integer('target_price_gbp').notNull(), // in pence
  currency:        text('currency').notNull().default('GBP'),
  active:          boolean('active').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Wishlist = typeof wishlists.$inferSelect;
export type PriceAlert = typeof priceAlerts.$inferSelect;

import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, longtext, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Creator profiles table - each user can have multiple profiles
 */
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  bio: text("bio"),
  profilePicUrl: text("profilePicUrl"),
  bannerUrl: text("bannerUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  totalSubscribers: int("totalSubscribers").default(0).notNull(),
  totalPosts: int("totalPosts").default(0).notNull(),
  totalMedia: int("totalMedia").default(0).notNull(),
  totalExclusive: int("totalExclusive").default(0).notNull(),
  totalLikes: int("totalLikes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("profiles_userId_idx").on(table.userId),
  usernameIdx: index("profiles_username_idx").on(table.username),
}));

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * Subscription plans table - each profile can have multiple plans
 */
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  priceInCents: int("priceInCents").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "quarterly", "yearly", "lifetime"]).default("monthly").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileIdIdx: index("subscription_plans_profileId_idx").on(table.profileId),
}));

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * Content table - posts, photos, videos
 */
export const content = mysqlTable("content", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  contentType: mysqlEnum("contentType", ["photo", "video", "post"]).notNull(),
  mediaUrl: text("mediaUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  isExclusive: boolean("isExclusive").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  likeCount: int("likeCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileIdIdx: index("content_profileId_idx").on(table.profileId),
}));

export type Content = typeof content.$inferSelect;
export type InsertContent = typeof content.$inferInsert;

/**
 * Subscriptions table - tracks active subscriptions
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  subscriberId: int("subscriberId").notNull(),
  profileId: int("profileId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired", "pending"]).default("pending").notNull(),
  externalSubscriptionId: varchar("externalSubscriptionId", { length: 255 }),
  paymentGateway: mysqlEnum("paymentGateway", ["novaplex", "blackout", "pushinpay"]),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  renewalDate: timestamp("renewalDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  subscriberIdIdx: index("subscriptions_subscriberId_idx").on(table.subscriberId),
  profileIdIdx: index("subscriptions_profileId_idx").on(table.profileId),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Transactions table - payment records
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId"),
  profileId: int("profileId").notNull(),
  subscriberId: int("subscriberId").notNull(),
  amountInCents: int("amountInCents").notNull(),
  platformFeeInCents: int("platformFeeInCents").notNull(),
  creatorEarningsInCents: int("creatorEarningsInCents").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  paymentGateway: mysqlEnum("paymentGateway", ["novaplex", "blackout", "pushinpay"]).notNull(),
  externalTransactionId: varchar("externalTransactionId", { length: 255 }),
  webhookPayload: longtext("webhookPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileIdIdx: index("transactions_profileId_idx").on(table.profileId),
  subscriberIdIdx: index("transactions_subscriberId_idx").on(table.subscriberId),
  statusIdx: index("transactions_status_idx").on(table.status),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Wallet/Balance table - tracks creator earnings
 */
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().unique(),
  balanceInCents: int("balanceInCents").default(0).notNull(),
  totalEarningsInCents: int("totalEarningsInCents").default(0).notNull(),
  totalWithdrawnInCents: int("totalWithdrawnInCents").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileIdIdx: index("wallets_profileId_idx").on(table.profileId),
}));

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

/**
 * Payment gateway credentials table - stores API keys and tokens
 */
export const paymentGatewayCredentials = mysqlTable("payment_gateway_credentials", {
  id: int("id").autoincrement().primaryKey(),
  gateway: mysqlEnum("gateway", ["novaplex", "blackout", "pushinpay"]).notNull().unique(),
  apiKey: text("apiKey").notNull(),
  apiSecret: text("apiSecret"),
  webhookSecret: text("webhookSecret"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentGatewayCredentials = typeof paymentGatewayCredentials.$inferSelect;
export type InsertPaymentGatewayCredentials = typeof paymentGatewayCredentials.$inferInsert;

/**
 * Relations for Drizzle ORM
 */
export const usersRelations = relations(users, ({ many }) => ({
  profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  subscriptionPlans: many(subscriptionPlans),
  content: many(content),
  subscriptions: many(subscriptions),
  transactions: many(transactions),
  wallet: one(wallets, { fields: [profiles.id], references: [wallets.profileId] }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ one, many }) => ({
  profile: one(profiles, { fields: [subscriptionPlans.profileId], references: [profiles.id] }),
  subscriptions: many(subscriptions),
}));

export const contentRelations = relations(content, ({ one }) => ({
  profile: one(profiles, { fields: [content.profileId], references: [profiles.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  subscriber: one(users, { fields: [subscriptions.subscriberId], references: [users.id] }),
  profile: one(profiles, { fields: [subscriptions.profileId], references: [profiles.id] }),
  plan: one(subscriptionPlans, { fields: [subscriptions.planId], references: [subscriptionPlans.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  profile: one(profiles, { fields: [transactions.profileId], references: [profiles.id] }),
  subscriber: one(users, { fields: [transactions.subscriberId], references: [users.id] }),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  profile: one(profiles, { fields: [wallets.profileId], references: [profiles.id] }),
}));

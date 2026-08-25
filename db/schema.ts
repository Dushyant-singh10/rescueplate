import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  jsonb,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "donor",
  "receiver",
  "volunteer",
  "admin",
]);

export const orgTypeEnum = pgEnum("org_type", [
  "donor_business",
  "receiver_ngo",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "available",
  "claimed",
  "picked_up",
  "expired",
  "cancelled",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "confirmed",
  "picked_up",
  "no_show",
  "cancelled",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: orgTypeEnum("type").notNull(),
  address: text("address").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("pending"),
  verificationDocUrl: text("verification_doc_url"),
  noShowCount: integer("no_show_count").notNull().default(0),
  flagged: boolean("flagged").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  donorOrgId: uuid("donor_org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  foodType: text("food_type").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  unit: text("unit").notNull(),
  allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
  pickupWindowStart: timestamp("pickup_window_start", {
    withTimezone: true,
  }).notNull(),
  pickupWindowEnd: timestamp("pickup_window_end", {
    withTimezone: true,
  }).notNull(),
  claimExpiresAt: timestamp("claim_expires_at", {
    withTimezone: true,
  }).notNull(),
  status: listingStatusEnum("status").notNull().default("available"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  safetyNotes: text("safety_notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  receiverOrgId: uuid("receiver_org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  claimedByUserId: uuid("claimed_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: claimStatusEnum("status").notNull().default("pending"),
  claimedAt: timestamp("claimed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
});

export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id")
    .notNull()
    .references(() => claims.id, { onDelete: "cascade" }),
  raterUserId: uuid("rater_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rateeOrgId: uuid("ratee_org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

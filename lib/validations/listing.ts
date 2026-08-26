import { z } from "zod";

export const createListingSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().min(1).max(2000),
    foodType: z.string().trim().min(1).max(100),
    quantity: z.number().positive().max(100000),
    unit: z.string().trim().min(1).max(30),
    allergens: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
    pickupWindowStart: z.coerce.date(),
    pickupWindowEnd: z.coerce.date(),
    claimExpiresAt: z.coerce.date(),
    safetyNotes: z.string().trim().max(1000).optional(),
    urgencyHint: z.number().min(0).max(1).default(0.5),
    imageUrl: z.url().max(2000).optional(),
  })
  .refine((d) => d.pickupWindowEnd > d.pickupWindowStart, {
    message: "Pickup window end must be after the start",
    path: ["pickupWindowEnd"],
  })
  .refine((d) => d.claimExpiresAt > new Date(), {
    message: "Claim deadline must be in the future",
    path: ["claimExpiresAt"],
  })
  .refine((d) => d.claimExpiresAt <= d.pickupWindowEnd, {
    message: "Claim deadline must be at or before the pickup window ends",
    path: ["claimExpiresAt"],
  });

export const updateListingSchema = createListingSchema;

export type CreateListingInput = z.infer<typeof createListingSchema>;

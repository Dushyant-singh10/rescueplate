import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const orgSchema = z.object({
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().min(3).max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  // Only meaningful (and required) for receiver orgs — used by the
  // allocation engine's capacity-match scoring.
  capacityKg: z.number().positive().max(1000000).optional(),
});

function requireOrgFields(data: { role: string; org?: { capacityKg?: number } }, ctx: z.RefinementCtx) {
  if ((data.role === "donor" || data.role === "receiver") && !data.org) {
    ctx.addIssue({
      code: "custom",
      message: "Organization details are required for donor and receiver accounts",
      path: ["org"],
    });
  }
  if (data.role === "receiver" && data.org && data.org.capacityKg == null) {
    ctx.addIssue({
      code: "custom",
      message: "Storage capacity is required for receiver organizations",
      path: ["org", "capacityKg"],
    });
  }
}

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email(),
    password: z.string().min(8).max(72),
    phone: z.string().trim().max(20).optional(),
    role: z.enum(["donor", "receiver", "volunteer"]),
    org: orgSchema.optional(),
  })
  .superRefine(requireOrgFields);

export const onboardingSchema = z
  .object({
    phone: z.string().trim().max(20).optional(),
    role: z.enum(["donor", "receiver", "volunteer"]),
    org: orgSchema.optional(),
  })
  .superRefine(requireOrgFields);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;

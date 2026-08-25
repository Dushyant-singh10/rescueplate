import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["donor", "receiver", "volunteer"]),
  org: z
    .object({
      name: z.string().trim().min(2).max(150),
      address: z.string().trim().min(3).max(300),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
}).refine(
  (data) => (data.role === "donor" || data.role === "receiver" ? !!data.org : true),
  { message: "Organization details are required for donor and receiver accounts", path: ["org"] }
);

export const onboardingSchema = z.object({
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["donor", "receiver", "volunteer"]),
  org: z
    .object({
      name: z.string().trim().min(2).max(150),
      address: z.string().trim().min(3).max(300),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
}).refine(
  (data) => (data.role === "donor" || data.role === "receiver" ? !!data.org : true),
  { message: "Organization details are required for donor and receiver accounts", path: ["org"] }
);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;

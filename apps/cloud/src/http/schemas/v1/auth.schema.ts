import {z} from 'zod'

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase())
const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .refine((password) => new TextEncoder().encode(password).length <= 72, 'Password must not exceed 72 UTF-8 bytes')

export const registerSchema = z.object({
  tenantName: z.string().trim().min(2).max(100),
  tenantSlug: z.string().trim().toLowerCase().min(2).max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens'),
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  tenantSlug: z.string().trim().toLowerCase().min(2).max(48),
  email: emailSchema,
  password: z.string().min(1).max(72),
})

export const forgotPasswordSchema = z.object({
  tenantSlug: z.string().trim().toLowerCase().min(2).max(48),
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
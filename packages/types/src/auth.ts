import { z } from 'zod';
import { IdSchema, PlanSchema } from './common.js';
import { RoleSchema } from './roles.js';

/** Inscription d'un nouveau propriétaire : crée le tenant + l'utilisateur OWNER. */
export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nomComplet: z.string().min(1),
  nomBoutique: z.string().min(1),
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof SignInSchema>;

/** Invitation d'un membre par le propriétaire/gérant. */
export const InviteUserSchema = z.object({
  email: z.string().email(),
  nomComplet: z.string().min(1),
  role: RoleSchema,
});
export type InviteUserInput = z.infer<typeof InviteUserSchema>;

/** Contexte utilisateur résolu depuis le JWT à chaque requête. */
export const AuthContextSchema = z.object({
  userId: IdSchema,
  tenantId: IdSchema,
  role: RoleSchema,
  email: z.string().email(),
  plan: PlanSchema,
});
export type AuthContext = z.infer<typeof AuthContextSchema>;

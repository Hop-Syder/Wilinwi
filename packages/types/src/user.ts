import { z } from 'zod';
import { IdSchema, MODULES } from './common.js';
import { RoleSchema } from './roles.js';

const PinSchema = z
  .string()
  .regex(/^\d{4,6}$/, 'Le PIN doit comporter 4 à 6 chiffres');

/**
 * Création d'un collaborateur par le propriétaire.
 * - `email` optionnel : si absent → utilisateur **PIN-only** (pas de compte Supabase).
 * - `customPermissions` + `permissions` : overrides de modules (sinon défauts du rôle).
 */
export const CreateUserSchema = z
  .object({
    nom: z.string().min(1),
    role: RoleSchema,
    poste: z.string().min(1).optional(),
    email: z.string().email().optional(),
    pin: PinSchema.optional(),
    customPermissions: z.boolean().default(false),
    permissions: z.array(z.enum(MODULES)).default([]),
    /** Établissements auxquels l'employé a accès. */
    etablissementIds: z.array(IdSchema).default([]),
  })
  .refine((u) => u.email || u.pin, {
    message: 'Un email (mot de passe) ou un PIN est requis pour la connexion',
    path: ['pin'],
  });
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  nom: z.string().min(1).optional(),
  role: RoleSchema.optional(),
  poste: z.string().min(1).nullable().optional(),
  actif: z.boolean().optional(),
  customPermissions: z.boolean().optional(),
  permissions: z.array(z.enum(MODULES)).optional(),
  /** Établissements auxquels l'employé a accès (remplace la liste existante). */
  etablissementIds: z.array(IdSchema).optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const SetPinSchema = z.object({ pin: PinSchema });
export type SetPinInput = z.infer<typeof SetPinSchema>;

/** Connexion par PIN sur poste partagé (session tenant déjà établie sur l'appareil). */
export const PinLoginSchema = z.object({ userId: IdSchema, pin: PinSchema });
export type PinLoginInput = z.infer<typeof PinLoginSchema>;

/** Vue d'un utilisateur renvoyée au propriétaire (jamais le hash du PIN). */
export interface UserDto {
  id: string;
  nom: string;
  email: string | null;
  role: z.infer<typeof RoleSchema>;
  poste: string | null;
  actif: boolean;
  customPermissions: boolean;
  permissions: string[];
  hasPin: boolean;
  /** Établissements auxquels l'employé a accès. */
  etablissementIds: string[];
}

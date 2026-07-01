/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Référentiel Pays → Villes d'Afrique (onboarding localisation du siège).
 *   Source de vérité partagée : le sélecteur du pop-up (web) et la validation de
 *   l'endpoint (API) consomment la même liste.
 * @created 2026-07-01
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { z } from 'zod';

/** Pays couverts (Afrique de l'Ouest & Centrale francophone en priorité). */
export const AFRICAN_COUNTRIES = {
  Bénin: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon', 'Natitingou', 'Djougou', 'Ouidah'],
  Togo: ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé', 'Dapaong'],
  "Côte d'Ivoire": ['Abidjan', 'Yamoussoukro', 'Bouaké', 'Daloa', 'San-Pédro', 'Korhogo', 'Man'],
  Sénégal: ['Dakar', 'Touba', 'Thiès', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Mbour'],
  'Burkina Faso': ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora'],
  Mali: ['Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Kayes', 'Koutiala'],
  Niger: ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua'],
  Guinée: ['Conakry', 'Kankan', 'Labé', 'Nzérékoré', 'Kindia'],
  Nigeria: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Kaduna'],
  Ghana: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast'],
  Cameroun: ['Douala', 'Yaoundé', 'Garoua', 'Bafoussam', 'Bamenda', 'Maroua'],
  Gabon: ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem'],
  Congo: ['Brazzaville', 'Pointe-Noire', 'Dolisie'],
  'RD Congo': ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma', 'Bukavu'],
  Tchad: ["N'Djamena", 'Moundou', 'Sarh', 'Abéché'],
  Mauritanie: ['Nouakchott', 'Nouadhibou', 'Kiffa'],
  Maroc: ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir'],
  Algérie: ['Alger', 'Oran', 'Constantine', 'Annaba'],
  Tunisie: ['Tunis', 'Sfax', 'Sousse', 'Kairouan'],
} as const satisfies Record<string, readonly string[]>;

export type AfricanCountry = keyof typeof AFRICAN_COUNTRIES;

export const COUNTRY_NAMES = Object.keys(AFRICAN_COUNTRIES) as AfricanCountry[];

/** Villes d'un pays donné (liste vide si pays inconnu). */
export function citiesOf(pays: string): readonly string[] {
  return (AFRICAN_COUNTRIES as Record<string, readonly string[]>)[pays] ?? [];
}

/**
 * Localisation du siège de l'entreprise (onboarding). La ville doit appartenir
 * au pays choisi — cohérence garantie côté API comme côté formulaire.
 */
export const TenantLocalisationSchema = z
  .object({
    pays: z.string().min(1, 'Pays requis'),
    ville: z.string().min(1, 'Ville requise'),
  })
  .refine((v) => citiesOf(v.pays).includes(v.ville), {
    message: 'La ville ne correspond pas au pays sélectionné',
    path: ['ville'],
  });

export type TenantLocalisationInput = z.infer<typeof TenantLocalisationSchema>;

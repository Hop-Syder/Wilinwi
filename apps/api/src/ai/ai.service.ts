/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Service métier pour l'assistant vocal Wilinwi AI. Orchestre :
 *   transcript → Gemini → validation Zod (schéma d'intention FERMÉ) →
 *   vérification de capacité propre à l'intention → dispatch vers les
 *   services de domaine existants. Principe non négociable : « Gemini
 *   propose, Wilinwi vérifie » — aucune sortie de Gemini n'est jamais
 *   traitée comme une autorisation ou une instruction d'exécution ; seule la
 *   capacité réelle de l'utilisateur (vérifiée ici, en code) autorise quoi
 *   que ce soit. Ce service n'écrit jamais lui-même en base.
 * @created 2026-09-08
 * @updated 2026-09-08
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  VoiceIntentSchema,
  hasCapability,
  type AuthContext,
  type Capability,
  type ProductDto,
  type VoiceInterpretRequest,
  type VoiceInterpretResult,
  type VoiceIntentType,
} from '@wilinwi/types';
import { AnalyticsService } from '../analytics/analytics.service';
import { EtablissementService } from '../etablissement/etablissement.service';
import { matchProducts } from '../stock/product-search';
import { StockService } from '../stock/stock.service';
import { buildSystemPrompt } from './ai.mapper';
import { AiUnavailableError, GeminiClient } from './gemini.client';

type CartItemInput = { query: string; quantity: number };
type ResolvedCartItem = NonNullable<VoiceInterpretResult['resolvedCartItems']>[number];

/**
 * Capacité minimale requise pour chaque intention, en plus de `ai:use` (déjà
 * vérifiée par le contrôleur). Une seule route dessert plusieurs intentions à
 * exigences différentes → la vérification se fait ici, explicitement, et non
 * via un unique `@RequireCapabilities` sur la route.
 */
const INTENT_CAPABILITY: Partial<Record<VoiceIntentType, Capability>> = {
  // Intentionnellement `sale:create`, pas `stock:read` : `resolveItems()`
  // (→ StockService.search()) reste accessible à quiconque peut vendre,
  // même sans vision large du stock — `interpret()` a déjà vérifié cette
  // capacité avant tout dispatch, donc l'appel interne à StockService n'a
  // pas besoin d'un second garde-fou redondant (audit indépendant, réf.
  // recommandation Priorité 1.2 : ceci est la trace de traçabilité demandée,
  // pas un chemin non gardé).
  ADD_PRODUCTS_TO_CART: 'sale:create',
  QUERY_SALES_TODAY: 'reports:read',
  // Expose des chiffres d'autres boutiques → exigence renforcée (cf. plan Phase 3).
  QUERY_TOP_SHOP: 'reports:read_full',
  // Même source et même capacité que la page Stock (StockService.alerts) —
  // CASHIER a désormais stock:read (fix BUG-001, audit indépendant), donc
  // cette question vocale lui est accessible aussi, cohérent avec la règle
  // énoncée ici (« même capacité que la page Stock »).
  QUERY_STOCK_LOW: 'stock:read',
  // Même raisonnement que ADD_PRODUCTS_TO_CART ci-dessus : `supplier:manage`
  // gouverne déjà l'accès à cette intention avant tout appel à
  // `resolveItems()`, intentionnellement découplé de `stock:read`.
  CREATE_REPLENISHMENT_DRAFT: 'supplier:manage',
};

@Injectable()
export class AiService {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly stock: StockService,
    private readonly analytics: AnalyticsService,
    private readonly etablissements: EtablissementService,
  ) {}

  async interpret(ctx: AuthContext, req: VoiceInterpretRequest): Promise<VoiceInterpretResult> {
    const systemPrompt = buildSystemPrompt(req.context);

    let raw: string;
    try {
      raw = await this.gemini.interpret(systemPrompt, req.transcript);
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        return { ok: false, error: 'AI_UNAVAILABLE' };
      }
      throw err;
    }

    // Toute sortie non conforme au JSON attendu ou au schéma fermé dégrade en
    // "indisponible" — jamais de dispatch best-effort sur une donnée non fiable.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'AI_UNAVAILABLE' };
    }
    const parsed = VoiceIntentSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { ok: false, error: 'AI_UNAVAILABLE' };
    }
    const intent = parsed.data;

    // Le rôle effectif est celui de la session authentifiée (AuthContext),
    // jamais celui que le transcript prétendrait imposer.
    const requiredCapability = INTENT_CAPABILITY[intent.intent];
    if (requiredCapability && !hasCapability(ctx.role, requiredCapability)) {
      return { ok: false, error: 'FORBIDDEN' };
    }

    switch (intent.intent) {
      case 'NEEDS_CLARIFICATION':
        return { ok: true, clarification: { question: intent.question, candidates: [] } };

      case 'UNKNOWN':
        // Puits mort : `intent.raw` n'est utilisé qu'à des fins de diagnostic
        // (journalisation future), jamais réexécuté ni réinjecté en prompt.
        return { ok: false, error: 'AI_UNAVAILABLE' };

      case 'ADD_PRODUCTS_TO_CART':
        return this.resolveCart(ctx, intent.items);

      case 'QUERY_SALES_TODAY':
        return this.answerSalesToday(ctx);

      case 'QUERY_TOP_SHOP':
        return this.answerTopShop(ctx);

      case 'QUERY_STOCK_LOW':
        return this.answerStockLow(ctx);

      case 'CREATE_REPLENISHMENT_DRAFT':
        return this.resolveReplenishmentDraft(ctx, intent.destinationQuery, intent.items);
    }
  }

  /**
   * Résout chaque `{query, quantity}` contre le catalogue réel (Phase 1),
   * partagé par le panier vocal (brique 1) et le brouillon de
   * réapprovisionnement (brique 3, Phase 4) : 0 correspondance → signalé
   * "introuvable" (jamais silencieusement ignoré) ; 1 correspondance →
   * résolue directement ; ≥2 correspondances → seule une égalité EXACTE de
   * nom tranche, sinon on ne devine jamais (§29) et on s'arrête sur une
   * clarification portant sur l'item ambigu courant.
   */
  private async resolveItems(
    ctx: AuthContext,
    items: readonly CartItemInput[],
  ): Promise<{
    resolved: ResolvedCartItem[];
    unresolved: string[];
    clarification?: NonNullable<VoiceInterpretResult['clarification']>;
  }> {
    const resolved: ResolvedCartItem[] = [];
    const unresolved: string[] = [];

    for (const item of items) {
      const matches = await this.stock.search(ctx, item.query, 5);

      if (matches.length === 0) {
        unresolved.push(item.query);
        continue;
      }
      if (matches.length === 1) {
        resolved.push(toCartItem(matches[0]!, item));
        continue;
      }

      const exact = matches.filter((m) => sameName(m.nom, item.query));
      if (exact.length === 1) {
        resolved.push(toCartItem(exact[0]!, item));
        continue;
      }

      // Ambigu : on n'invente rien (§29). Les items déjà résolus avant
      // celui-ci sont conservés (pas de perte d'information) ; la
      // clarification ne porte que sur l'item courant — le reste de la
      // phrase est abandonné, l'utilisateur peut le redire après avoir précisé.
      return {
        resolved,
        unresolved,
        clarification: {
          question: `Plusieurs produits correspondent à « ${item.query} ». Lequel voulez-vous ?`,
          quantity: item.quantity,
          candidates: matches.map((m) => ({ productId: m.id, nom: m.nom, sku: m.sku })),
        },
      };
    }

    return { resolved, unresolved };
  }

  /**
   * Panier vocal (brique 1) : ne décrémente jamais le stock — seul
   * POST /pos/sales le fait, inchangé.
   */
  private async resolveCart(
    ctx: AuthContext,
    items: readonly CartItemInput[],
  ): Promise<VoiceInterpretResult> {
    const { resolved, unresolved, clarification } = await this.resolveItems(ctx, items);
    if (clarification) {
      return { ok: true, ...(resolved.length > 0 ? { resolvedCartItems: resolved } : {}), clarification };
    }
    return {
      ok: true,
      resolvedCartItems: resolved,
      ...(unresolved.length > 0 ? { unresolvedQueries: unresolved } : {}),
    };
  }

  /**
   * Brouillon de réapprovisionnement/transfert (brique 3, Phase 4) : résout
   * les produits (même discipline que le panier vocal) et la boutique
   * destinataire, puis renvoie un `draft` pré-formaté pour le formulaire de
   * dispatch EXISTANT — n'appelle JAMAIS `DispatchService.create()`. Si la
   * boutique n'est pas résolue sans ambiguïté (aucune ou plusieurs
   * correspondances), `destinationId` reste absent : le responsable la
   * choisit manuellement dans le formulaire, comme il le fait déjà
   * systématiquement pour la source.
   */
  private async resolveReplenishmentDraft(
    ctx: AuthContext,
    destinationQuery: string,
    items: readonly CartItemInput[],
  ): Promise<VoiceInterpretResult> {
    const [{ resolved, unresolved, clarification }, etablissements] = await Promise.all([
      this.resolveItems(ctx, items),
      this.etablissements.listAccessible(ctx),
    ]);

    if (clarification) {
      return { ok: true, clarification };
    }

    const destMatches = matchProducts(etablissements, destinationQuery, 5);
    const exactDest = destMatches.filter((e) => sameName(e.nom, destinationQuery));
    const destination = destMatches.length === 1 ? destMatches[0] : exactDest.length === 1 ? exactDest[0] : undefined;

    return {
      ok: true,
      draft: {
        ...(destination ? { destinationId: destination.id, destinationNom: destination.nom } : {}),
        items: resolved.map((r) => ({ productId: r.productId, nom: r.nom, quantite: r.quantite })),
      },
      ...(unresolved.length > 0 ? { unresolvedQueries: unresolved } : {}),
    };
  }

  /**
   * « Combien avons-nous vendu aujourd'hui ? » — réutilise AnalyticsService.dashboard()
   * (déjà scopé tenant/établissement + capacité reports:read). Le texte de
   * réponse est construit ici, côté backend, à partir des chiffres réels —
   * Gemini n'a fait que classifier la question, il n'a jamais vu ni renvoyé de chiffre.
   */
  private async answerSalesToday(ctx: AuthContext): Promise<VoiceInterpretResult> {
    const dash = await this.analytics.dashboard(ctx);
    return {
      ok: true,
      answer: {
        text: `Aujourd'hui : ${dash.ventesDuJour.toLocaleString('fr-FR')} FCFA de ventes, ${dash.articlesVendus} article(s) vendu(s).`,
        data: { ventesDuJour: dash.ventesDuJour, articlesVendus: dash.articlesVendus },
      },
    };
  }

  /**
   * « Quelle boutique a le plus vendu ? » — réutilise AnalyticsService.report(),
   * dont `parEtablissement` couvre déjà toutes les boutiques du tenant
   * indépendamment de l'établissement courant. Scopé à la journée en cours,
   * comme `answerSalesToday`. Capacité renforcée (reports:read_full) : expose
   * des chiffres d'autres boutiques que celle de l'appelant.
   */
  private async answerTopShop(ctx: AuthContext): Promise<VoiceInterpretResult> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const rapport = await this.analytics.report(ctx, start.toISOString(), end.toISOString());
    const top = [...rapport.parEtablissement].sort((a, b) => b.ventes - a.ventes)[0];

    if (!top || top.ventes === 0) {
      return { ok: true, answer: { text: "Aucune vente aujourd'hui pour le moment.", data: {} } };
    }
    return {
      ok: true,
      answer: {
        text: `${top.nom} a le plus vendu aujourd'hui : ${top.ventes.toLocaleString('fr-FR')} FCFA (${top.nombreVentes} vente(s)).`,
        data: {
          etablissementId: top.etablissementId,
          nom: top.nom,
          ventes: top.ventes,
          nombreVentes: top.nombreVentes,
        },
      },
    };
  }

  /**
   * « Quels produits sont en stock faible ? » — réutilise StockService.alerts()
   * (même source que la page Stock, capacité stock:read, aucune écriture).
   */
  private async answerStockLow(ctx: AuthContext): Promise<VoiceInterpretResult> {
    const alerts = await this.stock.alerts(ctx);
    if (alerts.length === 0) {
      return { ok: true, answer: { text: 'Aucun produit en stock faible pour le moment.', data: { count: 0 } } };
    }
    const top = alerts.slice(0, 5);
    const suffix = alerts.length > top.length ? '…' : '';
    return {
      ok: true,
      answer: {
        text: `${alerts.length} produit(s) en stock faible : ${top
          .map((a) => `${a.productNom} (${a.quantite})`)
          .join(', ')}${suffix}.`,
        data: { count: alerts.length, items: top },
      },
    };
  }
}

function sameName(nom: string, query: string): boolean {
  return nom.trim().toLowerCase() === query.trim().toLowerCase();
}

function toCartItem(product: ProductDto, item: CartItemInput): ResolvedCartItem {
  return {
    productId: product.id,
    sku: product.sku ?? undefined,
    nom: product.nom,
    quantite: item.quantity,
    prixReel: product.prixCatalogue,
    matchedQuery: item.query,
  };
}

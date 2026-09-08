/**
 * Tests unitaires de la classification des échecs de synchronisation : chaque
 * erreur de création de vente doit aboutir à un résultat de protocole clair
 * (permanence + motif structuré éventuel) pour que le client sache quoi faire.
 */
import { BadRequestException, HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SaleValidationError } from '../pos/sale-validation';
import { classifySyncError } from './sync-logic';

describe('classifySyncError — classification des échecs de sync', () => {
  it('un rejet classé est permanent et porte son motif structuré', () => {
    const err = new SaleValidationError('BELOW_FLOOR', 'Opération refusée : …');
    expect(classifySyncError(err)).toEqual({
      permanent: true,
      kind: 'BELOW_FLOOR',
      error: 'Opération refusée : …',
    });
  });

  it('une validation métier 4xx non classée est permanente, sans motif', () => {
    const c = classifySyncError(new BadRequestException('Données invalides'));
    expect(c.permanent).toBe(true);
    expect(c.kind).toBeUndefined();
    expect(c.error).toBe('Données invalides');
  });

  it('une erreur 5xx est transitoire (l’auto-retry finira par passer)', () => {
    const c = classifySyncError(new HttpException('Service indisponible', 503));
    expect(c.permanent).toBe(false);
    expect(c.kind).toBeUndefined();
  });

  it('une erreur inconnue (réseau…) est transitoire et expose son message', () => {
    const c = classifySyncError(new Error('fetch failed'));
    expect(c.permanent).toBe(false);
    expect(c.error).toBe('fetch failed');
  });

  it('une valeur non-Error donne un message générique (jamais de crash du lot)', () => {
    const c = classifySyncError('plantage');
    expect(c.permanent).toBe(false);
    expect(c.error).toBe('Erreur inconnue');
  });
});

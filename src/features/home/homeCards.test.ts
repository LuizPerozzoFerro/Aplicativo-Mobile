import { createRepositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';

import type { Catalog } from '@/domain/catalog';

import { loadHomeCards } from './homeCards';

const NOW = new Date('2026-11-07T13:00:00.000Z');
const TOMORROW = new Date('2026-11-08T13:00:00.000Z');

const catalog = (days: number[]): Catalog => ({
  formatVersion: 1,
  contentVersion: 1,
  updatedAt: '2026-11-22',
  compulsions: {
    short_videos: {
      milestones: days.map((day) => ({
        day,
        title: 'Marco',
        summary: 'Resumo',
        body: 'Texto',
        references: [],
        free: true,
        video: null,
      })),
    },
  },
});

it('o card mostra o limite em vigor: no dia de um aumento, ainda o antigo', async () => {
  const { db } = await createTestDatabase();
  const repositories = createRepositories(db, () => NOW);
  const { id } = repositories.compulsions.add({
    type: 'short_videos',
    startedAt: NOW,
    dailyLimitMinutes: 45,
  });
  repositories.compulsions.changeDailyLimit(id, 90);

  const limitAt = (now: Date) => {
    const [card] = loadHomeCards(repositories, catalog([1, 3]), now);
    return card?.kind === 'moderation' ? card.dailyLimitMinutes : null;
  };
  expect(limitAt(NOW)).toBe(45);
  expect(limitAt(TOMORROW)).toBe(90);
});

it('o próximo marco vem do catálogo; sem a compulsão no catálogo, da lista de reserva', async () => {
  const { db } = await createTestDatabase();
  const repositories = createRepositories(db, () => NOW);
  repositories.compulsions.add({ type: 'short_videos', startedAt: NOW, dailyLimitMinutes: 45 });
  repositories.compulsions.add({ type: 'pornography', startedAt: NOW });

  const cards = loadHomeCards(repositories, catalog([2, 5]), TOMORROW);
  const next = Object.fromEntries(
    cards.map((card) => [card.compulsion.type, card.overview.nextMilestone]),
  );
  expect(next).toEqual({ short_videos: 2, pornography: 3 });
});

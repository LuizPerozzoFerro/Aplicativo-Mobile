import { createRepositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';

import { loadHomeCards } from './homeCards';

const NOW = new Date('2026-11-07T13:00:00.000Z');
const TOMORROW = new Date('2026-11-08T13:00:00.000Z');

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
    const [card] = loadHomeCards(repositories, now);
    return card?.kind === 'moderation' ? card.dailyLimitMinutes : null;
  };
  expect(limitAt(NOW)).toBe(45);
  expect(limitAt(TOMORROW)).toBe(90);
});

import { SQLiteStorage } from 'expo-sqlite/kv-store';

import { parseSimulationSnapshot, type SimulationSnapshot } from '@/domain/streakSimulation';

// Onde a ferramenta "Simular uma streak" (spec 04, 5.12) guarda o que mudou,
// para o "Desfazer a simulação" funcionar mesmo depois de fechar o app. Fica
// fora do banco do app, num arquivo próprio do armazenamento chave-valor do
// expo-sqlite (já instalado; sem biblioteca nova), fora do backup como o resto
// (`allowBackup: false`). Só a tela de conferência do desenvolvimento usa.

const DATABASE = 'quedo-dev-tools.db';
const KEY = 'streak-simulation';

type KeyValueStore = {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): boolean;
};

let storage: KeyValueStore | null = null;

/** Cria o armazenamento só no primeiro uso: fora do desenvolvimento, nunca. */
function store(): KeyValueStore {
  if (storage === null) {
    storage = new SQLiteStorage(DATABASE);
  }
  return storage;
}

export const simulationStore = {
  read(): SimulationSnapshot | null {
    return parseSimulationSnapshot(store().getItemSync(KEY));
  },
  save(snapshot: SimulationSnapshot): void {
    store().setItemSync(KEY, JSON.stringify(snapshot));
  },
  clear(): void {
    store().removeItemSync(KEY);
  },
};

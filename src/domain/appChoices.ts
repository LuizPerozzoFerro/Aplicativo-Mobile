import type { MonitoredAppRole } from './compulsion';
import { isSuggestedPackage } from './suggestedApps';

// O que a lista de escolha de apps mostra (decisão de 08/11/2026, NOTAS-APP.md):
// um aparelho real tem centenas de apps, então só os sugeridos e os já marcados
// ficam à vista, e o resto fica atrás de "Ver outros apps". As opções chegam já
// em ordem alfabética.

export type AppChoice = { readonly value: string; readonly label: string };

export type AppChoiceView = {
  readonly role: MonitoredAppRole;
  readonly selected: readonly string[];
  readonly expanded: boolean;
  readonly query: string;
};

/** Sem acentos e sem diferença de maiúsculas: "camera" acha "Câmera". */
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getVisibleAppChoices<T extends AppChoice>(
  options: readonly T[],
  { role, selected, expanded, query }: AppChoiceView,
): T[] {
  const suggested = options.filter((option) => isSuggestedPackage(role, option.value));
  const others = options.filter((option) => !isSuggestedPackage(role, option.value));
  if (!expanded) return [...suggested, ...others.filter((o) => selected.includes(o.value))];
  const search = normalizeForSearch(query);
  if (search === '') return [...suggested, ...others];
  return options.filter((option) => normalizeForSearch(option.label).includes(search));
}

/** Há o que mostrar em "Ver outros apps"? Sugeridos e marcados já estão à vista. */
export function hasOtherAppChoices(
  options: readonly AppChoice[],
  role: MonitoredAppRole,
  selected: readonly string[],
): boolean {
  return options.some(
    (option) => !isSuggestedPackage(role, option.value) && !selected.includes(option.value),
  );
}

/**
 * A seleção depois de um toque numa lista parcial: `changed` só conhece o que
 * estava à vista, e o resto da seleção não pode se perder. Na ordem das opções;
 * um app que não está mais instalado sai, como antes.
 */
export function mergeAppSelection(
  options: readonly AppChoice[],
  visible: readonly AppChoice[],
  selected: readonly string[],
  changed: readonly string[],
): string[] {
  const shown = new Set(visible.map((option) => option.value));
  const next = new Set([...selected.filter((id) => !shown.has(id)), ...changed]);
  return options.map((option) => option.value).filter((id) => next.has(id));
}

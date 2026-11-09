import { getVisibleAppChoices, hasOtherAppChoices, mergeAppSelection } from './appChoices';

const INSTAGRAM = { value: 'com.instagram.android', label: 'Instagram' };
const CAMERA = { value: 'com.example.camera', label: 'Câmera' };
const CHROME = { value: 'com.example.chrome', label: 'Chrome' };
const NOTES = { value: 'com.example.notes', label: 'Notas' };
const OPTIONS = [CAMERA, CHROME, INSTAGRAM, NOTES];
const COLLAPSED = {
  role: 'short_video',
  selected: [] as string[],
  expanded: false,
  query: '',
} as const;

describe('getVisibleAppChoices', () => {
  it('recolhida: só os sugeridos', () => {
    expect(getVisibleAppChoices(OPTIONS, COLLAPSED)).toEqual([INSTAGRAM]);
  });

  it('recolhida: o marcado que não é sugerido continua à vista, depois dos sugeridos', () => {
    expect(getVisibleAppChoices(OPTIONS, { ...COLLAPSED, selected: [CAMERA.value] })).toEqual([
      INSTAGRAM,
      CAMERA,
    ]);
  });

  it('sugerido é por papel: o que serve para vídeos não sobe na lista de risco', () => {
    expect(getVisibleAppChoices(OPTIONS, { ...COLLAPSED, role: 'risk' })).toEqual([]);
  });

  it('expandida: sugeridos no topo e o resto na ordem recebida', () => {
    expect(getVisibleAppChoices(OPTIONS, { ...COLLAPSED, expanded: true })).toEqual([
      INSTAGRAM,
      CAMERA,
      CHROME,
      NOTES,
    ]);
  });

  it('um app marcado na lista expandida não muda de lugar', () => {
    expect(
      getVisibleAppChoices(OPTIONS, { ...COLLAPSED, expanded: true, selected: [NOTES.value] }),
    ).toEqual([INSTAGRAM, CAMERA, CHROME, NOTES]);
  });

  it.each([
    ['sem acento', 'camera'],
    ['com acento', 'CÂMERA'],
    ['com espaços', '  câm '],
  ])('a busca ignora acentos e maiúsculas: %s', (_name, query) => {
    expect(getVisibleAppChoices(OPTIONS, { ...COLLAPSED, expanded: true, query })).toEqual([
      CAMERA,
    ]);
  });

  it('a busca acha o meio do nome e pode não achar nada', () => {
    const view = { ...COLLAPSED, expanded: true };
    expect(getVisibleAppChoices(OPTIONS, { ...view, query: 'rom' })).toEqual([CHROME]);
    expect(getVisibleAppChoices(OPTIONS, { ...view, query: 'zzz' })).toEqual([]);
  });

  it('a busca não vale com a lista recolhida', () => {
    expect(getVisibleAppChoices(OPTIONS, { ...COLLAPSED, query: 'camera' })).toEqual([INSTAGRAM]);
  });
});

describe('hasOtherAppChoices', () => {
  it('há outros quando sobra app fora dos sugeridos e marcados', () => {
    expect(hasOtherAppChoices(OPTIONS, 'short_video', [])).toBe(true);
  });

  it('todos à vista: não há o que expandir', () => {
    expect(hasOtherAppChoices([INSTAGRAM, CAMERA], 'short_video', [CAMERA.value])).toBe(false);
  });
});

describe('mergeAppSelection', () => {
  it('marcar na busca mantém o que estava fora dela', () => {
    expect(mergeAppSelection(OPTIONS, [NOTES], [CAMERA.value], [NOTES.value])).toEqual([
      CAMERA.value,
      NOTES.value,
    ]);
  });

  it('desmarcar na busca tira só aquele', () => {
    expect(mergeAppSelection(OPTIONS, [NOTES], [CAMERA.value, NOTES.value], [])).toEqual([
      CAMERA.value,
    ]);
  });

  it('app que não está mais instalado sai da seleção', () => {
    expect(mergeAppSelection(OPTIONS, [NOTES], ['com.example.gone'], [NOTES.value])).toEqual([
      NOTES.value,
    ]);
  });
});

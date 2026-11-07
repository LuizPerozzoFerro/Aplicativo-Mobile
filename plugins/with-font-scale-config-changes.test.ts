import { EXTRA_CONFIG_CHANGES, mergeConfigChanges } from './with-font-scale-config-changes';

describe('mergeConfigChanges', () => {
  it('acrescenta fontScale e density ao valor gerado pelo Expo', () => {
    expect(
      mergeConfigChanges(
        'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|assetsPaths',
        EXTRA_CONFIG_CHANGES,
      ),
    ).toBe(
      'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|assetsPaths|fontScale|density',
    );
  });

  it('não repete valores que já existem', () => {
    expect(mergeConfigChanges('fontScale|uiMode', EXTRA_CONFIG_CHANGES)).toBe(
      'fontScale|uiMode|density',
    );
  });

  it('funciona sem valor anterior', () => {
    expect(mergeConfigChanges(undefined, EXTRA_CONFIG_CHANGES)).toBe('fontScale|density');
    expect(mergeConfigChanges('', EXTRA_CONFIG_CHANGES)).toBe('fontScale|density');
  });
});

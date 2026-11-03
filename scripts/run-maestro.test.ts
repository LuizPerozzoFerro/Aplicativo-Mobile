import path from 'node:path';

import { QUIET_ENV, resolveMaestro } from './run-maestro';

const HOME = path.join('C:', 'Users', 'someone');
const installed = path.join(HOME, 'tools', 'maestro', 'bin', 'maestro.bat');

describe('resolveMaestro', () => {
  it('usa MAESTRO_HOME quando existe', () => {
    const custom = path.join('D:', 'maestro', 'bin', 'maestro.bat');
    expect(
      resolveMaestro({
        env: { MAESTRO_HOME: path.join('D:', 'maestro') },
        platform: 'win32',
        home: HOME,
        exists: (file) => file === custom || file === installed,
      }),
    ).toBe(custom);
  });

  it('sem MAESTRO_HOME, usa a instalação em ~/tools/maestro', () => {
    expect(
      resolveMaestro({
        env: {},
        platform: 'win32',
        home: HOME,
        exists: (file) => file === installed,
      }),
    ).toBe(installed);
  });

  it('sem instalação conhecida, cai no PATH com o nome da plataforma', () => {
    const none = () => false;
    expect(resolveMaestro({ env: {}, platform: 'win32', home: HOME, exists: none })).toBe(
      'maestro.bat',
    );
    expect(resolveMaestro({ env: {}, platform: 'linux', home: HOME, exists: none })).toBe(
      'maestro',
    );
  });
});

it('sempre desliga o analytics do Maestro', () => {
  expect(QUIET_ENV.MAESTRO_CLI_NO_ANALYTICS).toBe('true');
});

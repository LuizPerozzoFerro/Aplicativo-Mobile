// Babel padrão do Expo, mais o inline-import, que embute no bundle os arquivos
// .sql das migrações geradas pelo drizzle-kit (https://orm.drizzle.team/docs/connect-expo-sqlite).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};

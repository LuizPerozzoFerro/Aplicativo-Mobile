// Migrações .sql embutidas como texto pelo babel-plugin-inline-import.
declare module '*.sql' {
  const content: string;
  export default content;
}

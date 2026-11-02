// Fuso fixo para os testes, igual no computador e no CI (que roda em UTC). O
// de São Paulo teve horário de verão até 2019, com a troca à meia-noite: é o
// caso mais difícil para a borda do dia (src/domain/day.test.ts). Trocar o
// process.env.TZ dentro de um teste não tem efeito no Jest; aqui, antes dos
// workers, tem.
module.exports = () => {
  process.env.TZ = 'America/Sao_Paulo';
};

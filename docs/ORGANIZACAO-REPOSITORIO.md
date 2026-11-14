# Organização do repositório — 14/11/2026

Repositório público: `AnderCSilva84/pontov3`. Branch padrão confirmada no GitHub: `master`. A referência local `origin/HEAD` antes apontava para `main`, de forma desatualizada.

## Históricos preservados

- `master`: base anterior `aabad8a`.
- `feat/ponto-operacoes-offline`: base consolidada `06531c9`.
- `feat/rebrand-ta-no-ponto`: evolução atual, inicialmente no mesmo `06531c9`, com alterações acumuladas sem commit.
- `main`: commit inicial `3633429`, sem ancestral comum com a branch de trabalho. Não apagar nem sobrescrever.

## Critério de organização

Salvar a evolução em grupos: backend e regras; interface PWA e testes; Android e ferramentas; documentação. Os grupos pertencem à mesma evolução integrada, com verificação do conjunto final. Não implicam publicação ou homologação individual de cada funcionalidade.

Novas capturas de homologação ficam locais por poderem conter informações pessoais. As imagens já rastreadas são preservadas; esta organização não equivale a uma auditoria ou limpeza do histórico público existente. Credenciais, builds, configurações de assinatura e evidências em `output/` continuam ignorados.

## Fluxo futuro

1. Vincular a tarefa a uma issue do GitHub Projects.
2. Trabalhar em branch específica, usando `codex/` para novas branches criadas pelo agente.
3. Registrar critério de aceite e executar verificações pertinentes.
4. Fazer commits descritivos e enviar a branch para revisão.
5. Integrar à `master` e publicar apenas no escopo autorizado da rodada.

Não fazer force push, excluir branches antigas ou juntar os históricos de `main` e `master` como parte de uma simples sincronização. Recursos em teste, como experimentos de QR, devem ter sua situação documentada antes de um release.

## Verificação do conjunto organizado

- `npm test`: 391 testes, 334 aprovados, 57 condicionais ignorados, nenhuma falha.
- `npm run lint`: aprovado após configurar os arquivos JavaScript do backend como CommonJS e remover diretivas redundantes; nenhuma regra de negócio alterada para resolver o lint.
- `npm run build`: aprovado.
- Varredura dos arquivos preparados não encontrou os padrões verificados de chaves privadas e tokens. Não substitui uma auditoria completa de segurança.
- Nenhuma nova rodada de emuladores, instalação Android ou homologação física foi executada nesta organização. Não considerar o checkout automaticamente pronto para produção.

Commits de código: `f13bb64` (backend), `1d13752` (interface/testes), `f54a0a1` (Android/ferramentas). A documentação e as regras de arquivos locais completam o grupo final.

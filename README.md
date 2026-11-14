# Tá no Ponto

Aplicativo para organização de ponto, compras, tarefas, lembretes e rotina em grupo. Interface React/Vite, backend Firebase e empacotamento mobile com Capacitor. PWA e Android têm recursos distintos; a edição da loja não inclui cuidados de pessoas e pets.

## Estrutura

| Pasta | Responsabilidade |
| --- | --- |
| src/ | Telas, componentes, serviços, estilos e utilitários |
| functions/ | Backend Firebase e regras de domínio |
| android/, ios/ | Projetos nativos Capacitor |
| public/ | Ícones, manifest e páginas públicas |
| tests/ | Testes unitários e integrações com emuladores |
| scripts/ | Build, validações e ferramentas de publicação |
| docs/ | Documentação técnica, homologação e acompanhamento ágil |
| output/ | Evidências e artefatos locais, ignorados no Git |

## Desenvolvimento e verificação

Configure o ambiente a partir de .env.example e .env.mobile.example. Não versione credenciais, configurações locais de assinatura nem arquivos nativos de serviços Google.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Alguns testes de integração dependem dos emuladores e são ignorados quando o ambiente necessário não está disponível. O backend tem dependências próprias em functions/; use npm ci nessa pasta para instalá-las. Não use dados reais para testes de escrita.

## Branches e publicação

A branch padrão do GitHub é master. A evolução acumulada está em feat/rebrand-ta-no-ponto, baseada em feat/ponto-operacoes-offline. A branch remota main possui um histórico inicial separado e não deve receber merge automático nem force push.

Fluxo: salvar mudanças em commits → enviar a branch → revisar → integrar à branch principal quando autorizado. Enviar código não equivale a publicar o aplicativo.

Builds, AABs/APKs, instalações, deploys Firebase/Netlify e lançamentos na Play são etapas separadas. Siga os validadores existentes e a autorização da rodada. Em comandos Firebase, sempre informe explicitamente --project ponto-app-1c55a: o alias default local aponta para outro projeto.

## Acompanhamento

- [Quadro ágil e critérios de aceite](docs/ACOMPANHAMENTO-AGIL.md)
- [Preparação do primeiro lançamento público](docs/mobile/primeiro-lancamento-publico.md)
- [Homologação mobile](docs/mobile/homologacao-codigo-3.md)
- [Notificações push](NOTIFICACOES_PUSH.md)
- [Organização do repositório](docs/ORGANIZACAO-REPOSITORIO.md)

O checkout contém melhorias em homologação e ensaios locais de QR; não representa automaticamente uma versão publicada ou inteiramente homologada.
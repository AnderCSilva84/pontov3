# Contas independentes por grupo

Publicado em 21/10/2026, após autorização do titular. As quatro contas existentes foram migradas para `ap1303-principal`, mantendo seus UIDs, perfis e vínculos funcionais. Foram copiados 2.641 documentos, incluindo subcoleções; backup local protegido e documentos de origem foram preservados. Os perfis de origem ficaram desativados após a troca atômica dos vínculos.

## Dados e identidade

Cada login tem um vínculo global protegido em `vinculosUsuarios/{uid}`. O servidor resolve esse vínculo e acessa `grupos/{grupoId}/{colecao}/{id}`. O cliente não escolhe o grupo pelo corpo da requisição. IDs e estruturas dos módulos existentes foram preservados.

Nesta etapa um login pertence a um grupo. O cadastro em `/cadastro` cria o titular administrador e seu grupo; os administradores cadastram acessos individuais em Gestão. A criação de membros é idempotente e pode retomar uma criação interrompida após o login ter sido criado.

| Perfil | Compras | Ponto | Folha e comprovantes |
|---|---|---|---|
| Administrador | Monta e realiza compras do grupo | Consulta funcionários, sem registrar ponto | Administra dados do grupo |
| Funcionário | Monta listas compartilhadas, sem realizar compras | Registra e consulta o próprio ponto | Consulta seus documentos e folhas fechadas/pagas |
| Consulta | Consulta/monta listas conforme comportamento existente | Sem registro de ponto | Sem gestão de dados trabalhistas |

Grupos distintos não compartilham dados. Perfis, notificações, lembretes e serviços de compras usam o mesmo contexto protegido. A troca de sessão desmonta as telas anteriores e limpa seu estado.

O vínculo pessoal autorizado do No Bolso consulta a origem no grupo correto. A API de preços já autorizada ao servidor do No Bolso acompanha o grupo original migrado por meio do marcador de migração; não agrega dados de novos grupos. URLs externas de comprovantes mantêm as características de acesso do armazenamento original; esta etapa protege a consulta dos registros, sem converter links públicos existentes em arquivos privados.

## Migração das contas existentes

Contas legadas usam suas coleções atuais até uma migração explícita. O conjunto original já foi migrado após conferência do UID do administrador Anderson no inventário real. Não se altera o UID de login.

`scripts/migrar-grupo.cjs` exige projeto explícito e, por padrão, apenas gera inventário e assinatura:

```powershell
node scripts/migrar-grupo.cjs --project PROJETO --titular UID_REVISADO --grupo ID_DO_GRUPO --nome "Nome do grupo"
```

A aplicação exige `--aplicar --assinatura ASSINATURA_REVISADA`. Antes de executar em produção: revisar titular e inventário, garantir backup e publicar código/regras compatíveis em uma janela controlada. O script bloqueia o legado, aguarda seis minutos para solicitações anteriores, copia documentos e subcoleções para grupo inativo, verifica a assinatura e ativa vínculos em uma transação. Os documentos originais são mantidos. Uma mudança concorrente aborta o procedimento e libera o legado. O limite técnico de 200 perfis protege o corte transacional; não representa limite comercial de plano.

## Arquivos centrais

- Backend: `functions/grupos-contexto.cjs`, `grupos.cjs`, `grupos-migracao.cjs`; integração nos serviços de ponto, compras, folha, lembretes, push e ponte No Bolso.
- Cliente: `src/services/dadosGrupo.js`, `auth.js`, `src/App.jsx`, `CadastroGrupo.jsx`, `MeusComprovantes.jsx`, navegação e serviços existentes.
- Segurança: `firestore.rules`; os testes verificam as regras e as operações no servidor.
- Migração: `scripts/migrar-grupo.cjs`.
- Testes: `tests/grupos-emulador.test.cjs`, `grupos-migracao-emulador.test.cjs`, `roles.test.js`.

## Verificação

`npm run lint`, `npm test`, `npm run build` e `npm run test:compras:integracao`.

Os cenários cobrem dois grupos com IDs de produtos/listas iguais, compras compartilhadas dentro do grupo, tentativas de acesso cruzado, escalada de perfil, ponto restrito, comprovantes próprios, notificações isoladas, retomada de cadastro e migração com dados aninhados. A conferência visual local usou apenas contas fictícias: cadastro do titular e funcionário, listas do grupo, jornada ainda sem marcações e pasta mensal de comprovantes. Evidência em `output/grupos/comprovantes-proprios.png`.

Limites de planos, assinaturas e publicação nas lojas ficam para outra etapa.

Entrega desta rodada: lint e build aprovados; 85 testes unitários, 62 testes da suíte de integração e revalidações dedicadas da migração e permissões. O frontend publicado foi comparado por hash com o pacote local; cinco funções HTTP recusaram chamadas sem login com `UNAUTHENTICATED`. Foram publicadas 24 funções, com proteção adicional para não notificar eventos históricos da cópia.

Conferência pós-migração: 2.641 documentos comparados integralmente com o backup e quatro vínculos conferidos em 21/10/2026. A manutenção foi encerrada e a sessão existente carregou o histórico e o gráfico em produção. Deploy Netlify: 6ad946c44f388cc315707ec8.

# Escritório no Free e histórico — 15/11/2026

Entrega local da segunda etapa da #9, após a permissão fiscal. Objetivo: impedir uso operacional do Escritório no Free, preservando consulta/exportação dos registros existentes. Nenhum deploy, ativação de assinaturas, cobrança ou alteração de dados de produção.

## Proteção no servidor

As transações de salvar/fechar/pagar folha, criar pagamentos comuns e especiais, criar/cancelar parcelas e excluir lançamentos verificam `escritorioContabil` no direito privado vigente, com revalidação de grupo/vínculo/perfil/exclusão. Free e assinatura expirada são recusados. Prata/Ouro/Diamante mantêm a operação conforme perfil administrativo. As permissões administrativas de pagamento/exclusão são novamente verificadas na transação final.

Novo callable `escritorioOperacao`: editar cadastro contábil, criar filial, registrar documento externo e excluir documento. Aceita operações/campos delimitados; não recebe grupo, plano, role ou estado de funcionário. O cadastro não permite reativar funcionário ou alterar sua cota por parâmetro. Grupo deriva da sessão e os direitos são lidos na mesma transação da escrita. Filiais/documentos têm identificação estável e marcador privado: repetição não duplica nem recria um documento já excluído.

O cadastro básico de funcionário continua no callable de cotas, necessário também para o ponto Free. Isso não concede edição dos campos contábeis nem acesso à seção Escritório.

## Regras de gravação direta

Em grupos com `assinaturasAtivas: true`, criação/alteração de filiais, documentos trabalhistas e folhas exige backend, inclusive nos planos pagos. Campos contábeis de funcionário também passam pelo callable. Atualizações diretas continuam delimitadas aos dados básicos e configurações de ponto, preservando o bloqueio de reativação e as cotas. Regras de leitura do histórico e de histórico próprio não foram ampliadas para terceiros.

Dados legados e grupos em transição mantêm seus fluxos anteriores; nenhum grupo foi habilitado nesta rodada.

## Interface e histórico

A rota operacional `/admin/financeiro` só monta o Escritório após confirmar a capacidade pelo servidor. No Free, informa disponibilidade a partir do Prata e oferece planos/histórico. Erro de consulta não abre a operação.

Gestão possui atalho independente para `/historico-contabil`, sem depender da consulta de assinatura. Administrador consulta pagamentos, folhas e documentos por competência ou todo o histórico, incluindo registros antigos sem competência. A tela não oferece criação, edição, exclusão ou pagamento. Links de documentos usam o abridor existente. Funcionários continuam no fluxo de seus próprios comprovantes, respeitando as regras anteriores.

A exportação de resumo em PDF usa jsPDF/AutoTable e `PdfAcoes`, com os controles de sessão e o transporte Android existentes. Arquivo fica vinculado à conta/grupo que o gerou; alteração de contexto invalida o uso pelo serviço de arquivos. A versão nova não usa nomes pessoais fixos do gerador antigo de recibos.

## Verificação

- 31 testes nos emuladores Auth/Firestore `demo-ap1303` aprovados: quatro planos, bloqueio das operações, gravação direta, histórico após expiração, histórico próprio/isolações, transição e regressão de folha, adiantamentos, grupos e QR.
- Após o marcador final de idempotência, 7 testes direcionados repetidos e aprovados, incluindo tentativa antiga de recriar documento excluído.
- Suíte geral: 370 aprovados, 63 ignorados, zero falhas. Lint e build web aprovados.
- Evidências locais: `output/escritorio-emulador.log`, `output/escritorio-idempotencia-emulador.log`, `output/escritorio-suite.log`, `output/escritorio-lint.log`, `output/escritorio-build.log`.

## Limites e próxima etapa

Conferência da tela autenticada, responsividade e abertura/salvamento do PDF no Android/PWA ainda pendentes. Não declarar homologação física ou publicação com base nos testes automatizados. AAB 6 é anterior a esta entrega.

Próxima frente: compartilhamento e gestão dos usuários existentes após expiração, preservando consulta própria e conclusão de jornadas abertas. Depois: ponto no aparelho do titular no Free e cobrança/homologação completa. A concessão administrativa Diamante do criador (#14), migração e ativação permanecem pendentes.

Publicar frontend, Functions e regras compatíveis no ciclo da candidata completa #7/#9. Não habilitar `assinaturasAtivas` em produção antes da cobertura restante.

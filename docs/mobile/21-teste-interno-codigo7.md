# Código 7 no teste interno e homologação física

15/11/2026 — #11, #9 e candidata completa #7.

## Publicação confirmada

Arquivo `output/Ta-no-Ponto-7-1.0.0-Homologacao.aab`, SHA-256 `AEECC68718F43BED16166BA45F2E654135234E7EB86DE6C184DF9FB53C61177B`, enviado à Play Console. Código **7**, versão **1.0.0**, nome da versão interna **7 (1.0.0) - Validação interna**.

Console confirmou **Disponível para testadores internos** na faixa interna do AP1303/br.dev.acstech.ap1303. Não houve promoção para Produção. Nenhum pacote anterior incluído na nova versão. Notas deixam explícito que compras de assinaturas continuam indisponíveis.

Revisão: zero erros, sem perda/ganho de dispositivos em relação ao código 6. Permanecem dois avisos não bloqueantes: arquivo de desofuscação e símbolos de depuração nativos. Formatos, API mínima24 e target36 preservados. Evidência da disponibilidade: `output/candidata7-play-interno.png`.

Código 7 consumido: `android/release.local.json` deixa `versionCodeDisponivel:false` para impedir reutilização acidental. A próxima geração para envio precisa de novo código disponível conferido no Console. AABs existentes preservados.

## Situação da homologação

Atualização do titular em 15/11/2026: **“APP Atualizado na play. Usuário continuou logado.”** Atualização e preservação da sessão confirmadas por relato. A informação anterior de ausência de Atualizar está superada; sem confirmação técnica por ADB do código instalado. Demais testes funcionais continuam pendentes.

Publicação na faixa interna é comprovada; instalação e comportamento no Android físico ainda dependem do retorno do titular. Pedido enviado para atualizar pela Play sem desinstalar/limpar dados. Nenhum aparelho conectado por ADB nesta conferência. O nome 1.0.0 isoladamente não comprova o código instalado.

| Verificação física | Estado |
| --- | --- |
| Atualizar pela Play e manter sessão | Confirmado pelo titular em 15/11/2026 |
| Conferir vínculo e dados visíveis sem regressão | Pendente de verificação funcional |
| Minha conta → Planos: comparação legível e contratação indisponível | Pendente |
| Gestão → Escritório: cartões, competência, valores e navegação legíveis | Pendente |
| Acompanhamento de ponto: equipe/horários/histórico sem regressão | Pendente |
| Compras/tarefas/lembretes: abrir telas e conferir teclado/navegação | Pendente |
| GPS, notificações e sincronização: usar dados/conta de teste no roteiro controlado | Pendente |

Não registrar ponto, alterar folha, excluir conta ou executar compra real só para testar. Não limpar filas do aparelho. Registrar problemas com tela, passos e versão, sem credenciais ou dados pessoais. Se a Play ainda não oferecer atualização, conferir a conta inscrita e aguardar propagação; não reinstalar como tentativa de correção.

O grupo dedicado permanece em transição e gates de homologação desligados. Por isso, esta rodada física começa pela interface e compatibilidade; não comprova ponto do titular no regime Free comercial nem compra/ACK/cancelamento/expiração. Esses testes exigem completar cobertura/backend/regras e habilitar somente o grupo de teste revisado.

## Registro do progresso

#11/#9 e lançamento #7 continuam abertos. Quadro deve mostrar implementação/validação em andamento, sem concluir a homologação pelo simples envio do AAB. Fluxograma e resumo atual foram atualizados para mostrar código 7 já disponível na faixa interna.

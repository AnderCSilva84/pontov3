# Comprovantes

Atualização publicada em https://ponto.acstech.dev.br em 13/10/2026, deploy Netlify `6acea21b517cebc42808f92c`.

- Aba Documentos renomeada para Comprovantes.
- Recibos agrupados pelo mês da data de pagamento, do mais recente ao mais antigo. A competência continua preservada nos dados do pagamento.
- Arquivos cadastrados por link têm campo Mês do comprovante. Nos antigos, usa-se o mês do cadastro no fuso America/Fortaleza. Sem data válida, aparecem em Sem mês informado, sem serem excluídos ou escondidos.
- Cada item oferece Abrir, Compartilhar e Apagar. Apagar exige confirmação; no caso de recibos, remove também o lançamento financeiro pelo serviço existente, com auditoria.
- Para um recibo, Compartilhar prepara o PDF e abre a visualização. Compartilhar PDF abre o menu nativo do celular para escolher WhatsApp, email ou outro destino instalado. O segundo toque preserva o gesto exigido pelo navegador após a geração assíncrona do arquivo.
- Arquivos cadastrados por link são compartilhados pelo link original. Sem menu nativo, há opções de WhatsApp e email. PDFs sem suporte a compartilhamento de arquivos podem ser baixados e anexados manualmente.
- Links executáveis, URLs temporárias de blob e URLs com credenciais não são usados como links externos de compartilhamento. O PDF é enviado como arquivo, não por sua URL temporária local.

Verificação: 23 testes automatizados, lint e build passaram. O bundle de produção contém a nova aba, o campo mensal e os controles de compartilhamento. Ainda falta confirmação do envio real pelo menu de compartilhamento do iPhone.

Referência: [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API).

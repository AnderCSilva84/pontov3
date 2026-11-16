"""Gera o mapa factual do app em PNG, sem dados pessoais ou credenciais."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'arquitetura'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 4000, 5790
im = Image.new('RGB', (W, H), '#f3f6fc')
d = ImageDraw.Draw(im)
INK, MUTED, LINE = '#172640', '#51647e', '#8396b1'
COLORS = {'base':'#2368ae', 'live':'#168267', 'local':'#7656ba', 'todo':'#b77914', 'neutral':'#53657e'}
PALE = {'base':'#edf5ff', 'live':'#eaf8f2', 'local':'#f3edff', 'todo':'#fff6e5', 'neutral':'#edf1f6'}
def font(size=34,bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/'+('seguisb.ttf' if bold else 'segoeui.ttf'),size)
def text(x,y,s,size=34,bold=False,fill=INK):
    d.text((x,y),s,font=font(size,bold),fill=fill)
def lines(s,width,size):
    result=[]
    for p in s.split('\n'):
        if not p:
            result.append(''); continue
        row=''
        for word in p.split():
            test=(row+' '+word).strip()
            if d.textlength(test,font=font(size))>width and row:
                result.append(row);row=word
            else:row=test
        result.append(row)
    return result
def para(x,y,s,width,size=33,fill=MUTED,gap=9):
    for row in lines(s,width,size):
        text(x,y,row,size,fill=fill);y+=size+gap
    return y
def box(x,y,w,h,title,body,kind='base',badge=None,size=33):
    d.rounded_rectangle((x+2,y+6,x+w+2,y+h+6),radius=22,fill='#e2e8f2')
    d.rounded_rectangle((x,y,x+w,y+h),radius=22,fill='white',outline='#d5deeb',width=2)
    d.rounded_rectangle((x,y,x+w,y+12),radius=6,fill=COLORS[kind])
    yy=y+30
    if badge:
        text(x+28,yy,badge.upper(),23,True,COLORS[kind]); yy+=41
    titles=lines(title,w-56,39)
    for row in titles:text(x+28,yy,row,39,True);yy+=49
    yy+=14
    end=para(x+28,yy,body,w-56,size)
    if end>y+h-12:raise ValueError(f'Texto excedeu cartão: {title}: {end} > {y+h}')
def arrow(x1,y1,x2,y2,label=None):
    d.line((x1,y1,x2,y2),fill=LINE,width=5)
    if x2>x1:d.polygon([(x2,y2),(x2-16,y2-10),(x2-16,y2+10)],fill=LINE)
    elif y2>y1:d.polygon([(x2,y2),(x2-10,y2-16),(x2+10,y2-16)],fill=LINE)
    if label:text((x1+x2)/2-65,(y1+y2)/2-37,label,24,fill=MUTED)
def section(y,n,title,subtitle):
    d.rounded_rectangle((90,y,152,y+62),radius=15,fill=INK)
    text(106,y+6,str(n),36,True,'white')
    text(175,y-1,title,43,True)
    text(175,y+61,subtitle,29,fill=MUTED)
def row(y,h,items,connect=False):
    n=len(items); gap=54; margin=90; w=(W-2*margin-(n-1)*gap)//n
    for i,it in enumerate(items):
        x=margin+i*(w+gap);box(x,y,w,h,*it)
        if connect and i<n-1:arrow(x+w+5,y+h/2,x+w+gap-6,y+h/2)

# Cabeçalho e legenda: status não equivalem a lançamento integral.
d.rectangle((0,0,W,238),fill=INK)
text(90,34,'TÁ NO PONTO  /  MAPA COMPLETO DO APLICATIVO',61,True,'white')
text(94,116,'Situação em 15/11/2026 · arquitetura, operação, cobrança e caminho até o lançamento',34,fill='#dbe7fa')
for i,(kind,label) in enumerate([('base','Base existente'),('live','Implantado / verificado'),('local','Local / candidata'),('todo','Pendente / bloqueado')]):
    x=94+i*955;d.ellipse((x,183,x+23,206),fill=COLORS[kind]);text(x+38,174,label,29,fill='white')

section(275,1,'Organização e entrega','O GitHub Projects acompanha o trabalho; não executa o aplicativo nem publica automaticamente.')
row(397,310,[
 ('GitHub Projects','A fazer → Em andamento\n→ Em validação → Concluído\nIssues #7, #9 e dependências.','base','Acompanhamento'),
 ('Repositório GitHub','Código + documentação + scripts.\nBranch/commits → revisão → integração.\nMudanças locais ≠ código publicado.','base','Desenvolvimento'),
 ('Verificação técnica','Lint + testes + emuladores.\nBuild web + build Android assinado.\nTeste automatizado ≠ teste no celular.','base','Qualidade'),
 ('Distribuição separada','PWA: Netlify / domínio HTTPS.\nBackend: Firebase / Google Cloud.\nAndroid: Play Console / faixas.','base','Publicação')
],True)

section(755,2,'Entrada no aplicativo','A mesma base de interface atende canais diferentes; cada canal tem permissões e recursos próprios.')
row(875,355,[
 ('Frontend React + Vite','Telas, navegação, formulários,\ncomparação de planos e geração PDF.\nRefino recente na versão 7 em teste.','base','Interface'),
 ('PWA ou Android','PWA: navegador + instalação web.\nAndroid: Capacitor + plugins nativos.\nLoja interna: código 7; teste físico pendente.\niOS nativo: sem lançamento comprovado.','base','Canais'),
 ('Firebase Authentication','Entrar / recuperar senha / sessão.\nToken identifica a pessoa no backend.\nSair preserva tentativas incertas;\nexclusão tem fluxo próprio.','base','Identidade'),
 ('Grupo + perfil + acesso','Titular, funcionário ou consulta.\nVínculo, exclusão e permissões\nsão revalidados no servidor.\nGrupos atuais ainda em transição.','base','Autorização')
],True)
arrow(2000,1240,2000,1295,'módulos')

section(1320,3,'O que as pessoas usam','Módulos da base; melhorias atuais têm implantação e homologação distintas, descritas abaixo.')
row(1440,385,[
 ('Ponto e jornadas','GPS / local autorizado.\nEntrada, intervalo e saída.\nEscala, banco de horas,\najustes e revisão.\n44h / 42h / 40h no código.\n#6: publicação conjunta pendente.','base','Operação',30),
 ('Gestão e Escritório','Cadastros e acesso da equipe.\nFolha, salários, pagamentos,\nvales e adiantamentos.\nDocumentos, comprovantes\ne histórico / exportação.','base','Administração'),
 ('Compras e notas','Listas e itens manuais.\nQR / consulta fiscal.\nAssociação de produtos.\nCategorias, preços,\ncentral e relatórios.','base','Compras'),
 ('Rotina do grupo','Tarefas fixas e avulsas.\nLembretes, anexos e avisos.\nAlimentação e receitas.\nCuidados de pessoas/pets:\nsomente PWA habilitada.','base','Rotina'),
 ('Conta e planos','Plano e limites do grupo.\nGestão do próprio acesso.\nRecuperação e exclusão.\nHistórico permitido / PDF.\nIntegração No Bolso.','base','Conta')
])

section(1875,4,'Como os dados circulam','Acesso online, acesso direto autorizado e sincronização têm caminhos diferentes.')
row(1995,305,[
 ('Online → Cloud Functions','App envia pedido autenticado → servidor valida\npessoa/grupo/perfil, regra do recurso e cota.\nTransações + operação idempotente → confirmação.','base','Regras de negócio'),
 ('Firestore direto → Security Rules','Algumas leituras/escritas usam SDK Firebase.\nRegras controlam acesso a documentos do grupo.\nCobertura comercial nova: código local / rollout pendente.','base','Proteção dos dados'),
 ('Sem rede / resposta incerta','Ponto próprio usa fila local / IndexedDB.\nReconcilia a operação original ao voltar a conexão.\nTerminal Free do titular exige conexão; preserva envio incerto.','local','Continuidade')
])
text(90,2320,'As funções usam dados, arquivos e integrações; o acesso direto autorizado chega ao Firestore.',29,fill=MUTED)
row(2380,350,[
 ('Firestore','Grupos, usuários, ponto e rotina.\nAssinaturas/recibos privados.\nHistórico e auditoria preservados.\nCliente não concede plano.','base','Dados persistentes'),
 ('Arquivos e exportação','Cloud Storage para anexos,\nmediados pelo backend.\nPDFs gerados/exportados no app.\nSem acesso público irrestrito.','base','Documentos'),
 ('Notificações FCM','Eventos + rotinas no servidor\n→ dispositivos cadastrados\n→ avisos PWA / Android.\nDependem de permissão e rede.','base','Retorno ao usuário'),
 ('Serviços externos','Consulta fiscal / SEFA-PA.\nCentral de preços e No Bolso.\nLinks / imagens de receitas.\nAcesso conforme recurso e consentimento.','base','Integrações')
])

text(90,2740,'DECISÃO COMERCIAL  •  Grupo em transição → mantém acessos. Regime ativo → vigência no servidor → plano válido ou Free → cotas e permissões.',28,fill=MUTED)

section(2785,5,'Assinaturas: o que está ligado e o que ainda está fechado','Não há contratação liberada. A conexão de notificações não equivale a cobrança homologada.')
row(2910,340,[
 ('Android / Google Play Billing','Ponte nativa e recuperação na candidata 7.\nPreço de Android vem da loja.\nInício de compra: DESABILITADO.\nTeste físico da compra: PENDENTE.','local','Cliente preparado'),
 ('Play Console → Pub/Sub','Prata / Ouro / Diamante: rascunhos.\nRTDN conectado ao tópico dedicado.\nTeste enviado pelo painel e recebido.\nProdução do app ainda não lançada.','live','Transporte verificado'),
 ('Backend de assinatura','6 rotinas de assinatura + 5 APIs de suporte.\nConsulta/verificação/entrega de TESTE + RTDN.\nReconhecimento após entrega + retomada 15min.\nGates desligados; grupo teste em transição.','live','Implantação parcial do produto')
],True)
box(90,3290,3820,180,'Fluxo de liberação previsto e implementado para homologação',
    'Compra ativa verificada na API da loja → direito privado + entrega atômica → recursos/cotas → reconhecimento (ACK).\nRTDN → nova consulta da API → renovação, suspensão ou expiração. Compra pendente não libera plano.', 'local',size=27)
row(3480,275,[
 ('PWA → Mercado Pago','Aplicação e contas de teste criadas.\nCheckout, segredos e assinatura real:\nAINDA NÃO INTEGRADOS.','todo','Canal web pendente'),
 ('Webhooks / ciclo de cobrança','Implementar e validar pagamento, renovação,\ncancelamento, reembolso e eventos repetidos.\nEvitar assinatura duplicada entre canais.','todo','Backend pendente'),
 ('Direitos do grupo','Nenhum grupo migrado nesta rodada.\nNão ativar cotas antes do rollout completo\nde regras, operações e homologação.','todo','Ativação comercial pendente')
],True)

section(3810,6,'Planos definidos — regras aprovadas, venda ainda indisponível','Limites por grupo; histórico preservado. Funcionários contam enquanto não arquivados.')
row(3930,340,[
 ('Free · R$ 0','2 funcionários / 3 listas.\n20 tarefas / 10 lembretes.\nPonto no aparelho do titular.\nSem compartilhamento, Escritório ou QR.','neutral','Mensal'),
 ('Prata · R$ 14,90','5 funcionários / 10 listas.\n100 tarefas / 30 lembretes.\nCompartilhamento + Escritório.\nSem importação fiscal por QR.','neutral','Mensal'),
 ('Ouro · R$ 29,90','15 funcionários / 30 listas.\n200 tarefas / 100 lembretes.\nCompartilhamento + Escritório\n+ importação fiscal por QR.','neutral','Mensal'),
 ('Diamante · R$ 49,90','50 funcionários / 60 listas.\n500 tarefas / 200 lembretes.\nCompartilhamento + Escritório\n+ importação fiscal por QR.','neutral','Mensal')
])
box(90,4310,3820,235,'Expiração, continuidade e titularidade',
    'Fim da vigência confirmada → Free, com histórico permitido e conclusão de jornadas preservados.\nTitular deve selecionar até dois funcionários para novas entradas; não há seleção nem exclusão automática de dados.\nTransferência: automática no Free; com cobrança paga, procedimento assistido. A compra/liberação futura será automática.', 'local',size=32)

section(4560,7,'O que falta para lançar a versão completa','Pendências registradas no Projects; a conclusão depende de evidências, não apenas de código pronto.')
row(4685,355,[
 ('1. Teste interno · #11','Código 7 disponível na faixa interna.\nAtualizar pela Play sem limpar dados.\nConferir interface e fluxos no Android.\n1.0.0 sozinha não confirma o código.','todo','Próxima ação'),
 ('2. Cobrança · #9 / #12 / #15','Concluir produtos e testadores.\nHabilitar só teste controlado.\nValidar compra/ACK/renovação,\nrestauração, cancelamento e expiração.','todo','Homologação'),
 ('3. Migração e direitos · #9','Completar rollout de regras/cotas.\nConferir filas, locais e grupo de teste.\nMigrar grupos sem perder dados.\nValidar conflitos / troca de canal.','todo','Ativação segura'),
 ('4. Acabamento e criador','Refino visual: #13, validar em aparelho.\nConcessão Diamante do criador: #14,\nAINDA NÃO IMPLEMENTADA.\nNão fabricar recibo para essa concessão.','todo','Produto')
])
arrow(2000,5055,2000,5110)
box(90,5130,3820,330,'5. Candidata única → lançamento coordenado · #7',
    'Concluir Mercado Pago/PWA, homologação física, migração e demais critérios → revisar e aprovar a candidata.\nCódigo revisado no GitHub → backend + Security Rules → frontend PWA/Netlify → Android/Play Console.\nConferir ficha da loja, privacidade, suporte, exclusão e instalação pública → acompanhar falhas e notificações.\nAcesso à faixa Produção foi concedido; isso não significa que o aplicativo já esteja lançado ao público.', 'todo','Ainda pendente',size=34)

d.line((90,5470,3910,5470),fill='#c9d5e6',width=3)
para(90,5500,'LEITURA DO MAPA  •  Setas indicam fluxo ou dependência. Azul descreve a base do sistema; verde mostra marcos implantados e verificados; roxo identifica mudanças locais/candidata; âmbar indica o que falta. Um cartão pode conter etapas de estados diferentes, explicitadas no texto.',3820,29)
para(90,5625,'FONTES  •  src/, functions/, firebase.json, netlify.toml; docs/mobile/06–21; definição comercial #8; issues #7, #9 e #11–15. Snapshot documental de 15/11/2026. Sem segredos, recibos ou dados pessoais. GitHub Projects é gestão; Firebase/Netlify/Play são execução e distribuição.',3820,28)
im.save(OUT/'fluxograma-completo-2026-11-15.png',optimize=True)
print('Fluxograma gerado:',W,'x',H)

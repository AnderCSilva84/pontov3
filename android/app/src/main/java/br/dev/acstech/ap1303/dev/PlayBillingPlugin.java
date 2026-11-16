package br.dev.acstech.ap1303.dev;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.*;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin {
    private static final List<String> PRODUTOS = Arrays.asList("ta_no_ponto_prata", "ta_no_ponto_ouro", "ta_no_ponto_diamante");
    private final Handler main = new Handler(Looper.getMainLooper());
    private final BillingSessao sessao = new BillingSessao();
    private final Map<PluginCall, Pedido> pedidos = new HashMap<>();
    private final Map<String, ProductDetails> produtos = new HashMap<>();
    private BillingClient cliente;
    private boolean conectando;
    private boolean compraAberta;
    private String sessaoId;

    private static class Pedido {
        long geracao;
        Runnable iniciar, timeout;
        boolean iniciado;
    }

    @PluginMethod public void configurarSessao(PluginCall call) {
        main.post(() -> {
            String conta = call.getString("conta");
            String novaSessao = call.getString("sessao");
            if (conta == null || !conta.matches("[a-f0-9]{64}") || novaSessao == null || !novaSessao.matches("[a-f0-9-]{36}")) { call.reject("Entre novamente no grupo.", "billing/contexto"); return; }
            fechar();
            sessao.definir(conta);
            sessaoId = novaSessao;
            JSObject r = new JSObject(); r.put("comprasHabilitadas", BuildConfig.BILLING_COMPRAS_HABILITADAS);
            call.resolve(r);
        });
    }

    @PluginMethod public void encerrarSessao(PluginCall call) {
        main.post(() -> {
            // Limpeza atrasada da tela anterior não pode encerrar uma sessão nova.
            if (mesmaSessao(call)) fechar();
            call.resolve();
        });
    }

    private void fechar() {
        sessao.encerrar();
        for (PluginCall call : new ArrayList<>(pedidos.keySet())) falhar(call, "A sessão mudou. Consulte novamente.", "billing/sessao");
        produtos.clear(); compraAberta = false; conectando = false; sessaoId = null;
        if (cliente != null) { cliente.endConnection(); cliente = null; }
    }

    private boolean mesmaSessao(PluginCall call) {
        return sessaoId != null && sessaoId.equals(call.getString("sessao")) && sessao.pertence(call.getString("conta"));
    }
    private void preparar(PluginCall call, Runnable acao) {
        try { prepararInterno(call, acao); }
        catch (RuntimeException e) {
            if (pedidos.containsKey(call)) falhar(call, "A Google Play está indisponível. Tente novamente.", "billing/indisponivel");
            else call.reject("A Google Play está indisponível. Tente novamente.", "billing/indisponivel");
        }
    }
    private void prepararInterno(PluginCall call, Runnable acao) {
        if (!mesmaSessao(call)) { call.reject("Entre novamente no grupo.", "billing/sessao"); return; }
        Pedido pedido = new Pedido(); pedido.geracao = sessao.geracao(); pedido.iniciar = acao;
        pedido.timeout = () -> {
            falhar(call, "A Google Play não respondeu. Tente novamente.", "billing/timeout");
            if (pedidos.isEmpty() && conectando) {
                conectando = false;
                if (cliente != null) { cliente.endConnection(); cliente = null; }
            }
        };
        pedidos.put(call, pedido); main.postDelayed(pedido.timeout, 25000);
        if (cliente == null) {
            long rodada = sessao.geracao();
            cliente = BillingClient.newBuilder(getContext())
                .setListener((resultado, compras) -> main.post(() -> {
                    if (!sessao.atual(rodada)) return;
                    compraAberta = false;
                    JSObject evento = resumoCompras(compras);
                    evento.put("codigo", resultado.getResponseCode());
                    evento.put("cancelada", resultado.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED);
                    evento.put("conta", sessao.conta());
                    evento.put("sessao", sessaoId);
                    notifyListeners("comprasAtualizadas", evento, false);
                }))
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection().build();
        }
        if (cliente.isReady()) { executarPedidos(); return; }
        if (conectando) return;
        conectando = true;
        long rodada = sessao.geracao();
        final BillingClient conectandoCliente = cliente;
        cliente.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult resultado) {
                main.post(() -> {
                    if (!sessao.atual(rodada) || cliente != conectandoCliente) return;
                    conectando = false;
                    if (resultado.getResponseCode() == BillingClient.BillingResponseCode.OK) executarPedidos();
                    else for (PluginCall c : new ArrayList<>(pedidos.keySet())) falhar(c, "Compras indisponíveis nesta instalação da Google Play.", "billing/indisponivel");
                });
            }
            @Override public void onBillingServiceDisconnected() {
                main.post(() -> {
                    if (!sessao.atual(rodada) || cliente != conectandoCliente) return;
                    conectando = false;
                    JSObject r = new JSObject(); r.put("estado", "desconectado"); r.put("conta", sessao.conta());
                    r.put("sessao", sessaoId);
                    notifyListeners("conexaoAlterada", r, false);
                });
            }
        });
    }

    private void executarPedidos() {
        for (Pedido p : new ArrayList<>(pedidos.values())) {
            if (!p.iniciado && sessao.atual(p.geracao)) {
                p.iniciado = true;
                try { p.iniciar.run(); }
                catch (RuntimeException e) {
                    for (Map.Entry<PluginCall, Pedido> entrada : new ArrayList<>(pedidos.entrySet())) {
                        if (entrada.getValue() == p) falhar(entrada.getKey(), "Não foi possível consultar a Google Play.", "billing/indisponivel");
                    }
                }
            }
        }
    }
    private boolean valido(PluginCall call) {
        Pedido p = pedidos.get(call);
        return p != null && sessao.atual(p.geracao);
    }
    private void resolver(PluginCall call, JSObject resultado) {
        if (!valido(call)) return;
        Pedido p = pedidos.remove(call); main.removeCallbacks(p.timeout); call.resolve(resultado);
    }
    private void falhar(PluginCall call, String mensagem, String codigo) {
        Pedido p = pedidos.remove(call);
        if (p == null) return;
        main.removeCallbacks(p.timeout); call.reject(mensagem, codigo);
    }

    @PluginMethod public void consultarProdutos(PluginCall call) {
        main.post(() -> preparar(call, () -> {
            List<QueryProductDetailsParams.Product> lista = new ArrayList<>();
            for (String id : PRODUTOS) lista.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.SUBS).build());
            cliente.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(lista).build(), (resultado, detalhes) -> main.post(() -> {
                if (!valido(call)) return;
                if (resultado.getResponseCode() != BillingClient.BillingResponseCode.OK) { falhar(call, "Não foi possível consultar os planos da Google Play.", "billing/indisponivel"); return; }
                produtos.clear(); JSArray listaJs = new JSArray();
                for (ProductDetails produto : detalhes.getProductDetailsList()) {
                    if (!PRODUTOS.contains(produto.getProductId())) continue;
                    produtos.put(produto.getProductId(), produto);
                    JSObject item = new JSObject(); item.put("produtoId", produto.getProductId()); item.put("nome", produto.getName());
                    JSArray ofertas = new JSArray();
                    if (produto.getSubscriptionOfferDetails() != null) for (ProductDetails.SubscriptionOfferDetails oferta : produto.getSubscriptionOfferDetails()) {
                        // Sem promoções, parcelas ou pré-pago nesta primeira oferta.
                        if (!"mensal".equals(oferta.getBasePlanId()) || oferta.getOfferId() != null || oferta.getInstallmentPlanDetails() != null) continue;
                        List<ProductDetails.PricingPhase> fases = oferta.getPricingPhases().getPricingPhaseList();
                        if (fases.size() != 1 || !"P1M".equals(fases.get(0).getBillingPeriod()) || fases.get(0).getRecurrenceMode() != ProductDetails.RecurrenceMode.INFINITE_RECURRING) continue;
                        ProductDetails.PricingPhase fase = fases.get(0);
                        JSObject o = new JSObject(); o.put("planoBase", oferta.getBasePlanId()); o.put("preco", fase.getFormattedPrice()); o.put("moeda", fase.getPriceCurrencyCode());
                        // OfferToken fica apenas no nativo; cliente não escolhe oferta arbitrária.
                        ofertas.put(o);
                    }
                    item.put("ofertas", ofertas); listaJs.put(item);
                }
                JSObject r = new JSObject(); r.put("produtos", listaJs); r.put("comprasHabilitadas", BuildConfig.BILLING_COMPRAS_HABILITADAS); resolver(call, r);
            }));
        }));
    }

    @PluginMethod public void consultarCompras(PluginCall call) {
        main.post(() -> preparar(call, () -> cliente.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).includeSuspendedSubscriptions(true).build(), (resultado, compras) -> main.post(() -> {
            if (!valido(call)) return;
            if (resultado.getResponseCode() != BillingClient.BillingResponseCode.OK) { falhar(call, "Não foi possível consultar compras na Google Play.", "billing/indisponivel"); return; }
            resolver(call, resumoCompras(compras));
        }))));
    }

    private JSObject resumoCompras(List<Purchase> compras) {
        JSArray itens = new JSArray(); int outrasContas = 0;
        if (compras != null) for (Purchase compra : compras) {
            if (Collections.disjoint(compra.getProducts(), PRODUTOS)) continue;
            AccountIdentifiers ids = compra.getAccountIdentifiers();
            if (ids == null || !sessao.pertence(ids.getObfuscatedAccountId())) { outrasContas++; continue; }
            JSObject item = new JSObject(); item.put("produtoIds", new JSArray(compra.getProducts()));
            item.put("token", compra.getPurchaseToken()); item.put("pendente", compra.getPurchaseState() == Purchase.PurchaseState.PENDING);
            item.put("suspensa", compra.isSuspended()); item.put("reconhecida", compra.isAcknowledged());
            // PURCHASED não concede direito: token deve ser verificado/reconhecido no backend.
            item.put("verificada", false); itens.put(item);
        }
        JSObject r = new JSObject(); r.put("compras", itens); r.put("outrasContas", outrasContas); return r;
    }

    @PluginMethod public void comprar(PluginCall call) {
        main.post(() -> {
            // Guard nativo, não pode ser liberado por parâmetro JavaScript.
            if (!BuildConfig.BILLING_COMPRAS_HABILITADAS) { call.reject("A contratação ainda não está disponível.", "billing/nao-configurado"); return; }
            preparar(call, () -> {
                if (compraAberta) { falhar(call, "Há uma compra em andamento.", "billing/ocupado"); return; }
                ProductDetails produto = produtos.get(call.getString("produtoId"));
                if (produto == null || produto.getSubscriptionOfferDetails() == null) { falhar(call, "Consulte os planos novamente.", "billing/produto"); return; }
                ProductDetails.SubscriptionOfferDetails escolhida = null;
                for (ProductDetails.SubscriptionOfferDetails oferta : produto.getSubscriptionOfferDetails()) {
                    List<ProductDetails.PricingPhase> fases = oferta.getPricingPhases().getPricingPhaseList();
                    if ("mensal".equals(oferta.getBasePlanId()) && oferta.getOfferId() == null && oferta.getInstallmentPlanDetails() == null && fases.size() == 1 && "P1M".equals(fases.get(0).getBillingPeriod()) && fases.get(0).getRecurrenceMode() == ProductDetails.RecurrenceMode.INFINITE_RECURRING) escolhida = oferta;
                }
                if (escolhida == null) { falhar(call, "Plano mensal indisponível.", "billing/produto"); return; }
                BillingFlowParams params = BillingFlowParams.newBuilder().setObfuscatedAccountId(sessao.conta())
                    .setProductDetailsParamsList(Collections.singletonList(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(produto).setOfferToken(escolhida.getOfferToken()).build())).build();
                compraAberta = true;
                BillingResult resultado = cliente.launchBillingFlow(getActivity(), params);
                compraAberta = resultado.getResponseCode() == BillingClient.BillingResponseCode.OK;
                JSObject r = new JSObject(); r.put("codigo", resultado.getResponseCode()); r.put("aberta", compraAberta); r.put("verificada", false); resolver(call, r);
            });
        });
    }

    @Override protected void handleOnDestroy() { main.post(this::fechar); }

    @Override protected void handleOnResume() {
        main.post(() -> {
            if (cliente == null || !cliente.isReady() || sessao.conta() == null || compraAberta) return;
            long rodada = sessao.geracao();
            cliente.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).includeSuspendedSubscriptions(true).build(), (resultado, compras) -> main.post(() -> {
                if (!sessao.atual(rodada) || resultado.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
                JSObject r = resumoCompras(compras); r.put("conta", sessao.conta()); r.put("sessao", sessaoId); r.put("codigo", resultado.getResponseCode());
                notifyListeners("comprasAtualizadas", r, false);
            }));
        });
    }
}

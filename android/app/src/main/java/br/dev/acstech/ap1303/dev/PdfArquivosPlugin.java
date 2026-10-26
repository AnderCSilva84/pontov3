package br.dev.acstech.ap1303.dev;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.util.*;

@CapacitorPlugin(name = "PdfArquivos")
public class PdfArquivosPlugin extends Plugin {
    private String contexto = null;
    private final Map<String, File> arquivos = new HashMap<>();
    private final Map<String, File> entregas = new HashMap<>();
    private Set<String> ativos() { Set<String> nomes = new HashSet<>(); for (File f : entregas.values()) nomes.add(f.getName()); return nomes; }
    private void concluirEntrega(PluginCall call) { File f = entregas.remove(call.getCallbackId()); if (f != null) f.setLastModified(System.currentTimeMillis()); }
    private File pasta() { return new File(getContext().getCacheDir(), "ap1303-pdf"); }
    @Override public void load() { PdfCacheSeguro.limparAntigos(pasta(), System.currentTimeMillis()); }
    @PluginMethod public void invalidar(PluginCall call) { contexto = null; arquivos.clear(); call.resolve(); }
    @PluginMethod public void limparConta(PluginCall call) {
        String uid = call.getString("uid", "");
        if (!uid.matches("[A-Za-z0-9_-]{1,128}")) { call.reject("Conta inválida."); return; }
        String prefixo = "u_" + uid.length() + "_" + uid + "_";
        File[] lista = pasta().listFiles();
        if (lista != null) for (File f : lista) try {
            if (f.getName().startsWith(prefixo) && !ativos().contains(f.getName()) && PdfCacheSeguro.podeApagar(pasta(), f, System.currentTimeMillis(), true) && !f.delete()) { call.reject("Não foi possível limpar o cache PDF desta conta."); return; }
        } catch (IOException ignored) { call.reject("Cache não reconhecido; arquivos preservados."); return; }
        PdfCacheSeguro.limparAntigos(pasta(), System.currentTimeMillis(), ativos());
        if (contexto != null && contexto.startsWith(uid + ":")) { contexto = null; arquivos.clear(); }
        call.resolve();
    }
    @PluginMethod public void escrever(PluginCall call) {
        try {
            String atual = call.getString("contexto");
            String nome = call.getString("nome", "Documento.pdf");
            if (atual == null || !nome.matches("[A-Za-z0-9_.-]{1,104}\\.pdf")) { call.reject("Arquivo inválido."); return; }
            byte[] bytes = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
            if (bytes.length < 5 || bytes.length > 20 * 1024 * 1024 || !new String(bytes, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) { call.reject("PDF inválido."); return; }
            File dir = pasta(); if (!dir.exists() && !dir.mkdirs()) throw new IOException();
            PdfCacheSeguro.limparAntigos(dir, System.currentTimeMillis(), ativos());
            if (!atual.equals(contexto)) { arquivos.clear(); contexto = atual; }
            String id = UUID.randomUUID().toString();
            String uid = atual.split(":", 2)[0];
            if (!uid.matches("[A-Za-z0-9_-]{1,128}")) { call.reject("Sessão inválida."); return; }
            File file = new File(dir, "u_" + uid.length() + "_" + uid + "_" + id + ".pdf");
            try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); }
            arquivos.put(id, file);
            JSObject ret = new JSObject(); ret.put("id", id); call.resolve(ret);
        } catch (Exception e) { call.reject("Não foi possível gravar o PDF. Verifique o espaço disponível.", "PDF_WRITE"); }
    }
    @PluginMethod public void externo(PluginCall call) {
        try {
            Uri uri = Uri.parse(call.getString("url", ""));
            if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null || uri.getUserInfo() != null) { call.reject("Link inválido."); return; }
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
            call.resolve();
        } catch (Exception e) { call.reject("Não foi possível abrir o link no navegador."); }
    }
    private File obter(PluginCall call) {
        if (contexto == null || !contexto.equals(call.getString("contexto"))) return null;
        return arquivos.get(call.getString("id"));
    }
    @PluginMethod public void executar(PluginCall call) {
        File file = obter(call);
        if (file == null || !file.exists()) { call.reject("A sessão mudou. Gere o PDF novamente."); return; }
        try {
            String acao = call.getString("acao", "abrir");
            if ("escolher".equals(acao)) {
                getActivity().runOnUiThread(() -> new android.app.AlertDialog.Builder(getActivity()).setTitle("PDF AP1303")
                    .setItems(new String[]{"Abrir PDF", "Compartilhar PDF", "Salvar PDF"}, (dialog, which) -> {
                        call.getData().put("acao", new String[]{"abrir", "compartilhar", "salvar"}[which]); executar(call);
                    }).setOnCancelListener(dialog -> call.resolve()).show()); return;
            }
            if (!file.getName().endsWith("_entregue.pdf")) {
                File entregue = new File(pasta(), file.getName().replace(".pdf", "_entregue.pdf"));
                if (!file.renameTo(entregue)) { call.reject("Não foi possível preparar o PDF."); return; }
                arquivos.put(call.getString("id"), entregue); file = entregue;
            }
            file.setLastModified(System.currentTimeMillis());
            if ("salvar".equals(acao)) {
                entregas.put(call.getCallbackId(), file);
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/pdf").putExtra(Intent.EXTRA_TITLE, "AP1303.pdf");
                startActivityForResult(call, save, "salvo"); return;
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".pdfprovider", file);
            Intent intent;
            if ("compartilhar".equals(acao)) {
                intent = new Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM, uri);
            } else if ("abrir".equals(acao)) intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf");
            else { call.reject("Ação inválida."); return; }
            if ("abrir".equals(acao) && intent.resolveActivity(getContext().getPackageManager()) == null) { call.reject("Nenhum leitor de PDF disponível. Salve o PDF ou instale um leitor.", "PDF_NO_VIEWER"); return; }
            intent.setClipData(ClipData.newRawUri("PDF", uri)); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            entregas.put(call.getCallbackId(), file);
            startActivityForResult(call, Intent.createChooser(intent, "PDF AP1303"), "aberto");
        } catch (ActivityNotFoundException e) { concluirEntrega(call); call.reject("Nenhum aplicativo disponível para abrir PDF. Instale um leitor ou salve o arquivo.", "PDF_NO_VIEWER"); }
        catch (Exception e) { call.reject("Não foi possível abrir o PDF.", "PDF_OPEN"); }
    }
    @ActivityCallback private void aberto(PluginCall call, ActivityResult result) {
        if (call == null) return;
        concluirEntrega(call);
        if (obter(call) == null) { call.reject("A sessão mudou."); return; }
        // O Sharesheet não informa se o destinatário concluiu o envio. Cancelar não é erro.
        call.resolve();
    }
    @ActivityCallback private void salvo(PluginCall call, ActivityResult result) {
        if (call == null) return;
        concluirEntrega(call);
        File file = obter(call);
        if (file == null) { call.reject("A sessão mudou."); return; }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(); return; }
        try (InputStream in = new FileInputStream(file); OutputStream out = getContext().getContentResolver().openOutputStream(result.getData().getData())) {
            if (out == null) throw new IOException();
            byte[] buffer = new byte[8192]; int n; while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            call.resolve();
        } catch (Exception e) { call.reject("Não foi possível salvar o PDF.", "PDF_SAVE"); }
    }
}


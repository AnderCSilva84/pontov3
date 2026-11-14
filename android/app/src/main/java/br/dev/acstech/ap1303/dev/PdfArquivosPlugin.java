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
    private final Map<String, String> nomesAnexos = new HashMap<>();
    private final Map<String, File> entregas = new HashMap<>();
    private Set<String> ativos() { Set<String> nomes = new HashSet<>(); for (File f : entregas.values()) nomes.add(f.getName()); return nomes; }
    private void concluirEntrega(PluginCall call) { File f = entregas.remove(call.getCallbackId()); if (f != null) f.setLastModified(System.currentTimeMillis()); }
    private File pasta() { return new File(getContext().getCacheDir(), "ap1303-pdf"); }
    @Override public void load() { PdfCacheSeguro.limparAntigos(pasta(), System.currentTimeMillis()); }
    @PluginMethod public void invalidar(PluginCall call) { contexto = null; arquivos.clear(); nomesAnexos.clear(); call.resolve(); }
    @PluginMethod public void limparConta(PluginCall call) {
        String uid = call.getString("uid", "");
        if (!uid.matches("[A-Za-z0-9_-]{1,128}")) { call.reject("Conta inválida."); return; }
        String prefixo = "u_" + uid.length() + "_" + uid + "_";
        File[] lista = pasta().listFiles();
        if (lista != null) for (File f : lista) try {
            if (f.getName().startsWith(prefixo) && !ativos().contains(f.getName()) && PdfCacheSeguro.podeApagar(pasta(), f, System.currentTimeMillis(), true) && !f.delete()) { call.reject("Não foi possível limpar o cache PDF desta conta."); return; }
        } catch (IOException ignored) { call.reject("Cache não reconhecido; arquivos preservados."); return; }
        PdfCacheSeguro.limparAntigos(pasta(), System.currentTimeMillis(), ativos());
        if (contexto != null && contexto.startsWith(uid + ":")) { contexto = null; arquivos.clear(); nomesAnexos.clear(); }
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
            if (!atual.equals(contexto)) { arquivos.clear(); nomesAnexos.clear(); contexto = atual; }
            String id = UUID.randomUUID().toString();
            String uid = atual.split(":", 2)[0];
            if (!uid.matches("[A-Za-z0-9_-]{1,128}")) { call.reject("Sessão inválida."); return; }
            File file = new File(dir, "u_" + uid.length() + "_" + uid + "_" + id + ".pdf");
            try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); }
            arquivos.put(id, file);
            JSObject ret = new JSObject(); ret.put("id", id); call.resolve(ret);
        } catch (Exception e) { call.reject("Não foi possível gravar o PDF. Verifique o espaço disponível.", "PDF_WRITE"); }
    }
    @PluginMethod public void escreverAnexo(PluginCall call) {
        try {
            String atual = call.getString("contexto", ""), nome = call.getString("nome", ""), mime = call.getString("mime", "");
            String ext = mime.equals("application/pdf") ? "pdf" : mime.equals("image/jpeg") ? "jpg" : mime.equals("image/png") ? "png" : mime.equals("image/webp") ? "webp" : "";
            if (ext.isEmpty() || !nome.matches("[A-Za-z0-9_.-]{1,150}") || !nome.toLowerCase(java.util.Locale.ROOT).endsWith("." + ext)) { call.reject("Tipo ou nome de arquivo inválido."); return; }
            String uid = atual.split(":", 2)[0]; if (!uid.matches("[A-Za-z0-9_-]{1,128}")) { call.reject("Sessão inválida."); return; }
            byte[] bytes = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
            boolean valido = bytes.length >= 12 && bytes.length <= 5 * 1024 * 1024;
            if (valido) valido = ext.equals("pdf") ? new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-") : ext.equals("jpg") ? (bytes[0]&255)==255 && (bytes[1]&255)==216 : ext.equals("png") ? (bytes[0]&255)==137 && bytes[1]==80 && bytes[2]==78 && bytes[3]==71 : new String(bytes,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes,8,4,java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            if (!valido) { call.reject("Arquivo inválido ou maior que 5 MB."); return; }
            File dir = pasta(); if (!dir.exists() && !dir.mkdirs()) throw new IOException();
            PdfCacheSeguro.limparAntigos(dir,System.currentTimeMillis(),ativos());
            if (!atual.equals(contexto)) { arquivos.clear(); nomesAnexos.clear(); contexto = atual; }
            String id = UUID.randomUUID().toString(); File file = new File(dir,"u_"+uid.length()+"_"+uid+"_"+id+"."+ext);
            try(FileOutputStream out = new FileOutputStream(file)){out.write(bytes);}
            arquivos.put(id,file);nomesAnexos.put(id,nome);JSObject ret=new JSObject();ret.put("id",id);call.resolve(ret);
        } catch(Exception e){call.reject("Não foi possível preparar o anexo no aparelho.","ANEXO_WRITE");}
    }
    private String extensao(File f) { String n=f.getName(); return n.substring(n.lastIndexOf('.')+1); }
    private String tipoArquivo(File f) { String e=extensao(f); return e.equals("pdf")?"application/pdf":e.equals("jpg")?"image/jpeg":e.equals("png")?"image/png":"image/webp"; }
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
        if (file == null || !file.exists()) { call.reject("A sessão mudou. Abra o arquivo novamente."); return; }
        try {
            String acao = call.getString("acao", "abrir"), ext = extensao(file), mime = tipoArquivo(file);
            boolean pdf = ext.equals("pdf");
            if ("escolher".equals(acao)) {
                getActivity().runOnUiThread(() -> new android.app.AlertDialog.Builder(getActivity()).setTitle(pdf ? "PDF Tá no Ponto" : "Imagem Tá no Ponto")
                    .setItems(pdf ? new String[]{"Abrir PDF", "Compartilhar PDF", "Salvar PDF"} : new String[]{"Abrir imagem / Imprimir", "Compartilhar imagem", "Salvar imagem"}, (dialog, which) -> {
                        call.getData().put("acao", new String[]{"abrir", "compartilhar", "salvar"}[which]); executar(call);
                    }).setOnCancelListener(dialog -> call.resolve()).show()); return;
            }
            if (!file.getName().endsWith("_entregue." + ext)) {
                File entregue = new File(pasta(), file.getName().substring(0,file.getName().lastIndexOf('.')) + "_entregue." + ext);
                if (!file.renameTo(entregue)) { call.reject("Não foi possível preparar o arquivo."); return; }
                arquivos.put(call.getString("id"), entregue); file = entregue;
            }
            file.setLastModified(System.currentTimeMillis());
            if ("salvar".equals(acao)) {
                entregas.put(call.getCallbackId(), file);
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE, nomesAnexos.getOrDefault(call.getString("id"), pdf ? "Tá no Ponto.pdf" : "Anexo."+ext));
                startActivityForResult(call, save, "salvo"); return;
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".pdfprovider", file);
            Intent intent;
            if ("compartilhar".equals(acao)) {
                intent = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri);
            } else if ("abrir".equals(acao)) intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime);
            else { call.reject("Ação inválida."); return; }
            if ("abrir".equals(acao) && intent.resolveActivity(getContext().getPackageManager()) == null) { call.reject("Nenhum aplicativo disponível para abrir este arquivo. Salve o arquivo ou escolha outro aplicativo.", "PDF_NO_VIEWER"); return; }
            intent.setClipData(ClipData.newRawUri("PDF", uri)); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            entregas.put(call.getCallbackId(), file);
            startActivityForResult(call, Intent.createChooser(intent, pdf ? "PDF Tá no Ponto" : "Imagem Tá no Ponto"), "aberto");
        } catch (ActivityNotFoundException e) { concluirEntrega(call); call.reject("Nenhum aplicativo disponível para abrir este arquivo. Salve o arquivo ou escolha outro aplicativo.", "PDF_NO_VIEWER"); }
        catch (Exception e) { call.reject("Não foi possível abrir o arquivo.", "PDF_OPEN"); }
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
        } catch (Exception e) { call.reject("Não foi possível salvar o arquivo.", "PDF_SAVE"); }
    }
}


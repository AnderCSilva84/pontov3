import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gerarPdfListaCompras } from '../src/utils/exportarPdfListaCompras.js';
await mkdir('output/pdf', { recursive: true });
await mkdir('tmp/pdfs', { recursive: true });
const logoData = `data:image/png;base64,${(await readFile('public/icon-192.png')).toString('base64')}`;
const lista = [
  { categoria: 'Pet', nome: '2 un · Ração para gatos (Pacote de 1 kg)' },
  { categoria: 'Geladeira', nome: '3 un · Leite integral (Caixa de 1 L)' },
  { categoria: 'Despensa', nome: '2 un · Arroz integral (Pacote de 1 kg)' },
  { categoria: 'Jardinagem', nome: '1 un · Terra vegetal (Saco de 5 kg)' },
];
const arquivo = await gerarPdfListaCompras(lista, { titulo: 'Compras da casa', logoData });
await writeFile('output/pdf/Lista_de_compras_exemplo.pdf', new Uint8Array(await arquivo.blob.arrayBuffer()));
const extensa = await gerarPdfListaCompras(Array.from({ length: 90 }, (_, i) => ({ categoria: 'Despensa', nome: `${i + 1}. Produto com apresentação detalhada para conferir a quebra de linhas e as margens (Embalagem de 1 kg)` })), { titulo: 'Lista extensa para revisão de paginação', logoData });
await writeFile('tmp/pdfs/lista-extensa.pdf', new Uint8Array(await extensa.blob.arrayBuffer()));
console.log('PDF de exemplo e lista extensa gerados para revisão visual com PDFium.');

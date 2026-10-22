const segmentador = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' });
function iconeCategoriaValido(valor) {
  return typeof valor === 'string' && valor === valor.trim() && valor.length > 0 && valor.length <= 32
    && /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(valor)
    && [...segmentador.segment(valor)].length === 1;
}
module.exports = { iconeCategoriaValido };

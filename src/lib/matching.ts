// Combining diacritical marks (U+0300-U+036F), construidos via code point pra
// evitar caracteres unicode literais e invisiveis no source.
const DIACRITICS_REGEX = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g",
);

function normalize(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase();
}

// keyword nulo/vazio = casa qualquer comentario. Suporta multiplas keywords
// separadas por virgula (OR entre elas), case-insensitive e ignorando acentos.
export function matchesKeyword(commentText: string, keyword: string | null): boolean {
  if (!keyword || !keyword.trim()) return true;

  const normalizedComment = normalize(commentText);
  const terms = keyword
    .split(",")
    .map((term) => normalize(term.trim()))
    .filter((term) => term.length > 0);

  if (terms.length === 0) return true;

  return terms.some((term) => normalizedComment.includes(term));
}

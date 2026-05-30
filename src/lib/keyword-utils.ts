export const cleanKeyword = (item: string) => {
  let base = (item.split("=>")[0] || "").split("=")[0]?.trim() || "";
  // Strip leading quantities like "2 ", "500gr ", "1.5 kg"
  const quantityRegex = /^\s*\d+(?:[\.,]\d+)?\s*(?:kg|g|gr|gram|ml|liter|l|pcs|buah|biji|slop|pack|ikat|besek|box|porsi|botol|kaleng|cup|bungkus|bks|lembar|lbr)?\s+/i;
  base = base.replace(quantityRegex, "").trim();
  
  // Strip trailing discounts like "(Disc 6k)" or "(Disc. 1000)"
  const discRegex = /\s*\(Disc[^)]*\)\s*$/i;
  base = base.replace(discRegex, "").trim();
  
  return base;
};

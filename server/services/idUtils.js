// server/services/idUtils.js
export function nextId(items) {
  const max = items.reduce((m, item) => (item.id && item.id > m ? item.id : m), 0);
  return max + 1;
}

/** Объединение / разъединение ячеек таблицы в contentEditable стикера. */

export function findStickerTableCell(editor: HTMLElement): HTMLTableCellElement | null {
  const sel = window.getSelection();
  if (!sel?.focusNode) return null;
  let n: Node | null = sel.focusNode;
  while (n && n !== editor) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const name = (n as HTMLElement).tagName;
      if (name === "TD" || name === "TH") return n as HTMLTableCellElement;
    }
    n = n.parentNode;
  }
  return null;
}

function cloneCellStyle(from: HTMLTableCellElement, to: HTMLTableCellElement) {
  const st = from.getAttribute("style");
  if (st) to.setAttribute("style", st);
}

function appendCellContent(target: HTMLTableCellElement, source: HTMLTableCellElement) {
  const src = source.innerHTML.trim();
  if (!src || src === "&nbsp;") return;
  const cur = target.innerHTML.trim();
  if (!cur || cur === "&nbsp;") {
    target.innerHTML = source.innerHTML;
    return;
  }
  target.innerHTML = `${cur}<br>${source.innerHTML}`;
}

function tableBodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
  const tbody = table.querySelector("tbody");
  if (tbody) return Array.from(tbody.querySelectorAll("tr"));
  return Array.from(table.querySelectorAll("tr")).filter((tr) => !tr.closest("thead"));
}

/** Объединить с ячейкой справа (colspan). */
export function mergeStickerTableCellRight(editor: HTMLElement): boolean {
  const cell = findStickerTableCell(editor);
  const next = cell?.nextElementSibling;
  if (!cell || !next || (next.tagName !== "TD" && next.tagName !== "TH")) return false;

  const secondary = next as HTMLTableCellElement;
  appendCellContent(cell, secondary);
  cell.colSpan = cell.colSpan + secondary.colSpan;
  secondary.remove();
  return true;
}

/** Объединить с ячейкой снизу (rowspan). */
export function mergeStickerTableCellDown(editor: HTMLElement): boolean {
  const cell = findStickerTableCell(editor);
  const tr = cell?.closest("tr");
  const table = tr?.closest("table");
  if (!cell || !tr || !table) return false;

  const rows = tableBodyRows(table);
  const rowIdx = rows.indexOf(tr as HTMLTableRowElement);
  if (rowIdx < 0 || rowIdx >= rows.length - 1) return false;

  const below = rows[rowIdx + 1]!.children[cell.cellIndex] as HTMLTableCellElement | undefined;
  if (!below || (below.tagName !== "TD" && below.tagName !== "TH")) return false;

  appendCellContent(cell, below);
  cell.rowSpan = cell.rowSpan + below.rowSpan;
  below.remove();
  return true;
}

/** Разделить по горизонтали (colspan → две ячейки). */
export function splitStickerTableCellHorizontal(editor: HTMLElement): boolean {
  const cell = findStickerTableCell(editor);
  const tr = cell?.parentElement;
  if (!cell || !tr || cell.colSpan <= 1) return false;

  cell.colSpan -= 1;
  const tag = cell.tagName.toLowerCase() as "td" | "th";
  const extra = document.createElement(tag);
  extra.innerHTML = "&nbsp;";
  cloneCellStyle(cell, extra);
  if (cell.nextSibling) tr.insertBefore(extra, cell.nextSibling);
  else tr.appendChild(extra);
  return true;
}

/** Разделить по вертикали (rowspan → две ячейки). */
export function splitStickerTableCellVertical(editor: HTMLElement): boolean {
  const cell = findStickerTableCell(editor);
  const tr = cell?.closest("tr");
  const table = tr?.closest("table");
  if (!cell || !tr || !table || cell.rowSpan <= 1) return false;

  const rows = tableBodyRows(table);
  const rowIdx = rows.indexOf(tr as HTMLTableRowElement);
  if (rowIdx < 0) return false;

  const oldSpan = cell.rowSpan;
  cell.rowSpan = oldSpan - 1;
  const insertRow = rows[rowIdx + oldSpan - 1];
  if (!insertRow) return false;

  const tag = cell.tagName.toLowerCase() as "td" | "th";
  const extra = document.createElement(tag);
  extra.innerHTML = "&nbsp;";
  cloneCellStyle(cell, extra);

  const ref = insertRow.children[cell.cellIndex];
  if (ref) insertRow.insertBefore(extra, ref);
  else insertRow.appendChild(extra);
  return true;
}

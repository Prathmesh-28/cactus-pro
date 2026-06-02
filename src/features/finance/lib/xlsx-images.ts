import JSZip from "jszip";

/** Map sheet name → "row,col" (0-indexed) → data URL. */
export type SheetImages = Map<string, Map<string, string>>;

function resolvePath(base: string, rel: string): string {
  const parts = base.split("/").filter(Boolean);
  for (const p of rel.split("/")) {
    if (p === "..") parts.pop();
    else if (p && p !== ".") parts.push(p);
  }
  return parts.join("/");
}

function getRId(el: Element): string | null {
  return (
    el.getAttribute("r:id") ||
    el.getAttribute("r:embed") ||
    el.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ||
    el.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed") ||
    null
  );
}

function localTag(doc: Document, name: string): Element[] {
  // getElementsByTagName matches the local-name in XML mode for browser DOMParser
  // when the source uses the same prefix; for safety try both prefixed and bare.
  const out: Element[] = [];
  for (const tag of [name, `xdr:${name}`, `a:${name}`]) {
    out.push(...Array.from(doc.getElementsByTagName(tag)));
  }
  return out;
}

function localChild(el: Element, name: string): Element | null {
  for (const tag of [name, `xdr:${name}`, `a:${name}`]) {
    const n = el.getElementsByTagName(tag)[0];
    if (n) return n;
  }
  return null;
}

/** Extract embedded images from an .xlsx file, anchored to (row,col). */
export async function extractXlsxImages(file: File): Promise<SheetImages> {
  const result: SheetImages = new Map();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const parser = new DOMParser();

  const wbXml = await zip.file("xl/workbook.xml")?.async("string");
  const wbRelsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!wbXml || !wbRelsXml) return result;

  const wbDoc = parser.parseFromString(wbXml, "application/xml");
  const wbRelsDoc = parser.parseFromString(wbRelsXml, "application/xml");

  const wbRelMap = new Map<string, string>();
  for (const rel of Array.from(wbRelsDoc.getElementsByTagName("Relationship"))) {
    wbRelMap.set(rel.getAttribute("Id") ?? "", rel.getAttribute("Target") ?? "");
  }

  const sheets: { name: string; path: string }[] = [];
  for (const s of Array.from(wbDoc.getElementsByTagName("sheet"))) {
    const name = s.getAttribute("name") ?? "";
    const rId = getRId(s);
    const target = rId ? wbRelMap.get(rId) : null;
    if (!name || !target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    sheets.push({ name, path });
  }

  for (const { name, path } of sheets) {
    const sheetXml = await zip.file(path)?.async("string");
    if (!sheetXml) continue;
    const sheetDoc = parser.parseFromString(sheetXml, "application/xml");
    const drawingEl = sheetDoc.getElementsByTagName("drawing")[0];
    if (!drawingEl) continue;
    const drawingRId = getRId(drawingEl);
    if (!drawingRId) continue;

    const sheetDir = path.substring(0, path.lastIndexOf("/"));
    const sheetFile = path.substring(path.lastIndexOf("/") + 1);
    const sheetRelsXml = await zip.file(`${sheetDir}/_rels/${sheetFile}.rels`)?.async("string");
    if (!sheetRelsXml) continue;
    const sheetRelsDoc = parser.parseFromString(sheetRelsXml, "application/xml");

    let drawingPath: string | null = null;
    for (const rel of Array.from(sheetRelsDoc.getElementsByTagName("Relationship"))) {
      if (rel.getAttribute("Id") === drawingRId) {
        drawingPath = resolvePath(sheetDir, rel.getAttribute("Target") ?? "");
        break;
      }
    }
    if (!drawingPath) continue;

    const drawingXml = await zip.file(drawingPath)?.async("string");
    if (!drawingXml) continue;

    const drawingDir = drawingPath.substring(0, drawingPath.lastIndexOf("/"));
    const drawingFile = drawingPath.substring(drawingPath.lastIndexOf("/") + 1);
    const drawingRelsXml = await zip
      .file(`${drawingDir}/_rels/${drawingFile}.rels`)
      ?.async("string");
    const imgRelMap = new Map<string, string>();
    if (drawingRelsXml) {
      const drDoc = parser.parseFromString(drawingRelsXml, "application/xml");
      for (const rel of Array.from(drDoc.getElementsByTagName("Relationship"))) {
        const id = rel.getAttribute("Id") ?? "";
        const tgt = rel.getAttribute("Target") ?? "";
        if (id && tgt) imgRelMap.set(id, resolvePath(drawingDir, tgt));
      }
    }

    const drDoc = parser.parseFromString(drawingXml, "application/xml");
    const anchors = [...localTag(drDoc, "oneCellAnchor"), ...localTag(drDoc, "twoCellAnchor")];
    const cellMap = new Map<string, string>();

    for (const anchor of anchors) {
      const from = localChild(anchor, "from");
      if (!from) continue;
      const colEl = localChild(from, "col");
      const rowEl = localChild(from, "row");
      if (!colEl || !rowEl) continue;
      const col = parseInt(colEl.textContent ?? "0", 10);
      const row = parseInt(rowEl.textContent ?? "0", 10);

      const blip = localChild(anchor, "blip");
      if (!blip) continue;
      const embedId = getRId(blip);
      if (!embedId) continue;
      const mediaPath = imgRelMap.get(embedId);
      if (!mediaPath) continue;

      const imgFile = zip.file(mediaPath);
      if (!imgFile) continue;
      const ext = (mediaPath.split(".").pop() ?? "png").toLowerCase();
      const mime =
        ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "gif"
            ? "image/gif"
            : ext === "webp"
              ? "image/webp"
              : "image/png";
      const b64 = await imgFile.async("base64");
      cellMap.set(`${row},${col}`, `data:${mime};base64,${b64}`);
    }

    if (cellMap.size > 0) result.set(name, cellMap);
  }

  return result;
}

export function isImageDataUrl(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:image/");
}

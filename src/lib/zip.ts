/**
 * Minimal, dependency-free ZIP writer for client-side downloads. Uses the
 * "stored" (no compression) method, which is universally supported and keeps
 * the implementation small. Suitable for bundling small text files like
 * individual markdown exports.
 */

/** A single entry to place in the archive. */
export interface ZipEntry {
  /** File name inside the archive, e.g. "1-my-item.md". */
  name: string;
  /** UTF-8 text content. */
  content: string;
}

const CRC_TABLE: Uint32Array = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * Compute the CRC-32 checksum of a byte array (ZIP/PKZIP polynomial).
 * @param bytes The bytes to checksum.
 * @returns The unsigned 32-bit CRC.
 */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Concatenate byte chunks into a single Uint8Array.
 * @param chunks The chunks to join.
 * @returns The combined byte array.
 */
function concat(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Write a little-endian unsigned integer into a DataView-backed helper.
 * @param values The (offset-ordered) 16/32-bit fields to encode.
 * @returns The encoded bytes.
 */
function pack(values: { value: number; bytes: 2 | 4 }[]): Uint8Array<ArrayBuffer> {
  const size = values.reduce((s, v) => s + v.bytes, 0);
  const buf = new Uint8Array(new ArrayBuffer(size));
  const view = new DataView(buf.buffer);
  let offset = 0;
  for (const { value, bytes } of values) {
    if (bytes === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value >>> 0, true);
    offset += bytes;
  }
  return buf;
}

/**
 * Build a ZIP archive (stored, no compression) from text entries.
 * @param entries The files to include.
 * @returns A Blob with MIME type application/zip.
 */
export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);

    // Local file header (signature 0x04034b50).
    const localHeader = concat([
      pack([{ value: 0x04034b50, bytes: 4 }]),
      pack([
        { value: 20, bytes: 2 }, // version needed
        { value: 0, bytes: 2 }, // flags
        { value: 0, bytes: 2 }, // method: stored
        { value: 0, bytes: 2 }, // mod time
        { value: 0, bytes: 2 }, // mod date
        { value: crc, bytes: 4 },
        { value: dataBytes.length, bytes: 4 }, // compressed size
        { value: dataBytes.length, bytes: 4 }, // uncompressed size
        { value: nameBytes.length, bytes: 2 },
        { value: 0, bytes: 2 }, // extra length
      ]),
      nameBytes,
    ]);

    localParts.push(localHeader, dataBytes);

    // Central directory record (signature 0x02014b50).
    const central = concat([
      pack([{ value: 0x02014b50, bytes: 4 }]),
      pack([
        { value: 20, bytes: 2 }, // version made by
        { value: 20, bytes: 2 }, // version needed
        { value: 0, bytes: 2 }, // flags
        { value: 0, bytes: 2 }, // method
        { value: 0, bytes: 2 }, // mod time
        { value: 0, bytes: 2 }, // mod date
        { value: crc, bytes: 4 },
        { value: dataBytes.length, bytes: 4 },
        { value: dataBytes.length, bytes: 4 },
        { value: nameBytes.length, bytes: 2 },
        { value: 0, bytes: 2 }, // extra length
        { value: 0, bytes: 2 }, // comment length
        { value: 0, bytes: 2 }, // disk number start
        { value: 0, bytes: 2 }, // internal attrs
        { value: 0, bytes: 4 }, // external attrs
        { value: offset, bytes: 4 }, // local header offset
      ]),
      nameBytes,
    ]);
    centralParts.push(central);

    offset += localHeader.length + dataBytes.length;
  }

  const centralDir = concat(centralParts);
  const centralSize = centralDir.length;
  const centralOffset = offset;

  // End of central directory record (signature 0x06054b50).
  const eocd = concat([
    pack([{ value: 0x06054b50, bytes: 4 }]),
    pack([
      { value: 0, bytes: 2 }, // disk number
      { value: 0, bytes: 2 }, // disk with central dir
      { value: entries.length, bytes: 2 }, // entries on this disk
      { value: entries.length, bytes: 2 }, // total entries
      { value: centralSize, bytes: 4 },
      { value: centralOffset, bytes: 4 },
      { value: 0, bytes: 2 }, // comment length
    ]),
  ]);

  const blobParts = concat([concat(localParts), centralDir, eocd]);
  return new Blob([blobParts], { type: "application/zip" });
}

/**
 * Slugify a string for use as a safe file name (lowercase, hyphenated).
 * @param text The source text.
 * @param fallback A fallback used when the result would be empty.
 * @returns A filesystem-safe slug.
 */
export function slugifyFileName(text: string, fallback = "item"): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug.length > 0 ? slug : fallback;
}

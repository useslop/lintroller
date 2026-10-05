// File reading and downloads. Nothing here touches the network: files are read locally, downloads are Blob URLs.

const MAX_REPLACEMENT_RATIO = 0.01;

function replacementRatio(text: string): number {
  if (text.length === 0) return 0;
  let count = 0;
  for (let at = text.indexOf('�'); at !== -1; at = text.indexOf('�', at + 1)) count++;
  return count / text.length;
}

/**
 * A UTF-16 byte-order mark decides first (Excel's "Unicode Text" saves UTF-16LE with FF FE). Otherwise UTF-8;
 * if more than 1% of characters are U+FFFD, re-read the same bytes as windows-1252.
 */
export function decodeBytes(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  if (replacementRatio(utf8) <= MAX_REPLACEMENT_RATIO) return utf8;
  return new TextDecoder('windows-1252').decode(bytes);
}

export async function readTextFile(file: File): Promise<string> {
  return decodeBytes(await file.arrayBuffer());
}

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

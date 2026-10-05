// File reading and downloads. Nothing here touches the network: files are read locally, downloads are Blob URLs.

const MAX_REPLACEMENT_RATIO = 0.01;

function replacementRatio(text: string): number {
  if (text.length === 0) return 0;
  let count = 0;
  for (let at = text.indexOf('�'); at !== -1; at = text.indexOf('�', at + 1)) count++;
  return count / text.length;
}

/** UTF-8 first; if more than 1% of characters are U+FFFD, re-read the same bytes as windows-1252. */
export async function readTextFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  if (replacementRatio(utf8) <= MAX_REPLACEMENT_RATIO) return utf8;
  return new TextDecoder('windows-1252').decode(bytes);
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

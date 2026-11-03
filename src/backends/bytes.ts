export function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  // In chunks: spreading a large array into one call overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
}

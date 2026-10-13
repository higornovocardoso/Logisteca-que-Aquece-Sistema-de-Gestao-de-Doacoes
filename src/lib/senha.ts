const ITERACOES = 100_000;

function paraHex(buffer: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function deHex(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/g)!.map((par) => parseInt(par, 16)));
}

async function derivar(senha: string, sal: Uint8Array): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACOES }, chave, 256);
  return paraHex(bits);
}

/** Gera o hash da senha no formato `sal:hash` (PBKDF2-SHA256). Senhas nunca são guardadas em texto puro. */
export async function gerarHashDeSenha(senha: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return `${paraHex(sal)}:${await derivar(senha, sal)}`;
}

export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  const [sal, hash] = armazenado.split(':');
  if (!sal || !hash) return false;
  const calculado = await derivar(senha, deHex(sal));
  // Comparação em tempo constante
  let diferenca = calculado.length ^ hash.length;
  for (let i = 0; i < Math.min(calculado.length, hash.length); i++) {
    diferenca |= calculado.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diferenca === 0;
}

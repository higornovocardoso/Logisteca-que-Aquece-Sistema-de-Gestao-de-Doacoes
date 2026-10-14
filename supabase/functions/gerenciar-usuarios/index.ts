// Edge Function: gerenciamento de usuários pelo próprio sistema.
// Criar, remover e redefinir senha exigem a chave de serviço do Supabase, que só existe aqui,
// no servidor. Toda chamada confere se quem pediu é um administrador ativo.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';

const DOMINIO_USUARIOS = 'logisticaqueaquece.local';
const PERFIS = ['Administrador', 'Operador'];

const cabecalhos = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: cabecalhos });
}

const erro = (status: number, mensagem: string) => resposta(status, { erro: mensagem });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhos });
  if (req.method !== 'POST') return erro(405, 'Método não permitido.');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Quem está chamando?
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: autenticado } = await admin.auth.getUser(token);
  if (!autenticado.user) return erro(401, 'Sua sessão expirou. Entre novamente.');

  const { data: solicitante } = await admin.from('perfis').select('id, nome, perfil, ativo').eq('id', autenticado.user.id).single();
  if (!solicitante?.ativo || solicitante.perfil !== 'Administrador') {
    return erro(403, 'Somente administradores podem gerenciar usuários.');
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return erro(400, 'Requisição inválida.');
  }

  const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : '');

  switch (corpo.acao) {
    case 'criar': {
      const nome = texto(corpo.nome);
      const usuario = texto(corpo.usuario);
      const perfil = texto(corpo.perfil);
      const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

      if (nome.length < 2 || nome.length > 80) return erro(400, 'Informe um nome entre 2 e 80 caracteres.');
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(usuario)) {
        return erro(400, 'O nome de usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.');
      }
      if (!PERFIS.includes(perfil)) return erro(400, 'Perfil inválido.');
      if (senha.length < 6 || senha.length > 72) return erro(400, 'A senha deve ter entre 6 e 72 caracteres.');

      const { data: existente } = await admin.from('perfis').select('id').ilike('usuario', usuario).maybeSingle();
      if (existente) return erro(409, `O nome de usuário "${usuario}" já está em uso.`);

      const { data, error } = await admin.auth.admin.createUser({
        email: `${usuario.toLowerCase()}@${DOMINIO_USUARIOS}`,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, perfil },
      });
      if (error) return erro(400, `Não foi possível criar o usuário: ${error.message}`);
      return resposta(200, { id: data.user.id });
    }

    case 'redefinir_senha': {
      const id = texto(corpo.id);
      const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
      if (!id) return erro(400, 'Usuário não informado.');
      if (senha.length < 6 || senha.length > 72) return erro(400, 'A senha deve ter entre 6 e 72 caracteres.');
      const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
      if (error) return erro(400, `Não foi possível redefinir a senha: ${error.message}`);
      return resposta(200, { ok: true });
    }

    case 'remover': {
      const id = texto(corpo.id);
      if (!id) return erro(400, 'Usuário não informado.');
      if (id === solicitante.id) return erro(400, 'Você não pode remover o próprio usuário.');

      const { data: alvo } = await admin.from('perfis').select('perfil, ativo').eq('id', id).maybeSingle();
      if (!alvo) return erro(404, 'Usuário não encontrado.');
      if (alvo.ativo && alvo.perfil === 'Administrador') {
        const { count } = await admin.from('perfis').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('perfil', 'Administrador');
        if ((count ?? 0) <= 1) return erro(400, 'O sistema precisa de pelo menos um administrador ativo.');
      }

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return erro(400, `Não foi possível remover o usuário: ${error.message}`);
      return resposta(200, { ok: true });
    }

    default:
      return erro(400, 'Ação desconhecida.');
  }
});

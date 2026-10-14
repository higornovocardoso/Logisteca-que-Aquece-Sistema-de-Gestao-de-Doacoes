// Edge Function: gerenciamento de usuários pelo próprio sistema.
// Criar, remover, redefinir senha e trocar o nome de usuário exigem a chave de serviço do Supabase,
// que só existe aqui, no servidor. Toda chamada confere quem pediu: administradores gerenciam qualquer
// usuário; os demais só trocam o próprio nome de usuário, confirmando a senha.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';

const DOMINIO_USUARIOS = 'logisticaqueaquece.local';
const PERFIS = ['Administrador', 'Operador'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENHA_MINIMA = 8;
const SENHA_MAXIMA = 72;

/** Erros do Supabase Auth ficam só no log do servidor; quem chamou recebe uma mensagem clara. */
function falhaDoAuth(acao: string, falha: { code?: string; message: string }) {
  console.error(acao, falha);
  if (falha.code === 'weak_password') return erro(400, 'Senha fraca ou já exposta em vazamentos de dados. Escolha outra.');
  return erro(400, `Não foi possível ${acao}. Tente novamente.`);
}

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

  const { data: solicitante } = await admin.from('perfis').select('id, nome, usuario, perfil, ativo').eq('id', autenticado.user.id).single();
  if (!solicitante?.ativo) return erro(403, 'Este usuário está desativado. Fale com um administrador.');

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return erro(400, 'Requisição inválida.');
  }

  const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : '');

  // Única ação liberada a qualquer usuário ativo, e sempre sobre a própria conta
  if (corpo.acao === 'alterar_meu_usuario') {
    const usuario = texto(corpo.usuario).toLowerCase();
    const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
      return erro(400, 'O nome de usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.');
    }
    if (usuario === solicitante.usuario) return resposta(200, { ok: true });

    // Confere a senha atual com um cliente comum, sem privilégios
    const publico = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const conferencia = await publico.auth.signInWithPassword({ email: autenticado.user.email!, password: senha });
    if (conferencia.error) return erro(400, 'A senha atual está incorreta.');
    await publico.auth.signOut({ scope: 'local' }); // encerra só a sessão criada para a conferência

    const { data: existente } = await admin.from('perfis').select('id').eq('usuario', usuario).maybeSingle();
    if (existente) return erro(409, `O nome de usuário "${usuario}" já está em uso.`);

    const emailAnterior = autenticado.user.email!;
    const { error } = await admin.auth.admin.updateUserById(solicitante.id, { email: `${usuario}@${DOMINIO_USUARIOS}`, email_confirm: true });
    if (error) return falhaDoAuth('alterar o nome de usuário', error);
    const perfil = await admin.from('perfis').update({ usuario }).eq('id', solicitante.id);
    if (perfil.error) {
      // Mantém login e perfil sempre iguais: desfaz a troca do e-mail
      await admin.auth.admin.updateUserById(solicitante.id, { email: emailAnterior, email_confirm: true });
      return falhaDoAuth('alterar o nome de usuário', perfil.error);
    }
    return resposta(200, { ok: true });
  }

  if (solicitante.perfil !== 'Administrador') {
    return erro(403, 'Somente administradores podem gerenciar usuários.');
  }

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
      if (senha.length < SENHA_MINIMA || senha.length > SENHA_MAXIMA) {
        return erro(400, `A senha deve ter entre ${SENHA_MINIMA} e ${SENHA_MAXIMA} caracteres.`);
      }

      const { data: existente } = await admin.from('perfis').select('id').eq('usuario', usuario.toLowerCase()).maybeSingle();
      if (existente) return erro(409, `O nome de usuário "${usuario}" já está em uso.`);

      const { data, error } = await admin.auth.admin.createUser({
        email: `${usuario.toLowerCase()}@${DOMINIO_USUARIOS}`,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
        // app_metadata só pode ser definido com a chave de serviço: é daqui que o banco lê o perfil
        // e libera o acesso (ver criar_perfil em supabase/schema.sql)
        app_metadata: { perfil },
      });
      if (error) return falhaDoAuth('criar o usuário', error);
      return resposta(200, { id: data.user.id });
    }

    case 'redefinir_senha': {
      const id = texto(corpo.id);
      const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
      if (!UUID.test(id)) return erro(400, 'Usuário não informado.');
      if (senha.length < SENHA_MINIMA || senha.length > SENHA_MAXIMA) {
        return erro(400, `A senha deve ter entre ${SENHA_MINIMA} e ${SENHA_MAXIMA} caracteres.`);
      }
      const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
      if (error) return falhaDoAuth('redefinir a senha', error);
      return resposta(200, { ok: true });
    }

    case 'remover': {
      const id = texto(corpo.id);
      if (!UUID.test(id)) return erro(400, 'Usuário não informado.');
      if (id === solicitante.id) return erro(400, 'Você não pode remover o próprio usuário.');

      const { data: alvo } = await admin.from('perfis').select('perfil, ativo').eq('id', id).maybeSingle();
      if (!alvo) return erro(404, 'Usuário não encontrado.');
      if (alvo.ativo && alvo.perfil === 'Administrador') {
        const { count } = await admin.from('perfis').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('perfil', 'Administrador');
        if ((count ?? 0) <= 1) return erro(400, 'O sistema precisa de pelo menos um administrador ativo.');
      }

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return falhaDoAuth('remover o usuário', error);
      return resposta(200, { ok: true });
    }

    default:
      return erro(400, 'Ação desconhecida.');
  }
});

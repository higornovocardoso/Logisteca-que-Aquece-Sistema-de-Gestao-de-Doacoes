# 🧣 Logística que Aquece

Sistema web de gestão de doações desenvolvido para a campanha **Logística que Aquece**, durante o curso no **SENAI**.

A plataforma registra, organiza e contabiliza os produtos arrecadados na campanha e controla as retiradas (saídas) desses itens. Isso deixa o acompanhamento das doações simples e transparente, com relatórios claros sobre o que foi recebido e distribuído.

---

## ✨ Funcionalidades

- **Registro de doações (entradas):** cadastro dos itens arrecadados na campanha.
- **Controle de retiradas (saídas):** registro dos itens distribuídos.
- **Contabilização do estoque:** saldo de cada produto calculado a partir das entradas e saídas.
- **Dashboard com gráficos:** visão geral das arrecadações e distribuições.
- **Relatórios exportáveis:** geração de relatórios em PDF e planilhas (Excel/CSV).
- **Autenticação:** acesso ao sistema com login.

## 🛠️ Tecnologias

| Camada            | Ferramentas                                                    |
| ----------------- | -------------------------------------------------------------- |
| Front-end         | React 18, TypeScript, Vite, React Router                       |
| Estilização       | Tailwind CSS, Framer Motion, Lucide Icons                      |
| Back-end / Dados  | Supabase (PostgreSQL + autenticação)                           |
| Gráficos          | Chart.js, react-chartjs-2                                      |
| Relatórios        | jsPDF + jsPDF-AutoTable (PDF), SheetJS e PapaParse (Excel/CSV) |
| Validação         | Zod                                                            |
| Qualidade         | ESLint, TypeScript (modo `strict`)                             |
| Deploy            | Netlify (desativado)                                           |

## 📁 Sobre este repositório

> ⚠️ O código-fonte da aplicação (pasta `src/`) não foi preservado. Este repositório guarda a **configuração do projeto** (dependências, Vite, Tailwind, TypeScript e ESLint) como registro da arquitetura usada. A versão publicada no Netlify foi desativada.

Para montar o ambiente a partir desta configuração:

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente do Supabase
cp .env.example .env

# 3. Rode em modo de desenvolvimento (requer a pasta src/)
npm run dev
```

Scripts disponíveis:

| Comando             | Descrição                                     |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                   |
| `npm run build`     | Verificação de tipos e build de produção      |
| `npm run preview`   | Pré-visualização do build                     |
| `npm run lint`      | Análise estática com ESLint                   |
| `npm run typecheck` | Verificação de tipos com TypeScript           |

## 👤 Autor

**Higor Cardoso**: [GitHub](https://github.com/higornovocardoso)

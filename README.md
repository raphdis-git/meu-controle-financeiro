# Meu Controle Financeiro

Orçamento familiar com meses nas colunas, contas por categoria e cartões separados. Interface aprovada a partir da planilha de Raphael & Aira.

## Uso

Abra o GitHub Pages do repositório, crie uma conta com e-mail e senha, confirme o cadastro e entre. Cada login acessa seu próprio orçamento. O cadastro começa sem valores ilustrativos. As alterações são salvas no Supabase, incluindo parcelas, pagamentos, exclusões e meses arquivados.

- Fatura: total manual prevalece sobre a soma das compras; a diferença aparece para conferência.
- Parcelas: distribuídas em centavos exatos, com meses futuros e mudança de ano.
- Exclusão: somente o mês escolhido ou esse mês e os próximos; meses anteriores preservados. Nos cartões, remove a fatura inteira e as compras dos meses selecionados.
- Contas fixas: opção no cadastro e no lançamento mensal; define início, valor (inclusive soma com =) e dia do vencimento. Regras mensais ficam salvas e geram previsões ao consultar qualquer ano, sem criar cópias ilimitadas. Dia 31 é limitado ao último dia de cada mês. Editar só o mês cria uma exceção; editar os próximos altera a regra a partir daquele mês, preservando pagamentos já registrados e exclusões explícitas. Excluir um mês deixa uma exceção; excluir desse mês em diante encerra a regra.
- Arquivamento: disponível quando todas as despesas daquele mês estiverem pagas. Novas pendências reabrem o mês.
- Falha de salvamento: a interface restaura o último estado confirmado e informa o erro.
- Edição simultânea: uma revisão impede sobrescrever silenciosamente alterações de outra janela. Atualize os dados antes de tentar novamente.

## Banco e acesso

`db/schema.sql` cria `public.orcamentos`, com documento JSONB por usuário, revisão e RLS. `save_orcamento` é SECURITY INVOKER e salva uma revisão de forma atômica. A chave usada no navegador é publicável; nenhuma chave secreta é incluída.

`db/secure-legacy.sql` retira o acesso anônimo ao antigo `public.transacoes`, preservando suas linhas. Os lançamentos antigos ainda não são importados: precisam ser vinculados ao UUID da conta autenticada de Raphael após o primeiro cadastro. Não há atribuição automática ao primeiro visitante. A planilha enviada, senhas e dados bancários não são incluídos neste repositório.

O projeto Supabase é o já utilizado pelo sistema. Para instalação em outro ambiente, ajuste a URL e a chave publicável em `persistence.js` e aplique o esquema em um banco novo. No painel Auth, configure a URL do GitHub Pages em Site URL e Redirect URLs para que o link de confirmação retorne diretamente ao aplicativo. O usuário também pode voltar manualmente ao aplicativo após confirmar o e-mail.

Esta versão usa orçamentos separados por login; compartilhamento entre contas de acesso distintas ainda não foi implementado. Não há importação automática da planilha nem integração bancária.

## Desenvolvimento

HTML, CSS e JavaScript estáticos. O Supabase JS de navegador está fixado em `2.57.4` via jsDelivr, sem instalação de dependências. Publique os arquivos da raiz no GitHub Pages.

Verificações locais:

```sh
node --check app.js
node --check persistence.js
node tests/budget.test.cjs
```

O teste de interface usa uma simulação do cliente de persistência; não substitui um teste visual de navegador. O banco foi também verificado com transações de teste revertidas, cobrindo RLS, leitura, escrita, revisão e bloqueio anônimo.

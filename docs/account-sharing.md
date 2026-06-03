# Compartilhamento de contas (Workspaces)

Permite que vários usuários compartilhem o mesmo conjunto de dados financeiros
(contas, cartões, transações, investimentos, renda fixa) com papéis distintos.

## Modelo

- Cada usuário possui **um workspace pessoal** (`is_personal=True`), criado no
  registro. Os recursos financeiros continuam escopados por
  `user_id == workspace.owner_user_id` — o workspace **não** altera as queries
  dos serviços; ele apenas autoriza outros usuários a acessar esse escopo.
- Um usuário pode ser **membro** de vários workspaces (o seu + os de terceiros).
- Papéis (`WorkspaceRole`): `OWNER`, `EDITOR`, `VIEWER`.
  - `VIEWER`: leitura.
  - `EDITOR`: leitura + escrita.
  - `OWNER`: tudo + gestão de membros/convites. Imutável (é o criador).

## Como o cliente seleciona o workspace

Header opcional **`X-Workspace-Id`** em qualquer rota de dados. Ausente => o
workspace pessoal do requisitante. A autorização é centralizada em
`app/core/authz.py`:

- `ReadScope` — qualquer membro (inclui VIEWER).
- `WriteScope` — exige EDITOR ou OWNER (senão `403`).
- não-membro que informa um `X-Workspace-Id` => `404` (não revela existência).

As rotas passam `scope.owner_id` aos serviços no lugar do antigo `user.id`.

## Endpoints (`/api/v1/workspaces`)

| Método | Rota | Papel |
|---|---|---|
| GET | `/workspaces` | membro (lista os seus) |
| GET | `/workspaces/{id}` | membro |
| PATCH | `/workspaces/{id}` | owner (renomear) |
| GET | `/workspaces/{id}/members` | membro |
| PATCH | `/workspaces/{id}/members/{user_id}` | owner (troca papel) |
| DELETE | `/workspaces/{id}/members/{user_id}` | owner |
| POST | `/workspaces/{id}/leave` | membro (não-owner) |
| GET/POST/DELETE | `/workspaces/{id}/invites[...]` | owner |
| POST | `/workspaces/invites/accept` | qualquer autenticado |

## Convites — propriedades de segurança

- Token aleatório (`secrets.token_urlsafe`); persiste-se apenas o **HMAC**.
- **Uso único**, **expira** (7 dias) e **atrelado ao e-mail** convidado.
- Não convida/duplica membros existentes; convites pendentes anteriores ao
  mesmo e-mail são revogados.

## Limitações conhecidas / riscos a tratar

1. **Sem transferência de posse.** Como os recursos são escopados pelo
   `user_id` do dono, transferir exigiria re-chavear todas as linhas. Hoje o
   dono é fixo; para "encerrar" o compartilhamento ele remove os membros.
2. **Sem trilha de auditoria.** Uma escrita feita por um editor grava
   `user_id = owner`; não registramos o autor real. Próximo passo sugerido:
   coluna `created_by_user_id` + log de ações em dados compartilhados.
3. **Sem rate limiting** em convites/auth (pendência já listada no
   `IMPROVEMENTS.md`). Mitiga enumeração de e-mail e brute force de token.
4. **PII visível ao leitor.** Por decisão de produto, VIEWER vê os mesmos
   campos do dono (número de conta, agência, dígitos do cartão), sem máscara.
5. **Contexto de cálculo.** Renda fixa usa o `cdi_mensal` do dono do workspace
   (UserSettings do `owner_id`), o que é o comportamento desejado.

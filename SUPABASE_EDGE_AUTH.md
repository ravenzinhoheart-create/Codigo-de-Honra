# Autenticação por username — v38.3

A v38.3 remove a tentativa de criar `username@auth.cdhmc.app` no frontend.
Cadastro e login passam por uma Supabase Edge Function chamada `username-auth`.

## 1. Migration

Execute no SQL Editor:

```sql
create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username));
```

Arquivo equivalente:

`supabase/migrations/003_username_unique.sql`

## 2. Criar a Edge Function pelo celular

No Dashboard do Supabase:

**Edge Functions → Create a new function**

Nome:

`username-auth`

Cole o conteúdo de:

`supabase/functions/username-auth/index.ts`

e faça **Deploy**.

### Muito importante: desativar verificação JWT da função

Como cadastro e login acontecem antes de existir uma sessão, essa função precisa aceitar chamadas sem JWT de usuário.

Na configuração da função, desative **Verify JWT / Enforce JWT verification**.

O arquivo `supabase/config.toml` também contém:

```toml
[functions.username-auth]
verify_jwt = false
```

## 3. Chaves secretas

Não coloque nenhuma secret key no aplicativo.

A Edge Function recebe automaticamente as chaves secretas do ambiente hospedado do Supabase. O código usa `SUPABASE_SECRET_KEYS` para obter a chave `default` e `SUPABASE_PUBLISHABLE_KEYS` para o cliente interno usado na validação da senha.

Nunca cole `sb_secret_*` ou `service_role` no frontend.

## 4. Fluxo

Cadastro:

`app → username-auth → Auth Admin → profiles → emergency_contacts`

Login:

`app → username-auth → lookup username → signInWithPassword interno → access/refresh token → app`

O usuário continua vendo somente:

`username + senha`

## 5. Teste

Depois do deploy, abra o app e faça um cadastro de teste.

O usuário deve aparecer em:

- Authentication → Users
- Table Editor → profiles
- Table Editor → emergency_contacts

O cadastro ficará com `membership_status = pending`.

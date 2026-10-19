# CÓDIGO DE HONRA — Supabase

## 1. Configuração do frontend

Abra `js/config/supabase-config.js` e informe:

- `SUPABASE_URL`: Project URL
- `SUPABASE_ANON_KEY`: chave pública `anon`

Nunca coloque a `service_role` key no app.

## 2. Migration obrigatória

A base criada durante a configuração inicial usava valores de status diferentes dos valores históricos do aplicativo. Execute:

`supabase/migrations/002_align_app_enums.sql`

no SQL Editor do projeto.

## 3. Auth

O usuário continua vendo somente:

- nickname
- senha

O Supabase Auth usa internamente um endereço técnico no formato:

`nickname@auth.cdhmc.app`

O email técnico não é mostrado na interface.

## 4. Cadastro

O cadastro cria:

- `auth.users`
- `profiles`
- `emergency_contacts`

O membro nasce com `membership_status = pending` e não recebe sessão de uso do aplicativo até a diretoria aprovar o cadastro.

## 5. Storage

Bucket privado:

`media`

Pastas:

- `avatars/USER_ID/...`
- `posts/POST_ID/...`
- `events/EVENT_ID/...`

## 6. Importante

A chave `anon` pode ficar no frontend. A `service_role` jamais deve ser distribuída no APK/PWA.

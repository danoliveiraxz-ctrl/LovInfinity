# LovInfinity

Extensão Chrome MV3 com validação real de licença via Supabase.

## Backend
A extensão utiliza a Edge Function `validate-license` do projeto Supabase exclusivo do LovInfinity.

Endpoint:
https://expxqynyrafienedsmuw.supabase.co/functions/v1/validate-license

O segredo `SUPABASE_SERVICE_ROLE_KEY` permanece somente no servidor.

## Instalação
1. Baixe/clonе este repositório.
2. Abra chrome://extensions.
3. Ative "Modo do desenvolvedor".
4. Clique em "Carregar sem compactação".
5. Selecione a pasta do projeto.

## Próximas integrações
- painel administrativo para geração/revogação de tokens;
- integração OpenAI exclusivamente pelo backend;
- fluxo de distribuição/atualização da extensão.

LovInfinity é um projeto separado do ProspectScanner.
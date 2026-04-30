Lance un audit de sécurité complet sur la cible spécifiée.

## Scope
Cible: $ARGUMENTS
(Si vide, auditer tout le projet Claudette by Silver Oak)

## Checklist OWASP Top 10

### A01 - Broken Access Control
- [ ] Vérifier RLS Supabase sur toutes les tables
- [ ] Vérifier les policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Tester l'accès sans auth aux endpoints API
- [ ] Vérifier les rôles (anon vs authenticated vs service_role)

### A02 - Cryptographic Failures
- [ ] Secrets dans le code (grep pour sk-ant, sk-proj, password, secret, token)
- [ ] .env.master dans .gitignore
- [ ] HTTPS enforced
- [ ] JWT secrets sécurisés (pas CHANGE_ME)

### A03 - Injection
- [ ] SQL injection (queries paramétrées, pas de string concat)
- [ ] XSS (sanitisation inputs, Content-Security-Policy)
- [ ] Command injection (pas de exec/eval avec input utilisateur)

### A04 - Insecure Design
- [ ] Rate limiting sur les endpoints publics
- [ ] Validation des inputs (Zod, joi, etc.)
- [ ] Error handling (pas de stack traces en production)

### A05 - Security Misconfiguration
- [ ] Headers de sécurité (CORS, CSP, X-Frame-Options)
- [ ] Debug mode désactivé en production
- [ ] Ports exposés inutilement

### A07 - Auth Failures
- [ ] Supabase Auth bien configuré
- [ ] Session management
- [ ] Password policies

## Rapport
Pour chaque finding:
- Sévérité: CRITICAL / HIGH / MEDIUM / LOW / INFO
- Description du problème
- Fichier et ligne
- Fix recommandé avec code

Vérifie que RLS tenant_id est actif sur toutes les tables modifiées dans ce diff.

Commande de vérification :
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (<liste des tables modifiées>)
ORDER BY tablename;
```

Règle : rowsecurity doit être TRUE pour toutes les tables.

Si une table a rowsecurity = FALSE :
- STOP — ne pas merger
- Créer une migration pour activer RLS + policy tenant_id
- Re-vérifier après migration

Format migration :
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <table>
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

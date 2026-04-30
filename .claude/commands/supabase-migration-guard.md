Valide une migration Supabase AVANT de l'appliquer. Gate de sécurité.

## Migration: $ARGUMENTS
(Chemin du fichier SQL ou description de la migration)

## Checklist de validation

### 1. Syntaxe SQL
- [ ] SQL valide (pas d'erreurs de syntaxe)
- [ ] Types PostgreSQL corrects
- [ ] Noms de tables/colonnes en snake_case
- [ ] Pas de mots réservés utilisés comme noms

### 2. Sécurité (CRITIQUE)
- [ ] RLS activé sur chaque nouvelle table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Policies définies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Pas de `DISABLE ROW LEVEL SECURITY`
- [ ] Pas de `service_role` hardcodé dans les policies
- [ ] Pas de données sensibles en clair

### 3. Performance
- [ ] Index sur les colonnes utilisées dans WHERE/JOIN
- [ ] Pas de `SELECT *` dans les policies (utiliser des colonnes spécifiques)
- [ ] Types appropriés (uuid vs text, timestamptz vs timestamp)
- [ ] Pas de tables avec trop de colonnes (>20 = warning)

### 4. Rollback
- [ ] Migration réversible (DOWN migration fournie)
- [ ] Pas de DROP TABLE/COLUMN sans backup strategy
- [ ] Pas de modification destructive de données existantes

### 5. Compatibilité
- [ ] Pas de breaking changes sur les tables existantes
- [ ] Colonnes nullable pour les ajouts (ou avec DEFAULT)
- [ ] Foreign keys avec ON DELETE approprié

## Verdict
- APPROUVE : Migration safe, prête à appliquer
- RESERVES : Warnings identifiés, corrections suggérées
- BLOQUE : Problèmes critiques, ne PAS appliquer

## Output
Verdict + détail de chaque check + SQL corrigé si nécessaire

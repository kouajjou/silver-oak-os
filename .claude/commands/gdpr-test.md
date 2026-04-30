Génère des tests complets pour la suppression RGPD d'un tenant.

La suppression doit être vérifiée dans TOUS les systèmes :
1. Supabase : DELETE WHERE tenant_id = $1 sur toutes les tables
2. Neo4j : MATCH (n {tenantId: $1}) DETACH DELETE n
3. pgvector/embeddings : DELETE WHERE tenant_id = $1
4. Redis : SCAN + DEL toutes les clés préfixées par tenant:$1
5. SemanticCache : purge namespace tenant_id

Format des tests : Given/When/Then avec commandes bash vérifiables.
Chaque test doit avoir un expectedExitCode.

Exemple :
Given: tenant "test-123" a des données dans Supabase
When: DELETE /api/gdpr/tenant/test-123
Then: SELECT COUNT(*) FROM messages WHERE tenant_id='test-123' retourne 0
Command: curl -s -X DELETE http://localhost:8000/api/gdpr/tenant/test-123 | grep '"deleted":true'
ExpectedExitCode: 0

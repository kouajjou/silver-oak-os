import { describe, it, expect } from 'vitest';
import { buildSoulPrompt, getSoulPromptsInventory } from './soul_prompt_builder.js';
import path from 'path';
// Point SKILL_REGISTRY_ROOT so builder finds soul-prompts/ at project root
const PROJECT_ROOT = path.resolve(process.cwd());
describe('soul_prompt_builder', () => {
    describe('buildSoulPrompt', () => {
        it('returns a non-empty string for minimal spec', () => {
            const result = buildSoulPrompt({
                agentId: 'test_agent',
                agentName: 'TestBot',
                agentDescription: 'A test agent for unit tests',
                role: 'specialist',
                traits: [],
                languages: ['fr'],
                sharedBlocks: [],
            });
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(50);
        });
        it('includes agent name and id in header', () => {
            const result = buildSoulPrompt({
                agentId: 'my_agent',
                agentName: 'MyAgent',
                agentDescription: 'Test description',
                role: 'specialist',
                traits: [],
                languages: ['en'],
                sharedBlocks: [],
            });
            expect(result).toContain('MyAgent');
            expect(result).toContain('my_agent');
        });
        it('includes custom mission when provided', () => {
            const mission = 'This agent manages Airbnb properties autonomously.';
            const result = buildSoulPrompt({
                agentId: 'luca',
                agentName: 'Lucas',
                agentDescription: 'Airbnb manager',
                role: 'specialist',
                traits: [],
                languages: ['fr'],
                customMission: mission,
                sharedBlocks: [],
            });
            expect(result).toContain(mission);
        });
        it('includes trait content when trait exists', () => {
            const result = buildSoulPrompt({
                agentId: 'test',
                agentName: 'Test',
                agentDescription: 'test',
                role: 'specialist',
                traits: ['gardien_validation_required'],
                languages: ['fr'],
                sharedBlocks: [],
            });
            // The gardien trait has explicit content about validation
            expect(result).toMatch(/gardien|validation|Karim/i);
        });
        it('includes all requested languages', () => {
            const result = buildSoulPrompt({
                agentId: 'test',
                agentName: 'Test',
                agentDescription: 'test',
                role: 'specialist',
                traits: [],
                languages: ['fr', 'en', 'es'],
                sharedBlocks: [],
            });
            expect(result).toContain('Français');
            expect(result).toContain('English');
            expect(result).toContain('Español');
        });
        it('includes role content', () => {
            const result = buildSoulPrompt({
                agentId: 'test',
                agentName: 'Test',
                agentDescription: 'test',
                role: 'workhorse',
                traits: [],
                languages: ['fr'],
                sharedBlocks: [],
            });
            // Workhorse role mentions execution/tsc
            expect(result).toMatch(/exécutant|tsc|workhorse|executor/i);
        });
        it('includes delegation rules when provided', () => {
            const rules = 'Forward Airbnb emails to sara. Track finances with marco.';
            const result = buildSoulPrompt({
                agentId: 'luca',
                agentName: 'Lucas',
                agentDescription: 'test',
                role: 'specialist',
                traits: [],
                languages: ['fr'],
                delegationRules: rules,
                sharedBlocks: [],
            });
            expect(result).toContain(rules);
        });
    });
    describe('getSoulPromptsInventory', () => {
        it('returns lists of available files', () => {
            const inventory = getSoulPromptsInventory();
            expect(Array.isArray(inventory.traits)).toBe(true);
            expect(Array.isArray(inventory.languages)).toBe(true);
            expect(Array.isArray(inventory.roles)).toBe(true);
            expect(Array.isArray(inventory.sharedBlocks)).toBe(true);
        });
        it('detects all 5 traits', () => {
            const inventory = getSoulPromptsInventory();
            expect(inventory.traits).toContain('gardien_validation_required');
            expect(inventory.traits).toContain('analyste_data_driven');
            expect(inventory.traits).toContain('creatif_libre');
            expect(inventory.traits).toContain('strategique_long_terme');
            expect(inventory.traits).toContain('conformite_strict');
        });
        it('detects all 3 languages', () => {
            const inventory = getSoulPromptsInventory();
            expect(inventory.languages).toContain('fr');
            expect(inventory.languages).toContain('en');
            expect(inventory.languages).toContain('es');
        });
        it('detects all 3 roles', () => {
            const inventory = getSoulPromptsInventory();
            expect(inventory.roles).toContain('orchestrator');
            expect(inventory.roles).toContain('specialist');
            expect(inventory.roles).toContain('workhorse');
        });
        it('detects all 5 shared blocks', () => {
            const inventory = getSoulPromptsInventory();
            expect(inventory.sharedBlocks).toContain('boundary');
            expect(inventory.sharedBlocks).toContain('hive_mind');
            expect(inventory.sharedBlocks).toContain('memory');
            expect(inventory.sharedBlocks).toContain('delegation_policy');
            expect(inventory.sharedBlocks).toContain('message_format');
        });
    });
});
//# sourceMappingURL=soul_prompt_builder.test.js.map
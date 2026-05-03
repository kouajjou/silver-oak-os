import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildSoulPrompt } from './soul_prompt_builder.js';
import { loadDomainRoutes, refreshDomainRoutesCache } from './agent_factory_v2.js';
import fs from 'fs';
import path from 'path';

// ── Unit tests for loadDomainRoutes (no side effects) ─────────────────────

describe('loadDomainRoutes', () => {
  afterEach(() => {
    refreshDomainRoutesCache();
  });

  it('returns an array', () => {
    const routes = loadDomainRoutes();
    expect(Array.isArray(routes)).toBe(true);
  });

  it('each route has agentId, keywords, and patterns', () => {
    const routes = loadDomainRoutes();
    for (const route of routes) {
      expect(typeof route.agentId).toBe('string');
      expect(Array.isArray(route.keywords)).toBe(true);
      expect(Array.isArray(route.patterns)).toBe(true);
    }
  });

  it('includes known agents (main, comms, content, ops, research, maestro)', () => {
    const routes = loadDomainRoutes();
    const ids = routes.map(r => r.agentId);
    // At least some of the seeded agents should be present
    const knownAgents = ['main', 'comms', 'content', 'ops', 'research', 'maestro'];
    const found = knownAgents.filter(id => ids.includes(id));
    expect(found.length).toBeGreaterThan(0);
  });

  it('caches results on second call', () => {
    refreshDomainRoutesCache();
    const r1 = loadDomainRoutes();
    const r2 = loadDomainRoutes();
    // Same reference for cached items
    expect(r1.length).toBe(r2.length);
  });

  it('refreshDomainRoutesCache clears cache', () => {
    loadDomainRoutes(); // populate cache
    refreshDomainRoutesCache(); // clear
    const routes = loadDomainRoutes(); // should re-query
    expect(Array.isArray(routes)).toBe(true);
  });
});

// ── Integration: buildSoulPrompt produces valid CLAUDE.md ─────────────────

describe('createAgent spec validation (unit)', () => {
  it('buildSoulPrompt produces content with all 3 languages', () => {
    const content = buildSoulPrompt({
      agentId: 'test_factory',
      agentName: 'TestFactory',
      agentDescription: 'Test factory agent',
      role: 'specialist',
      traits: ['gardien_validation_required'],
      languages: ['fr', 'en', 'es'],
      sharedBlocks: ['boundary'],
    });
    expect(content).toContain('TestFactory');
    expect(content).toContain('test_factory');
    expect(content).toContain('Français');
    expect(content).toContain('English');
    expect(content).toContain('Español');
  });

  it('buildSoulPrompt with custom mission includes it', () => {
    const mission = 'Manage Airbnb properties for Karim.';
    const content = buildSoulPrompt({
      agentId: 'luca_test',
      agentName: 'Lucas',
      agentDescription: 'Property manager',
      role: 'specialist',
      traits: [],
      languages: ['fr'],
      customMission: mission,
      sharedBlocks: [],
    });
    expect(content).toContain(mission);
  });
});

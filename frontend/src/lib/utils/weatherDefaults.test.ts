import { describe, it, expect } from 'vitest';
import { getProviderDefaults, tempestDefaults, weatherDefaults } from './weatherDefaults';

describe('Tempest weather defaults', () => {
  it('leaves the listen address empty so the backend uses its default port', () => {
    expect(tempestDefaults.listenAddress).toBe('');
  });

  it('opts into no extra fields', () => {
    expect(Object.values(tempestDefaults.extraFields).every(enabled => enabled === false)).toBe(
      true
    );
  });

  it('is part of the complete weather defaults', () => {
    expect(weatherDefaults.tempest).toBe(tempestDefaults);
  });

  it('is returned for the tempest provider and for no other keyless provider', () => {
    expect(getProviderDefaults('tempest')).toBe(tempestDefaults);
    expect(getProviderDefaults('yrno')).toBeNull();
    expect(getProviderDefaults('none')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { PROFILES } from '../../lib/mock-data';
import {
  canAccessMemoryBox,
  getCareExperience,
  getHomeRoute,
  getVoiceExperienceCopy,
} from './role-experience';

describe('role-aware CareLoop experiences', () => {
  it('maps the four demo identities to three shared experiences', () => {
    expect(getCareExperience(PROFILES.amma)).toBe('patient');
    expect(getCareExperience(PROFILES.maya)).toBe('family');
    expect(getCareExperience(PROFILES.rahul)).toBe('family');
    expect(getCareExperience(PROFILES.anu)).toBe('caregiver');
  });

  it('keeps MemoryBox available to Amma and family, but not Anu', () => {
    expect(canAccessMemoryBox(PROFILES.amma)).toBe(true);
    expect(canAccessMemoryBox(PROFILES.maya)).toBe(true);
    expect(canAccessMemoryBox(PROFILES.rahul)).toBe(true);
    expect(canAccessMemoryBox(PROFILES.anu)).toBe(false);
  });

  it('routes non-patient homes through the shared role-aware route', () => {
    expect(getHomeRoute(PROFILES.amma)).toBe('/home');
    expect(getHomeRoute(PROFILES.maya)).toBe('/family');
    expect(getHomeRoute(PROFILES.anu)).toBe('/family');
  });

  it('never offers MemoryBox prompts to the caregiver experience', () => {
    expect(getVoiceExperienceCopy(PROFILES.anu).prompts.join(' ')).not.toMatch(/memory/i);
  });
});

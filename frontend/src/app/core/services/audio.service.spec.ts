import { TestBed } from '@angular/core/testing';
import { AudioService } from './audio.service';

describe('AudioService', () => {
  let service: AudioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AudioService]
    });
    service = TestBed.inject(AudioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should toggle and persist enabled state', () => {
    service.setEnabled(true);
    expect(service.isEnabled()).toBeTrue();
    expect(localStorage.getItem('orbit_pref_audio_enabled')).toBe('true');

    service.setEnabled(false);
    expect(service.isEnabled()).toBeFalse();
    expect(localStorage.getItem('orbit_pref_audio_enabled')).toBe('false');
  });

  it('should not throw when chimes are played while disabled', () => {
    service.setEnabled(false);
    expect(() => service.playSuccessChime()).not.toThrow();
    expect(() => service.playWarningChime()).not.toThrow();
    expect(() => service.playErrorChime()).not.toThrow();
  });

  it('should not throw when chimes are played while enabled', () => {
    service.setEnabled(true);
    expect(() => service.playSuccessChime()).not.toThrow();
    expect(() => service.playWarningChime()).not.toThrow();
    expect(() => service.playErrorChime()).not.toThrow();
  });
});

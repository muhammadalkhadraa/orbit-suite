import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a success toast and emit via toasts$', (done) => {
    service.success('Saved', 'Record updated successfully');

    service.toasts$.subscribe(toasts => {
      if (toasts.length > 0) {
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].title).toBe('Saved');
        expect(toasts[0].message).toBe('Record updated successfully');
        done();
      }
    });
  });

  it('should add error, info, and warning toasts', () => {
    service.error('Failed', 'Network failure');
    service.info('Notice', 'System backup at midnight');
    service.warning('Caution', 'Unsaved changes');

    let currentToasts: any[] = [];
    service.toasts$.subscribe(t => currentToasts = t);

    expect(currentToasts.length).toBe(3);
    expect(currentToasts.map(t => t.type)).toEqual(['error', 'info', 'warning']);
  });

  it('should remove a toast manually by id', () => {
    service.success('Item 1');
    service.info('Item 2');

    let currentToasts: any[] = [];
    service.toasts$.subscribe(t => currentToasts = t);

    const firstId = currentToasts[0].id;
    service.remove(firstId);

    expect(currentToasts.length).toBe(1);
    expect(currentToasts[0].title).toBe('Item 2');
  });

  it('should auto-dismiss toast after duration expires', fakeAsync(() => {
    service.success('Auto-dismiss', 'Vanishes in 2s', 2000);

    let count = 0;
    service.toasts$.subscribe(t => count = t.length);

    expect(count).toBe(1);
    tick(2100);
    expect(count).toBe(0);
  }));

  it('should trigger audio chimes when audioService is enabled', () => {
    const audioService = (service as any).audioService;
    spyOn(audioService, 'isEnabled').and.returnValue(true);
    spyOn(audioService, 'playSuccessChime');
    spyOn(audioService, 'playWarningChime');
    spyOn(audioService, 'playErrorChime');

    service.success('Test Success');
    expect(audioService.playSuccessChime).toHaveBeenCalled();

    service.warning('Test Warning');
    expect(audioService.playWarningChime).toHaveBeenCalled();

    service.error('Test Error');
    expect(audioService.playErrorChime).toHaveBeenCalled();
  });
});

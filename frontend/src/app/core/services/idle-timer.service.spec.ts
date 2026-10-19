import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IdleTimerService } from './idle-timer.service';

describe('IdleTimerService', () => {
  let service: IdleTimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IdleTimerService]
    });
    service = TestBed.inject(IdleTimerService);
  });

  afterEach(() => {
    service.stopMonitoring();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit initial isWarning$ as false', (done) => {
    service.isWarning$.subscribe(warning => {
      expect(warning).toBeFalse();
      done();
    }).unsubscribe();
  });

  it('should trigger warning after idle timeout', fakeAsync(() => {
    // Set 2000ms idle, 3s warning
    service.setTiming(2000, 3);
    service.startMonitoring();

    let warningActive = false;
    service.isWarning$.subscribe(w => warningActive = w);

    expect(warningActive).toBeFalse();

    tick(2000);
    expect(warningActive).toBeTrue();

    service.stopMonitoring();
  }));

  it('should reset timer when staySignedIn is invoked', fakeAsync(() => {
    service.setTiming(2000, 3);
    service.startMonitoring();

    let warningActive = false;
    service.isWarning$.subscribe(w => warningActive = w);

    tick(2000);
    expect(warningActive).toBeTrue();

    service.staySignedIn();
    expect(warningActive).toBeFalse();

    service.stopMonitoring();
  }));

  it('should emit expired$ when countdown completes', fakeAsync(() => {
    service.setTiming(1000, 2);
    service.startMonitoring();

    let expired = false;
    service.expired$.subscribe(() => expired = true);

    tick(1000); // Enters warning
    tick(1000); // 1 sec left
    tick(1000); // 0 sec left, expired

    expect(expired).toBeTrue();
    service.stopMonitoring();
  }));

  it('should stop monitoring and clear timers when stopMonitoring is called', () => {
    service.startMonitoring();
    service.stopMonitoring();
    let warning = true;
    service.isWarning$.subscribe(w => warning = w);
    expect(warning).toBeFalse();
  });
});

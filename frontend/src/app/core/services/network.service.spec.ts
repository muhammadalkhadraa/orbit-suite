import { TestBed } from '@angular/core/testing';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  let service: NetworkService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NetworkService]
    });
    service = TestBed.inject(NetworkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should report initial online status as a boolean', () => {
    expect(typeof service.isOnline).toBe('boolean');
  });

  it('should emit updated values through isOnline$', (done) => {
    service.setOnlineStatus(false);
    expect(service.isOnline).toBeFalse();

    service.isOnline$.subscribe(status => {
      if (status === false) {
        expect(status).toBeFalse();
        done();
      }
    });
  });

  it('should update online status when setOnlineStatus is called', () => {
    service.setOnlineStatus(false);
    expect(service.isOnline).toBeFalse();

    service.setOnlineStatus(true);
    expect(service.isOnline).toBeTrue();
  });

  it('should handle checkConnection when navigator is offline', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(false);
    const result = await service.checkConnection();
    expect(result).toBeFalse();
    expect(service.isOnline).toBeFalse();
  });
});

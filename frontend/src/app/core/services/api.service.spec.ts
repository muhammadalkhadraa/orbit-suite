import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch company profile and fallback to mock data on backend error', (done) => {
    service.getCompany().subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.data.name).toBe('Apex Global Enterprises');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/organization/company'));
    expect(req.request.method).toBe('GET');
    req.error(new ProgressEvent('Network error'));
  });

  it('should fetch tasks with pagination fallback', (done) => {
    service.getTasks().subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.data.data.length).toBeGreaterThan(0);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/tasks'));
    expect(req.request.method).toBe('GET');
    req.error(new ProgressEvent('Network error'));
  });

  it('should fetch audit logs with filter fallback', (done) => {
    service.getAuditLogs({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.data.data.length).toBeGreaterThan(0);
      expect(res.data.data[0].action).toBeDefined();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/audit'));
    expect(req.request.method).toBe('GET');
    req.error(new ProgressEvent('Network error'));
  });

  it('should fetch support tickets and fallback', (done) => {
    service.getTickets().subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.data.data.length).toBeGreaterThan(0);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/tickets'));
    expect(req.request.method).toBe('GET');
    req.error(new ProgressEvent('Network error'));
  });

  it('should fetch product inventory and fallback', (done) => {
    service.getProducts().subscribe(res => {
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.data.data.length).toBeGreaterThan(0);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/inventory/products'));
    expect(req.request.method).toBe('GET');
    req.error(new ProgressEvent('Network error'));
  });
});

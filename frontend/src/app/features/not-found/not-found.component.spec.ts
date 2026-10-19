import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotFoundComponent } from './not-found.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the not found component', () => {
    expect(component).toBeTruthy();
  });

  it('should render 404 badge, title, and action links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge-code')?.textContent).toContain('404');
    expect(compiled.querySelector('.not-found-title')?.textContent).toContain('Lost in Orbit');
    expect(compiled.querySelector('a[routerLink="/app/dashboard"]')).toBeTruthy();
    expect(compiled.querySelector('a[routerLink="/"]')).toBeTruthy();
  });

  it('should render popular destination links in the quick links tray', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.tray-link');
    expect(links.length).toBeGreaterThanOrEqual(4);
    const linkTexts = Array.from(links).map(l => l.textContent);
    expect(linkTexts).toContain('Tasks & Projects');
    expect(linkTexts).toContain('CRM Pipeline');
  });

  it('should determine login status via authService', () => {
    spyOnProperty(authService, 'isAuthenticated', 'get').and.returnValue(true);
    expect(component.isLoggedIn()).toBeTrue();

    (Object.getOwnPropertyDescriptor(authService, 'isAuthenticated')?.get as jasmine.Spy).and.returnValue(false);
    expect(component.isLoggedIn()).toBeFalse();
  });
});

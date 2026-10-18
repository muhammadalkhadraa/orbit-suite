import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspaceLayoutComponent } from './workspace-layout.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('WorkspaceLayoutComponent', () => {
  let component: WorkspaceLayoutComponent;
  let fixture: ComponentFixture<WorkspaceLayoutComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceLayoutComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceLayoutComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create the workspace layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle and close mobile sidebar state', () => {
    expect(component.mobileSidebarOpen).toBeFalse();
    component.toggleMobileSidebar();
    expect(component.mobileSidebarOpen).toBeTrue();
    component.closeMobile();
    expect(component.mobileSidebarOpen).toBeFalse();
  });

  it('should compute user initials accurately', () => {
    (authService as any)['currentUserSubject'].next({
      id: 'u-alex',
      email: 'alex@apex.com',
      fullName: 'Alexander Vance'
    });
    expect(component.getUserInitials()).toBe('AV');
  });

  it('should return correct CSS badge class for role', () => {
    expect(component.getRoleBadgeClass('Owner')).toBe('badge-violet');
    expect(component.getRoleBadgeClass('Admin')).toBe('badge-indigo');
    expect(component.getRoleBadgeClass('Manager')).toBe('badge-cyan');
    expect(component.getRoleBadgeClass('Employee')).toBe('badge-emerald');
  });

  it('should switch role and invoke demo role change', () => {
    spyOn(authService, 'loginAsDemoRole').and.callThrough();
    component.switchRole('Manager');
    expect(authService.loginAsDemoRole).toHaveBeenCalledWith('Manager');
  });

  it('should switch tenant when selected from dropdown', () => {
    spyOn(authService, 'switchTenant').and.returnValue(of({
      accessToken: 'new-token',
      tokenType: 'Bearer',
      expiresInMinutes: 120,
      user: { id: 'u1', email: 'user@orbit.com', fullName: 'User', role: 'Admin' },
      activeTenant: { id: 't2', name: 'Second Corp', slug: 'second-corp', role: 'Admin' },
      availableTenants: []
    }));

    const mockEvent = {
      target: { value: 'tenant-123' }
    } as unknown as Event;

    component.onTenantSelect(mockEvent);
    expect(authService.switchTenant).toHaveBeenCalledWith('tenant-123');
  });

  it('should log out and navigate to login', () => {
    spyOn(authService, 'logout').and.callThrough();
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should dismiss toast notification when invoked', () => {
    const toastService = (component as any).toastService;
    spyOn(toastService, 'remove');
    component.dismissToast('toast-123');
    expect(toastService.remove).toHaveBeenCalledWith('toast-123');
  });

  it('should toggle, open, and close command palette', () => {
    expect(component.commandPaletteOpen).toBeFalse();

    component.openCommandPalette();
    expect(component.commandPaletteOpen).toBeTrue();
    expect(component.paletteQuery).toBe('');
    expect(component.filteredPaletteItems.length).toBeGreaterThan(0);

    component.closeCommandPalette();
    expect(component.commandPaletteOpen).toBeFalse();

    component.toggleCommandPalette();
    expect(component.commandPaletteOpen).toBeTrue();
    component.toggleCommandPalette();
    expect(component.commandPaletteOpen).toBeFalse();
  });

  it('should filter command palette items by search query', () => {
    component.paletteQuery = 'settings';
    component.filterPaletteItems();
    expect(component.filteredPaletteItems.some(i => i.title.toLowerCase().includes('settings'))).toBeTrue();

    component.paletteQuery = 'nonexistentxyz123';
    component.filterPaletteItems();
    expect(component.filteredPaletteItems.length).toBe(0);

    component.paletteQuery = '';
    component.filterPaletteItems();
    expect(component.filteredPaletteItems.length).toBe(component.paletteItems.length);
  });

  it('should execute command palette item and close palette', () => {
    const mockAction = jasmine.createSpy('mockAction');
    const mockItem = {
      id: 'test-item',
      category: 'Navigation' as const,
      title: 'Test Command',
      icon: '⚡',
      action: mockAction
    };

    component.commandPaletteOpen = true;
    component.executePaletteItem(mockItem);

    expect(mockAction).toHaveBeenCalled();
    expect(component.commandPaletteOpen).toBeFalse();
  });

  it('should handle global Ctrl+K keydown shortcut to toggle palette', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    spyOn(event, 'preventDefault');

    component.handleGlobalKeydown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.commandPaletteOpen).toBeTrue();

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleGlobalKeydown(escEvent);
    expect(component.commandPaletteOpen).toBeFalse();
  });

  it('should navigate palette items with ArrowDown, ArrowUp, and Enter', () => {
    component.paletteQuery = '';
    component.filterPaletteItems();
    component.selectedPaletteIndex = 0;

    const arrowDown = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onPaletteKeydown(arrowDown);
    expect(component.selectedPaletteIndex).toBe(1);

    const arrowUp = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onPaletteKeydown(arrowUp);
    expect(component.selectedPaletteIndex).toBe(0);

    const selectedItem = component.filteredPaletteItems[0];
    spyOn(selectedItem, 'action');

    const enterKey = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onPaletteKeydown(enterKey);
    expect(selectedItem.action).toHaveBeenCalled();
  });

  it('should include billing navigation in command palette items', () => {
    const billingItem = component.paletteItems.find(i => i.id === 'nav-billing');
    expect(billingItem).toBeDefined();
    expect(billingItem?.title).toContain('Billing');
  });
});

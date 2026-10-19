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

  it('should toggle and manage notifications feed', () => {
    expect(component.notificationsOpen).toBeFalse();
    expect(component.unreadNotificationCount).toBe(3);

    component.toggleNotifications();
    expect(component.notificationsOpen).toBeTrue();

    // Filter unread
    component.notifFilter = 'unread';
    expect(component.filteredNotifications.length).toBe(3);

    // Filter all
    component.notifFilter = 'all';
    expect(component.filteredNotifications.length).toBe(4);

    // Mark all as read
    component.markAllNotificationsRead();
    expect(component.unreadNotificationCount).toBe(0);

    // Click a notification
    const item = component.notifications[0];
    component.handleNotificationClick(item);
    expect(component.notificationsOpen).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/app/tasks']);

    // Clear notifications
    component.clearAllNotifications();
    expect(component.notifications.length).toBe(0);
  });

  it('should toggle and manage keyboard shortcuts modal', () => {
    expect(component.shortcutsModalOpen).toBeFalse();

    component.toggleShortcutsModal();
    expect(component.shortcutsModalOpen).toBeTrue();

    component.jumpToRoute('/app/finance');
    expect(component.shortcutsModalOpen).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/app/finance']);

    component.toggleShortcutsModal();
    expect(component.shortcutsModalOpen).toBeTrue();
    component.closeShortcutsModal();
    expect(component.shortcutsModalOpen).toBeFalse();
  });

  it('should handle ? shortcut to toggle shortcuts modal and sequential G hotkeys', () => {
    // '?' key opens shortcuts modal
    const qEvent = new KeyboardEvent('keydown', { key: '?' });
    spyOn(qEvent, 'preventDefault');
    component.handleGlobalKeydown(qEvent);
    expect(qEvent.preventDefault).toHaveBeenCalled();
    expect(component.shortcutsModalOpen).toBeTrue();

    // Escape closes shortcuts modal
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleGlobalKeydown(escEvent);
    expect(component.shortcutsModalOpen).toBeFalse();

    // Sequential 'g' then 't' navigates to tasks
    const gEvent = new KeyboardEvent('keydown', { key: 'g' });
    component.handleGlobalKeydown(gEvent);
    expect(component.lastKeyGTime).toBeGreaterThan(0);

    const tEvent = new KeyboardEvent('keydown', { key: 't' });
    spyOn(tEvent, 'preventDefault');
    component.handleGlobalKeydown(tEvent);
    expect(tEvent.preventDefault).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/app/tasks']);

    // Sequential 'g' then 'r' navigates to reports
    component.handleGlobalKeydown(gEvent);
    const rEvent = new KeyboardEvent('keydown', { key: 'r' });
    spyOn(rEvent, 'preventDefault');
    component.handleGlobalKeydown(rEvent);
    expect(rEvent.preventDefault).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/app/reports']);

    // Sequential 'g' then 'o' navigates to organization
    component.handleGlobalKeydown(gEvent);
    const oEvent = new KeyboardEvent('keydown', { key: 'o' });
    spyOn(oEvent, 'preventDefault');
    component.handleGlobalKeydown(oEvent);
    expect(oEvent.preventDefault).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/app/organization']);

    // Sequential 'g' then 'p' navigates to settings
    component.handleGlobalKeydown(gEvent);
    const pEvent = new KeyboardEvent('keydown', { key: 'p' });
    spyOn(pEvent, 'preventDefault');
    component.handleGlobalKeydown(pEvent);
    expect(pEvent.preventDefault).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/app/settings']);
  });

  it('should include extended quick actions in command palette', () => {
    const quickActions = component.paletteItems.filter(p => p.category === 'Action');
    expect(quickActions.length).toBeGreaterThanOrEqual(10);
    const actionTitles = quickActions.map(a => a.title);
    expect(actionTitles).toContain('Create Invoice');
    expect(actionTitles).toContain('Submit Support Ticket');
    expect(actionTitles).toContain('Record Stock Movement');
    expect(actionTitles).toContain('Inspect Audit Logs');
  });
});

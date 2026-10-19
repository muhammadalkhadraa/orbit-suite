import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';

import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            activeTenant$: of({ id: 't-1', name: 'Apex Global', slug: 'apex', role: 'Owner' }),
            currentUser$: of({ id: 'u-1', fullName: 'Alexander Vance', email: 'alex@apex.com' }),
            currentRole: 'Owner'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create the settings component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch between tabs', () => {
    expect(component.activeTab).toBe('organization');

    component.activeTab = 'security';
    expect(component.activeTab).toBe('security');

    component.activeTab = 'team';
    expect(component.activeTab).toBe('team');

    component.activeTab = 'api';
    expect(component.activeTab).toBe('api');
  });

  it('should save organization settings and trigger toast notification', fakeAsync(() => {
    spyOn(toastService, 'success');
    component.orgName = 'Apex Global Logistics';
    component.saveOrgSettings();

    expect(component.savingOrg).toBeTrue();
    tick(500);
    expect(component.savingOrg).toBeFalse();
    expect(toastService.success).toHaveBeenCalledWith(
      'Organization Profile Saved',
      'Apex Global Logistics settings updated successfully.'
    );
  }));

  it('should validate password fields before updating password', () => {
    spyOn(toastService, 'error');
    spyOn(toastService, 'success');

    // Missing fields
    component.changePassword();
    expect(toastService.error).toHaveBeenCalledWith('Validation Error', jasmine.any(String));

    // Mismatched passwords
    component.currentPassword = 'oldPassword123';
    component.newPassword = 'newPassword456';
    component.confirmPassword = 'differentPassword';
    component.changePassword();
    expect(toastService.error).toHaveBeenCalledWith('Password Mismatch', jasmine.any(String));

    // Matching passwords
    component.confirmPassword = 'newPassword456';
    component.changePassword();
    expect(toastService.success).toHaveBeenCalledWith('Credentials Updated', jasmine.any(String));
  });

  it('should toggle two-factor authentication state', () => {
    spyOn(toastService, 'info');
    expect(component.twoFactorEnabled).toBeFalse();

    component.toggle2FA();
    expect(component.twoFactorEnabled).toBeTrue();
    expect(toastService.info).toHaveBeenCalledWith('Two-Factor Authentication', 'Two-Factor Authentication is now enabled.');

    component.toggle2FA();
    expect(component.twoFactorEnabled).toBeFalse();
  });

  it('should handle team invitations and member removal', () => {
    spyOn(toastService, 'success');
    spyOn(toastService, 'warning');

    const initialCount = component.teamMembers.length;
    component.openInviteModal();
    expect(component.showInviteModal).toBeTrue();

    component.inviteName = 'Rachel Adams';
    component.inviteEmail = 'rachel@apexglobal.com';
    component.inviteRole = 'Manager';
    component.submitInvite();

    expect(component.teamMembers.length).toBe(initialCount + 1);
    expect(component.showInviteModal).toBeFalse();
    expect(toastService.success).toHaveBeenCalled();

    const memberId = component.teamMembers[0].id;
    component.removeMember(memberId);
    expect(component.teamMembers.length).toBe(initialCount);
    expect(toastService.warning).toHaveBeenCalled();
  });

  it('should regenerate and roll API key with new random secret', () => {
    spyOn(toastService, 'warning');
    const oldKey = component.apiKey;
    component.regenerateApiKey();

    expect(component.apiKey).not.toBe(oldKey);
    expect(component.apiKey.startsWith('orb_live_sec_')).toBeTrue();
    expect(toastService.warning).toHaveBeenCalled();
  });

  it('should export team members roster to CSV format', () => {
    spyOn(document, 'createElement').and.callThrough();
    component.exportTeamCsv();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});


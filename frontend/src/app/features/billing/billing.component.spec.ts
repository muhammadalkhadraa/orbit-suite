import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillingComponent, PlanTier } from './billing.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';

describe('BillingComponent', () => {
  let component: BillingComponent;
  let fixture: ComponentFixture<BillingComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            activeTenant$: of({ id: 't-1', name: 'Apex Global', slug: 'apex', role: 'Owner' }),
            currentRole: 'Owner'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BillingComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create the billing component', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial activeTab as subscription and enterprise plan selected', () => {
    expect(component.activeTab).toBe('subscription');
    expect(component.currentPlan.id).toBe('plan-enterprise');
    expect(component.availablePlans.length).toBe(3);
  });

  it('should switch between billing tabs', () => {
    component.activeTab = 'payment';
    expect(component.activeTab).toBe('payment');

    component.activeTab = 'invoices';
    expect(component.activeTab).toBe('invoices');

    component.activeTab = 'details';
    expect(component.activeTab).toBe('details');

    component.activeTab = 'subscription';
    expect(component.activeTab).toBe('subscription');
  });

  it('should toggle billing cycle between monthly and annual', () => {
    spyOn(toastService, 'info');
    expect(component.billingCycle).toBe('annual');

    component.toggleBillingCycle();
    expect(component.billingCycle).toBe('monthly');
    expect(toastService.info).toHaveBeenCalledWith('Switched billing view to monthly.');

    component.toggleBillingCycle();
    expect(component.billingCycle).toBe('annual');
    expect(toastService.info).toHaveBeenCalledWith('Switched billing view to annual (20% off).');
  });

  it('should switch plan when user has billing permission', () => {
    spyOn(toastService, 'success');
    const proPlan = component.availablePlans[1]; // Orbit Professional

    component.switchPlan(proPlan);
    expect(component.currentPlan.id).toBe('plan-pro');
    expect(toastService.success).toHaveBeenCalledWith(
      'Successfully switched organization subscription to Orbit Professional!'
    );
  });

  it('should prevent plan switch when user lacks billing permission', () => {
    spyOn(toastService, 'error');
    component.canManageBilling = false;

    const starterPlan = component.availablePlans[0];
    component.switchPlan(starterPlan);

    expect(component.currentPlan.id).toBe('plan-enterprise');
    expect(toastService.error).toHaveBeenCalledWith(
      'Only Owners and Administrators can modify subscription plans.'
    );
  });

  it('should manage payment cards: set default and remove', () => {
    spyOn(toastService, 'success');
    spyOn(toastService, 'info');

    expect(component.paymentCards.length).toBe(2);
    expect(component.paymentCards[0].isDefault).toBeTrue();

    // Set second card as default
    component.setDefaultCard('card-2');
    expect(component.paymentCards[1].isDefault).toBeTrue();
    expect(component.paymentCards[0].isDefault).toBeFalse();
    expect(toastService.success).toHaveBeenCalledWith('Default payment card updated.');

    // Remove first card
    component.removeCard('card-1');
    expect(component.paymentCards.length).toBe(1);
    expect(toastService.info).toHaveBeenCalledWith('Card removed from corporate billing vault.');
  });

  it('should add a new payment card via modal', () => {
    spyOn(toastService, 'success');
    spyOn(toastService, 'error');

    component.openPaymentModal();
    expect(component.showPaymentModal).toBeTrue();

    // Try saving empty
    component.saveNewCard();
    expect(toastService.error).toHaveBeenCalledWith('Please complete all credit card fields.');

    // Fill valid card
    component.newCard = {
      holderName: 'Jordan Vance',
      cardNumber: '4111 2222 3333 9999',
      expiryMonth: 8,
      expiryYear: 2029,
      cvc: '123'
    };

    component.saveNewCard();
    expect(component.showPaymentModal).toBeFalse();
    expect(component.paymentCards.length).toBe(3);
    expect(toastService.success).toHaveBeenCalledWith('New Visa ending in 9999 added to payment vault.');
  });

  it('should download and export invoices', () => {
    spyOn(toastService, 'success');
    const invoice = component.invoices[0];

    component.downloadInvoice(invoice);
    expect(toastService.success).toHaveBeenCalledWith(
      `Generating PDF statement for ${invoice.invoiceNumber}... download ready.`
    );

    component.saveBillingDetails();
    expect(toastService.success).toHaveBeenCalledWith(
      'Tax and corporate billing contact updated successfully.'
    );
  });
});

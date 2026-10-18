import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModuleSpecComponent } from './module-spec.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleSpecComponent', () => {
  let component: ModuleSpecComponent;
  let fixture: ComponentFixture<ModuleSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleSpecComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ moduleKey: 'crm' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleSpecComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the module spec component', () => {
    expect(component).toBeTruthy();
  });

  it('should load CRM specification by route data', () => {
    expect(component.currentSpec?.title).toBe('CRM & Sales Management');
    expect(component.currentSpec?.badge).toBe('CRM');
  });

  it('should render architecture rule warning banner and confirmed boundaries', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.rule-banner')?.textContent).toContain('Critical Engineering Rule');
    expect(compiled.querySelectorAll('.points-list li').length).toBeGreaterThan(0);
  });
});

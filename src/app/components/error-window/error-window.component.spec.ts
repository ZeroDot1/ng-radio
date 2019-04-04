import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorWindowComponent } from './error-window.component';
import { ModalManagerModule } from '@browninglogic/ng-modal';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ErrorHandlingService } from 'src/app/services/error-handling.service';
import { SpyFactories } from 'src/app/testing/spy-factories.spec';

describe('ErrorWindowComponent', () => {
  let component: ErrorWindowComponent;
  let fixture: ComponentFixture<ErrorWindowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ErrorWindowComponent ],
      imports: [
        ModalManagerModule,
        MatIconModule,
        MatButtonModule
      ],
      providers: [
        { provide: ErrorHandlingService, useValue: SpyFactories.CreateErrorHandlingServiceSpy() },
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

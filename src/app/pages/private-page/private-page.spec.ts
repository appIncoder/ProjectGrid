import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivatePage } from './private-page';

describe('PrivatePage', () => {
  let component: PrivatePage;
  let fixture: ComponentFixture<PrivatePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivatePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrivatePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

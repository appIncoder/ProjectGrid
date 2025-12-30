import { TestBed } from '@angular/core/testing';

import { Params } from './params';

describe('Params', () => {
  let service: Params;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Params);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

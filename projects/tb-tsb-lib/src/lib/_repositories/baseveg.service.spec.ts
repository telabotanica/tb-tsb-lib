import { TestBed, inject, async } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'; // line

import { BasevegRepositoryService } from './baseveg.service';

describe('BasevegRepositoryService', () => {
  let service: BasevegRepositoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.get(BasevegRepositoryService);
    http = TestBed.get(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('findElement() should request API via POST', async(() => {
    let testResponse: any;
    service.findElement('carici').subscribe(results => testResponse = results);
    const req = http.expectOne('https://api-veglab.tela-botanica.org/es-proxy/baseveg/_search');
    expect(req.request.method).toBe('POST');
  }));

  it('findElement() response should be a json object', async(() => {
    let testResponse: any;
    service.findElement('carici').subscribe(results => testResponse = results);
    const req = http.expectOne('https://api-veglab.tela-botanica.org/es-proxy/baseveg/_search');
    expect(req.request.responseType).toBe('json');
  }));

  /*it('findElement() response status code should be 200', async(() => {
    let testResponse: any;
    service.findElement('carici').subscribe(results => testResponse = results);
    const req = service.findElement('carici').subscribe(results => testResponse = results);
    console.log(req);
  }));*/

  // test standaridize method

  // test standardizeValidOccurence method
});

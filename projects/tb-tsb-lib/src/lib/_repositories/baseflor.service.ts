import { Injectable } from '@angular/core';
import { RepositoryModel } from '../_models/repository.model';
import { RepositoryItemModel } from '../_models/repository-item.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Baseflor
 */
@Injectable({
  providedIn: 'root'
})
export class BaseflorRepositoryService implements RepositoryModel {
  id = 'baseflor';
  label = 'baseflor';
  apiUrl = `https://api-veglab.tela-botanica.org/es-proxy/baseflor/_search`;
  apiUrl2 = `https://api-veglab.tela-botanica.org/es-proxy/baseflor/_search`;
  levels = ['idiotaxon'];
  description_fr = 'Référentiel taxonomique (espèces) pour la France métropolitaine issu du projet CATMINAT, par Philippe Julve.';

  constructor(private http: HttpClient) { }

  findElement = (query: string) => {
    let esQuery: string;
    const queryArray = query.split(' ');
    if (queryArray.length === 1 && queryArray[0]) {
      esQuery = `
        {
          "query" : {
            "function_score": {
              "query": {
                "bool": {
                  "must": {
                    "term" : { "scientific_name": "${queryArray[0]}[a-z]*" }
                  }
                }
              },
              "functions": [{
                "filter": { "term": { "taxonomic_rang": "esp" } },
                  "random_score": {},
                  "weight": 10
              }],
              "score_mode": "max",
              "boost_mode": "multiply"
            }
          }
        }
      `;
    } else if (queryArray.length > 1) {
      const esQueryStart = `
      {
        "query" : {
          "function_score": {
            "query": {
              "bool": {
                "must": [`;

      let esQueryBody = '';
      let i = 0;
      queryArray.forEach((queryItem) => {
        esQueryBody += `{ "regexp": { "scientific_name": "${queryItem}[a-z]*" } }`;
        esQueryBody += (i < queryArray.length - 1) ? ',' : '';
        i++;
      });

      const esQueryEnd = `
                ]
              }
            },
            "functions": [{
              "filter": { "term": { "taxonomic_rang": "esp" } },
                "random_score": {},
                "weight": 23
            }],
            "score_mode": "max",
            "boost_mode": "multiply"
          }
        }
      }`;

      esQuery = esQueryStart + esQueryBody + esQueryEnd;
    }

    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.post(this.apiUrl, esQuery, { headers });

    return request;
  }

  findById(id): Observable<any> {
    const headers = new HttpHeaders({ 'Content-type': 'application/json'});
    const request: Observable<any> = this.http.get(this.apiUrl2 + id, { headers });
    return request;
  }

  findByIdNomen(idNomen): Observable<any> {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });

    if (idNomen instanceof Array) {
      const esQueryStart = `
      {
        "query" : {
          "bool": {
            "should": [
      `;
      const esQueryEnd = `
            ]
          }
        }
      }
      `;
      let esQueryBody = '';
      let i = 0;

      idNomen.forEach((item) => {
        esQueryBody += `{ "term": { "bdnff_nomen_id": ${item} } }`;
        esQueryBody += (i < idNomen.length - 1) ? ',' : '';
        i++;
      });

      const esQuery: string = esQueryStart + esQueryBody + esQueryEnd;
      const request: Observable<any> = this.http.post(this.apiUrl, esQuery, { headers });
      return request;
    } else if (idNomen instanceof Number || idNomen instanceof String) {
      const request: Observable<any> = this.http.get(this.apiUrl + `?q=bdnff_nomen_id:${idNomen}`, { headers });
      return request;
    }
  }

  findByIdTaxo(idTaxo): Observable<any> {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=bdnff_nomen_id:${idTaxo}`, { headers });
    return request;
  }

  standardize = (rawData: any, attachRawData: boolean = false): any => {
    const sData: Array<RepositoryItemModel> = [];

    // Get results from elasticsearch (= remove metadata)
    rawData = this.filter(rawData);
    rawData.forEach((item) => {
      const rim: RepositoryItemModel = {repository: null, name: null, author: null, idTaxo: null, idNomen: null, isSynonym: false, rawData: null};
      rim.name = item.scientific_name;
      rim.author = '';
      rim.idTaxo = item.bdnff_nomen_id;
      rim.idNomen = item.bdnff_nomen_id;
      if (attachRawData) { rim.rawData = item; }
      sData.push(rim);
    });

    return sData;
  }

  /**
   * Before returning an Observable, some data may needs to be transformed
   * i.e. data from elasticsearch are nested (rawData.hits.hits / _source)
   * @param rawData
   */
  filter(rawData) {
    const data = rawData.hits.hits;
    const results: Array<any> = [];
    data.forEach((d) => { results.push(d._source); });
    return results;
  }

}

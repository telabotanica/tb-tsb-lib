import { Injectable } from '@angular/core';
import { RepositoryModel } from '../_models/repository.model';
import { RepositoryItemModel } from '../_models/repository-item.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Baseveg
 */
@Injectable({
  providedIn: 'root'
})
export class BasevegRepositoryService implements RepositoryModel {
  id = 'baseveg';
  label = 'baseveg';
  apiUrl = `https://api-veglab.tela-botanica.org/es-proxy/baseveg/_search`;
  apiUrl2 = `https://api-veglab.tela-botanica.org/es-proxy/baseveg/_search`;
  levels = ['synusy', 'microcenosis'];
  description_fr = 'Référentiel syntaxonomique (végétations) pour la France métropolitaine issu du projet CATMINAT, par Philippe Julve.';

  constructor(private http: HttpClient) { }

  findElement = (query: string) => {
    let esQuery: string;
    const queryArray = query.split(' ');
    if (queryArray.length === 1 && queryArray[0]) {
      esQuery = `
        {
          "query" : {
            "bool": {
              "must": {
                "prefix": { "syntaxonName": { "value": "${queryArray[0]}" } }
              }
            }
          }
        }
      `;
    } else if (queryArray.length > 1) {
      const esQueryStart = `
      { "query" :
        { "bool":
          { "must": [`;

      let esQueryBody = '';
      let i = 0;
      queryArray.forEach((queryItem) => {
        esQueryBody += `{ "prefix": { "syntaxonName": { "value": "${queryItem}" } } }`;
        esQueryBody += (i < queryArray.length - 1) ? ',' : '';
        i++;
      });

      const esQueryEnd = `
            ]
          }
        }
      }`;

      esQuery = esQueryStart + esQueryBody + esQueryEnd;
    }

    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.post(this.apiUrl, esQuery, { headers });

    return request;
  }

  findById(id) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl2 + id, { headers });
    return request;
  }

  findByIdNomen(idNomen) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=fixedCode:${idNomen}`, { headers });
    return request;
  }

  findByIdTaxo(idTaxo) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=catminatCode:${idTaxo}`, { headers });
    return request;
  }

  findValidOccurenceByIdTaxo(idTaxo: string): Observable<any> {
    idTaxo = idTaxo.replace(/\//gm, '\\\\\/');
    const esQuery = `
    {
      "query" : {
        "bool": {
          "must": {
              "query_string": {
                  "query": "${idTaxo}",
                  "analyzer" : "keyword"
              }
            },
            "must_not": {
              "term": { "level": "syn" }
            }
          }
      }
    }
    `;
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.post(this.apiUrl, esQuery, { headers });
    return request;
  }

  standardize = (rawData: any, attachRawData: boolean = false): Array<RepositoryItemModel> => {
    const sData: Array<RepositoryItemModel> = [];
    // Get results from elasticsearch (= remove metadata)
    rawData = this.filter(rawData);

    rawData.forEach((item) => {
      const rim: RepositoryItemModel = {repository: null, name: null, author: null, idTaxo: null, idNomen: null, isSynonym: false, rawData: null};
      rim.name = item.syntaxonName;
      rim.author = item.syntaxonAuthor;
      rim.idTaxo = item.catminatCode;
      rim.idNomen = item.fixedCode;
      rim.isSynonym = (item.level.indexOf('syn') === -1 ? false : true);
      if (attachRawData) { rim.rawData = item; }
      sData.push(rim);
    });

    return sData;
  }

  standardizeValidOccurence = (rawData: any): RepositoryItemModel => {
    const results = this.standardize(rawData);
    if (results.length > 1) {
      // @todo throw error
      return results[0];
    } else {
      return results[0];
    }
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

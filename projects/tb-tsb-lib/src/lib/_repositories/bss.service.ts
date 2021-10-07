import { Injectable } from '@angular/core';
import { RepositoryModel } from '../_models/repository.model';
import { RepositoryItemModel } from '../_models/repository-item.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * BSS
 */
@Injectable({
  providedIn: 'root'
})
export class BssRepositoryService implements RepositoryModel {
  id = 'bss';
  label = 'BSS';
  apiUrl = `https://api-veglab.tela-botanica.org/es-proxy/bss/_search`;
  apiUrl2 = `https://api-veglab.tela-botanica.org/es-proxy/bss/_search`;
  levels = ['microcenosis', 'synusy'];
  description_fr = 'Liste des végétations du nord-ouest de la France (Haute-Normandie, Nord - Pas de Calais et Picardie) avec évaluation patrimoniale. Référentiel syntaxonomique et référentiel des statuts des végétations de DIGITALE.';

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
                "prefix" : { "CH_NomCompBSS": "${queryArray[0]}" }
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
        esQueryBody += `{ "prefix": { "CH_NomCompBSS": "${queryItem}" } }`;
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
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=PK_BSS:${idNomen}`, { headers });
    return request;
  }

  findByIdTaxo(idTaxo) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=PK_BSS:${idTaxo}`, { headers });
    return request;
  }

  standardize = (rawData: any, attachRawData: boolean = false): any => {
    const sData: Array<RepositoryItemModel> = [];
    // Get results from elasticsearch (= remove metadata)
    rawData = this.filter(rawData);

    rawData.forEach((item) => {
      const rim: RepositoryItemModel = {repository: null, name: null, author: null, idTaxo: null, idNomen: null, isSynonym: false, rawData: null};
      rim.name = item.CH_NomCompBSS;
      rim.author = null;
      rim.idTaxo = item.PK_BSS;
      rim.idNomen = item.PK_BSS;
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

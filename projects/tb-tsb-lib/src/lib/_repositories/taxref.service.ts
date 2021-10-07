import { Injectable } from '@angular/core';
import { RepositoryModel } from '../_models/repository.model';
import { RepositoryItemModel } from '../_models/repository-item.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Taxref
 */
@Injectable({
  providedIn: 'root'
})
export class TaxrefRepositoryService implements RepositoryModel {
  id = 'taxref';
  label = 'Taxref';
  apiUrl = `https://api-veglab.tela-botanica.org/es-proxy/taxref/_search`;
  apiUrl2 = `https://api-veglab.tela-botanica.org/es-proxy/taxref/_search`;
  levels = ['idiotaxon'];
  description_fr = `Référentiel taxonomique pour la France : méthodologie, mise en œuvre et diffusion. Muséum national d’Histoire naturelle, Paris..`;

  constructor(private http: HttpClient) { }

  findElement = (query: string) => {
    let esQuery: string;
    const queryArray = query.split(' ');
    if (queryArray.length === 1 && queryArray[0]) {
      esQuery = `
        {
          "query" : {
            "bool": {
              "must": [
                { "prefix" : { "LB_NOM": "${queryArray[0]}" } },
                { "match": { "RANG": "GN" } }
              ]
            }
          }
        }
      `;
    } else if (queryArray.length === 2) {
      esQuery = `
        {
          "query" : {
            "bool": {
              "must": [
                { "prefix" : { "LB_NOM": "${queryArray[0]}" } },
                { "prefix" : { "LB_NOM": "${queryArray[1]}" } },
                { "match": { "RANG": "ES" } }
              ], "must_not": [
                { "match": { "RANG": "GN" } }
              ]
            }
          }
        }
      `;
    } else if (queryArray.length > 2) {
      const esQueryStart = `
      { "query" :
        { "bool":
          { "must": [`;

      let esQueryBody = '';
      let i = 0;
      queryArray.forEach((queryItem) => {
        esQueryBody += `{ "prefix": { "LB_NOM": "${queryItem}" } }`;
        esQueryBody += (i < queryArray.length - 1) ? ',' : '';
        i++;
      });

      const esQueryEnd = `
            ], "must_not": [
              { "match": { "RANG": "GN" } }
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
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=CD_HAB:${idNomen}`, { headers });
    return request;
  }

  findByIdTaxo(idTaxo) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=CD_HAB:${idTaxo}`, { headers });
    return request;
  }

  standardize = (rawData: any, attachRawData: boolean = false): any => {
    const sData: Array<RepositoryItemModel> = [];
    // Get results from elasticsearch (= remove metadata)
    rawData = this.filter(rawData);

    rawData.forEach((item) => {
      const rim: RepositoryItemModel = {repository: null, name: null, author: null, idTaxo: null, idNomen: null, isSynonym: false, rawData: null};
      rim.name = item.LB_NOM;
      rim.author = item.LB_AUTEUR;
      rim.idTaxo = item.CD_REF;
      rim.idNomen = Number(item.CD_NOM);
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

import { Injectable } from '@angular/core';
import { RepositoryModel } from '../_models/repository.model';
import { RepositoryItemModel } from '../_models/repository-item.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Bdtfx
 */
@Injectable({
  providedIn: 'root'
})
export class BdtfxRepositoryService implements RepositoryModel {
  id = 'bdtfx';
  label = 'bdtfx';
  apiUrl = `https://api-veglab.tela-botanica.org/es-proxy/bdtfx/_search`;
  apiUrl2 = `https://api-veglab.tela-botanica.org/es-proxy/bdtfx/_search`;
  levels = ['idiotaxon'];
  description_fr = `Base de données des trachéophytes de France métropolitaine.
                    Référentiel taxonomique (espèces) coordonné par Tela Botanica et géré par
                    Benoit Bock.`;

  constructor(private http: HttpClient) { }

  findElement = (query: string) => {
    let esQuery: string;
    const queryArray = query.toLowerCase().trim().replace('  ', ' ').replace('sp', '').replace('subsp', '').replace('var', '').split(' ');
    if (queryArray.length === 1 && queryArray[0]) {
      esQuery = `
        {
          "query" : {
            "function_score": {
              "query": {
                "bool": {
                  "must": [
                    { "prefix": { "genre": { "value": "${queryArray[0]}" } } },
                    { "term": { "code_rang": { "value": "220" } } }
                  ]
                }
              },
              "functions": [{
                "filter": { "term": { "code_rang": "220" } },
                  "random_score": {},
                  "weight": 10
              }],
              "score_mode": "max",
              "boost_mode": "multiply"
            }
          }
        }
      `;
    } else if (queryArray.length === 2 && queryArray[0] && queryArray[1]) {
      esQuery = `
        {
          "query" : {
            "function_score": {
              "query": {
                "bool": {
                  "must": [
                    { "prefix": { "genre": { "value": "${queryArray[0]}" } } },
                    { "prefix": { "epithete_espece": { "value": "${queryArray[1]}" } } }
                  ]
                }
              },
              "functions": [
                {
                  "filter": { "term": { "code_rang": "290" } },
                  "weight": 10
                },
                {
                  "filter": {
                    "script": {
                      "script": {
                        "source": "'numero_nomenclatural' == 'numero_nomenclatural_du_nom_retenu'",
                        "lang": "painless"
                      }
                    }
                  },
                  "weight": 10
                }
              ],
              "score_mode": "multiply",
              "boost_mode": "multiply"
            }
          }
        }
      `;
    } else if (queryArray.length === 3 && queryArray[0] && queryArray[1] && queryArray[2]) {
      esQuery = `
        {
          "query" : {
            "function_score": {
              "query": {
                "bool": {
                  "must": [
                    { "prefix": { "genre": { "value": "${queryArray[0]}" } } },
                    { "prefix": { "epithete_espece": { "value": "${queryArray[1]}" } } },
                    { "prefix": { "epithete_infraspecifique": { "value": "${queryArray[2]}" } } }
                  ],
                  "must_not": [
                    { "term": { "code_rang": { "value": "290" } } }
                  ]
                }
              },
              "functions": [
                {
                  "filter": { "term": { "code_rang": "320" } },
                  "weight": 10
                },
                {
                  "filter": {
                    "script": {
                      "script": {
                        "source": "'numero_nomenclatural' == 'numero_nomenclatural_du_nom_retenu'",
                        "lang": "painless"
                      }
                    }
                  },
                  "weight": 10
                }
              ],
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
        esQueryBody += `{ "prefix": { "nom_sans_auteur": { "value": "${queryItem}" } } }`;
        esQueryBody += (i < queryArray.length - 1) ? ',' : '';
        i++;
      });

      const esQueryEnd = `
                ]
              }
            },
            "functions": [{
              "filter": { "term": { "code_rang": "290" } },
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

  findById(id) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl2 + id, { headers });
    return request;
  }

  findByIdNomen(idNomen) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=numero_nomenclatural:${idNomen}`, { headers });
    return request;
  }

  findByIdTaxo(idTaxo) {
    const headers = new HttpHeaders({ 'Content-type': 'application/json' });
    const request: Observable<any> = this.http.get(this.apiUrl + `?q=numero_nomenclatural_du_nom_retenu:${idTaxo}`, { headers });
    return request;
  }

  standardize = (rawData: any, attachRawData: boolean = false): Array<RepositoryItemModel> => {
    const sData: Array<RepositoryItemModel> = [];
    // Get results from elasticsearch (= remove metadata)
    rawData = this.filter(rawData);

    rawData.forEach((item) => {
      const rim: RepositoryItemModel = {repository: 'bdtfx', name: null, author: null, idTaxo: null, idNomen: null, isSynonym: false, rawData: null};
      rim.name = item.nom_sans_auteur;
      rim.author = item.auteur;
      rim.idTaxo = item.numero_nomenclatural_du_nom_retenu;
      rim.idNomen = item.numero_nomenclatural;
      rim.isSynonym = (item.numero_nomenclatural === item.numero_nomenclatural_du_nom_retenu ? false : true);
      if (attachRawData) { rim.rawData = item; }
      sData.push(rim);
    });

    return sData;
  }

  findValidOccurenceByIdTaxo(idTaxo: number): Observable<any> {
    return this.findByIdNomen(idTaxo);
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

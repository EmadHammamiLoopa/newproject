import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { HTTP } from '@ionic-native/http/ngx';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { Platform } from '@ionic/angular';
import constants from './../helpers/constants';

type HttpMethod = 'get' | 'post' | 'put' | 'delete';
type HttpSerializer = 'json' | 'urlencoded' | 'utf8' | 'multipart' | 'raw';
type RequestOptions = {
  method: HttpMethod,
  url: string,
  data?: any,
  params?: any, // Add this line
  header?: any,
  serializer?: HttpSerializer,
  noApi?: boolean
};

@Injectable({
  providedIn: 'root'
})
export class DataService {
  protected apiUrl: string; // Define apiUrl as a protected property

  constructor(
    @Inject('string') private url: string,
    private nativeStorage: NativeStorage,
    private http: HTTP,
    protected httpClient: HttpClient,
    private router: Router,
    public platform: Platform
  ) {
    this.apiUrl = constants.DOMAIN_URL + constants.API_V1 + this.url; // Initialize apiUrl
  }


  getToken() {
    return this.platform.is('cordova')
      ? this.nativeStorage.getItem('token').catch(() => '')
      : Promise.resolve(localStorage.getItem('token'));
  }

  sendRequest(requestOptions: RequestOptions) {
    return this.getToken().then((token: string) => {
      const url = constants.DOMAIN_URL + (requestOptions.noApi ? '' : constants.API_V1) + this.url + requestOptions.url;
      console.log('Request to URL:', url); // Print the URL to the console

      const headers = {
        ...(requestOptions.header || {}),
        VERSION: constants.VERSION,
        'Authorization': 'Bearer ' + token
      };

      // Handle FormData separately
      if (requestOptions.data instanceof FormData) {
        return this.handleFormDataRequest(url, requestOptions, headers);
      }

      return this.platform.is('cordova')
        ? this.cordovaHttpRequest(url, requestOptions, headers)
        : this.browserHttpRequest(url, requestOptions, headers);
    });
  }

  private handleFormDataRequest(url: string, requestOptions: RequestOptions, headers: any) {
    // Use HttpClient for FormData requests
    const httpHeaders = new HttpHeaders(headers);
    let request;

    switch (requestOptions.method) {
      case 'post':
        request = this.httpClient.post(url, requestOptions.data, { headers: httpHeaders });
        break;
      case 'put':
        request = this.httpClient.put(url, requestOptions.data, { headers: httpHeaders });
        break;
      default:
        throw new Error('FormData is only supported for POST and PUT requests');
    }

    return request.toPromise().catch(err => this.handleError(err));
  }

  private cordovaHttpRequest(url: string, requestOptions: RequestOptions, headers: any) {
    const options = {
      method: requestOptions.method,
      params: requestOptions.method === 'get' && requestOptions.data ? requestOptions.data : {},
      data: ['post', 'put'].includes(requestOptions.method) && requestOptions.data ? requestOptions.data : {},
      headers,
      serializer: requestOptions.serializer || 'json'
    };

    return this.http.sendRequest(url, options)
      .then(resp => JSON.parse(resp.data))
      .catch(err => this.handleError(err));
  }

  private browserHttpRequest(url: string, requestOptions: RequestOptions, headers: any) {
    const httpHeaders = new HttpHeaders(headers);
    let request;

    switch (requestOptions.method) {
      case 'post':
        request = this.httpClient.post(url, requestOptions.data, { headers: httpHeaders });
        break;
      case 'get':
        request = this.httpClient.get(url, { headers: httpHeaders, params: requestOptions.data });
        break;
      case 'put':
        request = this.httpClient.put(url, requestOptions.data, { headers: httpHeaders });
        break;
      case 'delete':
        request = this.httpClient.delete(url, { headers: httpHeaders });
        break;
      default:
        throw new Error('Unsupported HTTP method');
    }

    return request.toPromise().catch(err => this.handleError(err));
  }

  private handleError(err: any) {
    console.error('HTTP error', err);
    if (err.status === 401) {
      this.logout();
    } else {
      return Promise.reject(err);
    }
  }

  logout() {
    this.nativeStorage.remove('token');
    this.nativeStorage.remove('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/auth');
  }

  getItem(key: string) {
    return this.nativeStorage.getItem(key);
  }

  setItem(key: string, value: any) {
    return this.nativeStorage.setItem(key, value);
  }
}
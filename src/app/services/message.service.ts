import { Router } from '@angular/router';
import { HTTP } from '@ionic-native/http/ngx';import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { DataService } from './data.service';
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MessageService extends DataService {

  constructor(nativeStorage: NativeStorage, http: HTTP, httpClient: HttpClient, router: Router, platform: Platform) {
    super('message', nativeStorage, http, httpClient, router, platform);
  }

  indexMessages(id: string, page: number){
    return this.sendRequest({
      method: 'get',
      url: '/' + id,
      data: {page: page.toString()}
    })
  }

  usersMessages(page: number){
    return this.sendRequest({
      method: 'get',
      url: '/users',
      data: {page: page.toString()}
    })
  }

  getPermission(id: string){
    return this.sendRequest({
      method: 'get',
      url: '/permission/' + id
    })
  }

  deleteMessage(id: string) {
    return this.sendRequest({
      method: 'delete',
      url: '/' + id
    });
  }
  
}

import { Router } from '@angular/router';
import { HTTP } from '@ionic-native/http/ngx';import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { DataService } from './data.service';
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { throwError, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChannelService extends DataService {

  constructor(nativeStorage: NativeStorage, http: HTTP, httpClient: HttpClient, router: Router, platform: Platform) {
    super('channel', nativeStorage, http, httpClient, router, platform);
  }

  myChannels(page: number, search: string){
    return this.sendRequest({
      method: 'get',
      url: '/myChannels',
      data: {page: page.toString(), search}
    })
  }

  updatePostVisibility(postId: string, visibility: string) {
    return this.sendRequest({
      method: 'put',  // Try using 'put' instead of 'patch'
      url: `/post/${postId}/visibility`,
      data: { visibility }
    });
  }
  
  

  getCityChannels(city: string, country: string, page: number = 0, search: string = '') {
    const params = new URLSearchParams({
      city,
      country,
      page: page.toString(),
      search,
    }).toString();
  
    return this.sendRequest({
      method: 'get',
      url: `/citychannels?${params}` // Append query parameters to the URL
    });
  }
  
  
  
  
  followedChannels(page: number, search: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      search,
    }).toString();
  
    return this.sendRequest({
      method: 'get',
      url: `/followed?${params}` // Append query parameters to the URL
    });
  }
  
  

  exploreChannels(page: number, search: string, level: 'city' | 'country' | 'global') {
    const params = new URLSearchParams({
      page: page.toString(),
      search,
      level,
    }).toString();
  
    return this.sendRequest({
      method: 'get',
      url: `/explore?${params}` // Append query parameters to the URL
    });
  }
  
  
  

  deleteChannel(id: string){
    return this.sendRequest({
      method: 'delete',
      url: '/' + id
    })
  }

  store(data: FormData) {
    data.forEach((value, key) => {
      console.log(`FormData key: ${key}, value:`, value);
    });
  
    return this.sendRequest({
      method: 'post',
      url: '',
      data,
      serializer: 'multipart'
    });
  }

  follow(id: string){
    return this.sendRequest({
      method: 'post',
      url: '/follow/' + id
    });
  }

  getPosts(id: string, page: number) {
    const params = new URLSearchParams({
      page: page.toString(),
    }).toString();
  
    return this.sendRequest({
      method: 'get',
      url: `/${id}/getposts?${params}` // Append query parameters to the URL
    });
  }

  storePost(id: string, data: FormData) {
    return this.httpClient.post(`${this.apiUrl}/${id}/post`, data).pipe(
      catchError((error) => {
        console.error('Error storing post:', error);
        return throwError('Error storing post');
      })
    );
  }


  
  deletePost(id: string){
    return this.sendRequest({
      method: 'delete',
      url: '/post/' + id
    })
  }

  voteOnPost(id: string, vote: number){
    return this.sendRequest({
      method: 'post',
      url: '/post/' + id + '/vote',
      data: {vote}
    })
  }
  storeComment(id: string, data: FormData) {
    return this.httpClient.post(`${this.apiUrl}/post/${id}/comment`, data).pipe(
      catchError((error) => {
        console.error('Error storing comment:', error);
        return throwError('Error storing comment');
      })
    );
  }



  

  getComments(id: string){
    return this.sendRequest({
      method: 'get',
      url: '/post/' + id + '/comment'
    })
  }

  deleteComment(id: string){
    return this.sendRequest({
      method: 'delete',
      url: '/comment/' + id
    })
  }

  voteOnComment(id: string, vote: number){
    return this.sendRequest({
      method: 'post',
      url: '/comment/' + id + '/vote',
      data: {vote}
    })
  }

  reportChannel(id: string, reportType: string, message: string) {
    return this.sendRequest({
      method: 'post',
      url: '/' + id + '/report',
      data: {
        reportType,  // ✅ Now sending `reportType`
        message      // ✅ Sending the user-provided message
      }
    });
  }
  

  reportPost(id: string, message: string){
    return this.sendRequest({
      method: 'post',
      url: '/post/' + id + '/report',
      data: {message}
    })
  }

  reportComment(id: string, message: string){
    return this.sendRequest({
      method: 'post',
      url: '/comment/' + id + '/report',
      data: {message}
    })
  }

  getPost(id: string){
    return this.sendRequest({
      method: 'get',
      url: '/post/' + id
    })
  }
}

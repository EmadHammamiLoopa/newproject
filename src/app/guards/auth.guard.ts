import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { NativeStorage } from '@ionic-native/native-storage/ngx';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private nativeStorage: NativeStorage,
    private router: Router,
    private platform: Platform
  ) {}

  async canActivate(): Promise<boolean> {
    await this.platform.ready();
    
    let token: string;
    let user: any;

    if (this.platform.is('cordova')) {
      try {
        token = await this.nativeStorage.getItem('token');
        user = await this.nativeStorage.getItem('user');
        console.log('Auth token found in NativeStorage:', token);
      } catch (err) {
        console.log('Auth token not found in NativeStorage', err);
      }
    } else {
      token = localStorage.getItem('token');
      user = JSON.parse(localStorage.getItem('user'));
      if (token) {
        console.log('Auth token found in localStorage:', token);
      } else {
        console.log('Auth token not found in localStorage');
      }
    }

    if (token && user) {
      return true;
    } else {
      console.log('Auth token not found, redirecting to /auth/signin');
      this.router.navigate(['/auth/signin']);
      return false;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { OneSignalService } from '../../../services/one-signal.service';
import { User } from '../../../models/User';
import { ModalController } from '@ionic/angular';
import { WelcomeAlertComponent } from '../welcome-alert/welcome-alert.component';
import { SocketService } from 'src/app/services/socket.service';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
})
export class SigninComponent implements OnInit {
  form: FormGroup;
  pageLoading = false;
  validationErrors = {};
  user: User;
  socket = SocketService.socket;

  constructor(
    private formBuilder: FormBuilder,
    private auth: AuthService,
    private toastService: ToastService,
    private router: Router,
    private nativeStorage: NativeStorage,
    private oneSignalService: OneSignalService,
    private modalCtrl: ModalController,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  ionViewWillEnter() {
    this.clearForm();
  }

  initializeForm() {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  clearForm() {
    this.form.patchValue({
      email: '',
      password: ''
    });
  }

  submit() {
    this.pageLoading = true;
    console.log('Submit clicked, form values:', this.form.value);
    this.auth.signin({ email: this.form.value.email, password: this.form.value.password })
      .then(
        (resp: any) => {
          console.log('Sign-in response:', resp);
          this.pageLoading = false;
          this.user = new User().initialize(resp.data.user);

          this.storeUserData(resp.data.token, resp.data.user);

        //  this.oneSignalService.open(resp.data.user._id);

          if (!this.user.loggedIn) {
            this.showWelcomeAlert();
          }

          this.router.navigate(['/tabs/new-friends']);
        },
        err => {
          this.pageLoading = false;
          console.error('Sign-in error:', err);
          if (err && err.errors) {
            this.validationErrors = err.errors;
          } else if (typeof err === 'string') {
            this.toastService.presentStdToastr(err);
          } else {
            this.toastService.presentStdToastr('An unexpected error occurred.');
          }
        }
      )
      .catch(error => {
        this.pageLoading = false;
        console.error('Unexpected error during sign-in:', error);
        this.toastService.presentStdToastr('An unexpected error occurred during sign-in.');
      });
  }

  private storeUserData(token: string, user: any) {
    console.log('Storing user data');
    const userData = JSON.stringify(user); // Convert user data to JSON string

    if (this.platform.is('cordova')) {
      this.nativeStorage.setItem('token', token).then(
        () => console.log('Token stored successfully in NativeStorage'),
        error => console.error('Error storing token in NativeStorage:', error)
      );

      this.nativeStorage.setItem('user', userData).then(
        () => console.log('User stored successfully in NativeStorage'),
        error => console.error('Error storing user in NativeStorage:', error)
      );
    } else {
      console.log('Storing token and user data in localStorage');
      localStorage.setItem('token', token);
      localStorage.setItem('user', userData);
    }

    // Handle socket initialization separately
    this.initializeSocket(user._id);
  }

  private initializeSocket(userId: string, retryCount = 5) {
    const socket = SocketService.socket;
  
    if (socket) {
      socket.on('connect', () => {
        console.log('Socket connected');
        socket.emit('connect-user', userId);
        console.log('User connected to socket:', userId);
      });
  
      socket.on('disconnect', () => {
        console.error('Socket disconnected');
      });
  
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
  
      if (!socket.connected) {
        console.error('Socket is not connected. Retrying...');
        if (retryCount > 0) {
          setTimeout(() => {
            this.initializeSocket(userId, retryCount - 1);
          }, 2000); // Retry after 2 seconds
        } else {
          console.error('Failed to initialize socket after multiple attempts.');
        }
      }
    } else {
      console.error('Socket instance is undefined.');
    }
  }
  

  async showWelcomeAlert() {
    console.log('Showing welcome alert');
    const modal = await this.modalCtrl.create({
      component: WelcomeAlertComponent,
      componentProps: {
        user: this.user
      },
      animated: true,
      showBackdrop: true,
    });
    await modal.present();
  }

  // Google Sign-in method
  googleSignin() {
    this.auth.googleSignIn()
      .then(
        (resp: any) => {
          console.log('Google Sign-In response:', resp);
          this.pageLoading = false;
          this.user = new User().initialize(resp.data.user);

          this.storeUserData(resp.data.token, resp.data.user);

         // this.oneSignalService.open(resp.data.user._id);

          if (!this.user.loggedIn) {
            this.showWelcomeAlert();
          }

          this.router.navigate(['/tabs/new-friends']);
        },
        err => {
          this.pageLoading = false;
          console.error('Google Sign-In error:', err);
          if (err && err.errors) {
            this.validationErrors = err.errors;
          } else if (typeof err === 'string') {
            this.toastService.presentStdToastr(err);
          } else {
            this.toastService.presentStdToastr('An unexpected error occurred.');
          }
        }
      )
      .catch(error => {
        this.pageLoading = false;
        console.error('Unexpected error during Google Sign-In:', error);
        this.toastService.presentStdToastr('Google Sign-In failed.');
      });
  }
}

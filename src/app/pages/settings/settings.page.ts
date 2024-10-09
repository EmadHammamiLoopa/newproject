import { MessengerService } from './../messenger.service';
import { OneSignalService } from './../../services/one-signal.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { AlertController, ModalController } from '@ionic/angular';
import constants from 'src/app/helpers/constants';
import { User } from 'src/app/models/User';
import { AuthService } from 'src/app/services/auth.service';
import { SocketService } from 'src/app/services/socket.service';
import { ToastService } from 'src/app/services/toast.service';
import { UserService } from 'src/app/services/user.service';
import { PrivacyPolicyComponent } from '../privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from '../terms-of-service/terms-of-service.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  appVersion = constants.VERSION
  user: User;
  socket = SocketService.socket;
  pageLoading = false;
  ageVisibility = false;
  randomVisibility : boolean;
  loading = false;


  constructor(private alertController: AlertController, private nativeStorage: NativeStorage, private userService: UserService,
              private toastService: ToastService, private router: Router, private auth: AuthService, private oneSignalService: OneSignalService,
              private messengerService: MessengerService, private modalCtrl: ModalController) { }

  ngOnInit() {
    this.socket = SocketService.socket;

  }

  ionViewWillEnter(){
    this.pageLoading = true;
    this.getUser();
  }

  getUser() {
    // Retrieve visibility states from localStorage or nativeStorage
    const storedAgeVisibility = localStorage.getItem('ageVisibility');
    const storedRandomVisibility = localStorage.getItem('randomVisibility');
  
    this.auth.getAuthUser().then((resp: any) => {
      this.pageLoading = false;
      this.user = new User().initialize(resp.data);
      this.randomVisibility = storedRandomVisibility ? JSON.parse(storedRandomVisibility) : this.user.randomVisible;
      this.ageVisibility = storedAgeVisibility ? JSON.parse(storedAgeVisibility) : this.user.ageVisible;
    });
  }
 // Update the changeEmail function in your settings.page.ts

 async changeEmail() {
  const alert = await this.alertController.create({
    header: 'Change Email',
    message: "Your current email is: " + this.user.email,
    inputs: [
      {
        name: 'email',
        placeholder: 'Your new email here',
      }
    ],
    buttons: [
      {
        text: 'CANCEL',
        cssClass: 'text-dark',
        role: 'cancel'
      },
      {
        text: 'CHANGE',
        handler: (res) => {
          this.loading = true;

          // Validate email input
          if (!res.email || res.email.trim() === '') {
            this.loading = false;
            this.toastService.presentStdToastr("Email is required.");
            return false; // Prevent the API call if email is missing
          }

          // Make API call to update email
          this.userService.updateEmail(this.user._id, res.email).subscribe(
            (resp: any) => {
              console.log("API response:", resp);

              // Ensure the response has the expected data structure
              if (resp && resp.data && resp.data.email) {
                this.toastService.presentStdToastr("Email changed successfully.");
                this.user.email = resp.data.email;
                this.nativeStorage.setItem('user', this.user);
              } else {
                this.toastService.presentStdToastr("Unexpected response format.");
              }
              

              this.loading = false;
            },
            err => {
              console.error("Error updating email:", err);
              this.loading = false;
            
              // Handle error response more gracefully
              if (err.error && err.error.message) {
                // Specific error message from the server
                this.toastService.presentStdToastr(`Error: ${err.error.message}`);
              } else if (err.status === 400) {
                // Bad Request errors
                this.toastService.presentStdToastr("Invalid email format. Please enter a valid email address.");
              } else if (err.status === 409) {
                // Conflict (e.g., email already in use)
                this.toastService.presentStdToastr("This email is already registered. Please try a different one.");
              } else if (err.status === 500) {
                // Server error
                this.toastService.presentStdToastr("Server error. Please try again later.");
              } else {
                // General error fallback
                this.toastService.presentStdToastr("An unexpected error occurred while updating your email. Please try again.");
              }
            }
            
          );
        }
      }
    ]
  });
  await alert.present();
}



async changePassword() {
  const alert = await this.alertController.create({
    header: 'Change Password',
    message: 'Change your password regularly for safety',
    inputs: [
      {
        name: 'current_password',
        type: 'password',
        placeholder: 'Old Password',
      },
      {
        name: 'password',
        type: 'password',
        placeholder: 'New Password',
      },
      {
        name: 'password_confirmation',
        type: 'password',
        placeholder: 'Confirm New Password',
      }
    ],
    buttons: [
      {
        text: 'CANCEL',
        cssClass: 'text-dark',
        role: 'cancel'
      },
      {
        text: 'CHANGE',
        handler: (res) => {
          this.loading = true;

          // Validate the input
          if (!res.current_password || !res.password || !res.password_confirmation) {
            this.loading = false;
            this.toastService.presentStdToastr('All fields are required.');
            return false;
          }

          if (res.password !== res.password_confirmation) {
            this.loading = false;
            this.toastService.presentStdToastr('New password and confirmation do not match.');
            return false;
          }

          // Make API call to update the password
          this.userService.updatePassword(this.user._id,{
            current_password: res.current_password,
            password: res.password,
            password_confirmation: res.password_confirmation
          }).subscribe(
            (resp: any) => {
              this.loading = false;
              this.toastService.presentStdToastr(resp.message || 'Password changed successfully.');
            },
            err => {
              console.error("Error updating password:", err);
              this.loading = false;

              // Display the error message based on the error status or structure
              if (err.error && err.error.message) {
                this.toastService.presentStdToastr(err.error.message);
              } else if (err.status === 400) {
                this.toastService.presentStdToastr('Current password is incorrect.');
              } else {
                this.toastService.presentStdToastr('An error occurred while updating the password.');
              }
            }
          );
        }
      }
    ]
  });

  await alert.present();
}

  signout() {
    this.loading = true;
    console.log('Signout process started'); // Log to verify function call
    this.auth.signout()
        .then(
            () => {
                this.loading = false;
                console.log('Signout successful'); // Log to verify success
               // this.oneSignalService.close();

                if (this.socket) {
                    this.socket.emit('disconnect-user');
                } else {
                    console.error('Socket is not defined');
                }

                // Remove token from native storage
                this.nativeStorage.remove('token').then(() => {
                    console.log('Token removed from native storage'); // Log to verify token removal
                });

                // Remove token from local storage
                localStorage.removeItem('token');
                console.log('Token removed from local storage');

                // Remove token from session storage
                sessionStorage.removeItem('token');
                console.log('Token removed from session storage');

                // Optionally, clear all storage
                // localStorage.clear();
                // sessionStorage.clear();

                // Clear cookies
                document.cookie = 'token=; Max-Age=0; path=/';
                console.log('Token cookie cleared');

                // Navigate to signin page after a short delay to ensure all removals are processed
                setTimeout(() => {
                    this.router.navigate(['/auth/signin']);
                }, 100);
            },
            err => {
                this.loading = false;
                console.error('Signout error:', err); // Log to capture error
                this.toastService.presentStdToastr('Sorry, an error has occurred. Please try again later.');
            }
        );
}

  


toggleRandomVisibility(event) {
  if (this.randomVisibility === this.user.randomVisible) return;

  this.loading = true;
  this.userService.updateRandomVisibility(this.user._id, this.randomVisibility)
    .subscribe(
      (resp: any) => {
        this.loading = false;
        this.user.randomVisible = this.randomVisibility;
        this.toastService.presentStdToastr(resp.message);

        // Save to localStorage
        localStorage.setItem('randomVisibility', JSON.stringify(this.randomVisibility));
      },
      (err) => {
        this.loading = false;
        this.toastService.presentStdToastr(err.message || 'Error updating visibility');
      }
    );
}

toggleAgeVisibility(event) {
  if (this.ageVisibility === this.user.ageVisible) return;

  this.loading = true;
  this.userService.updateAgeVisibility(this.ageVisibility)
    .subscribe(
      (resp: any) => {
        this.loading = false;
        this.user.ageVisible = this.ageVisibility;
        this.toastService.presentStdToastr(resp.message);

        // Save to localStorage
        localStorage.setItem('ageVisibility', JSON.stringify(this.ageVisibility));
      },
      (err) => {
        this.loading = false;
        this.toastService.presentStdToastr(err.message || 'Error updating age visibility');
      }
    );
}

  async openPrivacyPolicy(){
    const modal = await this.modalCtrl.create({
      component: PrivacyPolicyComponent
    });

    await modal.present();
  }

  async openTermsOfService(){
    const modal = await this.modalCtrl.create({
      component: TermsOfServiceComponent
    });

    await modal.present();
  }

  async deleteAccount(){
    const alert = await this.alertController.create({
      header: 'Delete Account',
      message: 'After deleting your account you will still have a chance to restore it within the next 4 days by logging into it, otherwise the account will be deleted permanently from thee application',
      buttons: [
         {
           text: 'cancel',
           role: 'cancel'
         },
         {
           text: 'delete account',
           cssClass: 'text-danger',
           handler: () => {
             this.userService.deleteAccount().subscribe(
               resp => {
                this.signout();
               },
               err => {
                 this.toastService.presentStdToastr(err);
               }
             )
           }
         },
      ]
    })
    await alert.present()
  }


}

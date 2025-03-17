import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, PopoverController, Platform } from '@ionic/angular';
import { AuthService } from './../../../services/auth.service';
import { RequestService } from './../../../services/request.service';
import { ToastService } from './../../../services/toast.service';
import { UserService } from './../../../services/user.service';
import { User } from './../../../models/User';
import { Request } from './../../../models/Request';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import constants from 'src/app/helpers/constants';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { DropDownComponent } from '../../drop-down/drop-down.component';
import { UploadFileService } from 'src/app/services/upload-file.service';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { Camera } from '@ionic-native/camera/ngx';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-display',
  templateUrl: './display.component.html',
  styleUrls: ['./display.component.scss'],
})
export class DisplayComponent implements OnInit {
  pageLoading = true;
  authUser: User;
  @Input() user: User;
  domaine = constants.DOMAIN_URL;
  myProfile: boolean;
  isFriend: boolean = false;
  notFriendOrMe: boolean = false;
  userId: string;
  mainAvatar: string;
  imageLoading = false;
  jwtHelper = new JwtHelperService();

  constructor(
    private auth: AuthService, private userService: UserService, private requestService: RequestService,
    private toastService: ToastService, private alertCtrl: AlertController, private router: Router,
    private platform: Platform, private route: ActivatedRoute, private popoverController: PopoverController,
    private nativeStorage: NativeStorage, private sanitizer: DomSanitizer, private changeDetectorRef: ChangeDetectorRef,
    private uploadFile: UploadFileService, private camera: Camera, private webView: WebView
  ) {}

  ngOnInit() {
    console.log("Initializing DisplayComponent...");
    this.getUserId();
  }

  ionViewWillEnter() {
    console.log("Entering view...");
    this.pageLoading = true;
    this.getUserId();
  }

  async getUserId() {
    this.route.paramMap.subscribe(async (params) => {
      let userIdFromRoute = params.get('id');
      console.log('🔹 Route userId:', userIdFromRoute);
  
      let storedUser = JSON.parse(localStorage.getItem('user'));
      let token: string | null = null;
  
      // ✅ Case 1: Use userId from Route if valid
      if (userIdFromRoute && userIdFromRoute !== 'null') {
        this.userId = userIdFromRoute;
        console.log("📌 Using userId from URL:", this.userId);
      } 
      
      // ✅ Case 2: Use userId from Local Storage if available
      else if (storedUser && storedUser._id) {
        this.userId = storedUser._id;
        console.log("📌 Using userId from LocalStorage:", this.userId);
      } 
      
      // ✅ Case 3: Extract userId from JWT Token
      else {
        console.log("🚀 No userId found, checking token...");
        
        if (this.platform.is('cordova')) {
          try {
            token = await this.nativeStorage.getItem('token');
            console.log('🔹 Auth token retrieved from NativeStorage:', token);
          } catch (error) {
            console.warn('⚠️ Failed to retrieve auth token from NativeStorage:', error);
          }
        } else {
          token = localStorage.getItem('token');
          console.log('🔹 Auth token retrieved from localStorage:', token);
        }
  
        if (token) {
          const decodedToken = this.jwtHelper.decodeToken(token);
          this.userId = decodedToken?._id || null;
  
          if (this.userId) {
            console.log("📌 Extracted userId from token:", this.userId);
            
            // Store userId in LocalStorage if missing
            if (!storedUser) {
              storedUser = { _id: this.userId };
            } else {
              storedUser._id = this.userId;
            }
            localStorage.setItem('user', JSON.stringify(storedUser));
            console.log("✅ Stored userId in LocalStorage:", storedUser);
          } else {
            console.error("❌ Failed to extract userId from token.");
          }
        } else {
          console.error("❌ No auth token found in storage.");
        }
      }
  
      // ❌ Redirect if still no valid userId
      if (!this.userId) {
        console.error("❌ No userId found, redirecting to login...");
        this.router.navigate(['/login']);
        return;
      }
  
      this.loadUserData();
    });
  }
  

  

  loadUserData() {
    console.log("🔄 Loading user data...");
    
    this.userService.getUserProfile(this.userId).subscribe({
      next: (user) => {
        if (user && user._id) {
          this.user = user;
          
          // ✅ Check if this user is the authenticated user
          let storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser && storedUser._id === this.userId) {
            this.myProfile = true;
            console.log("✅ This is my profile.");
          } else {
            this.myProfile = false;
            console.log("ℹ️ Viewing someone else's profile.");
          }
  
          this.setMainAvatar();
          this.filterAvatars();
          this.pageLoading = false;
          console.log('✅ Loaded user data:', this.user);
        } else {
          console.error('❌ User data is undefined or missing _id:', user);
          this.handleUserDataError();
        }
  
        this.changeDetectorRef.detectChanges(); // Trigger change detection
      },
      error: (err) => {
        console.error('❌ Error fetching user profile:', err);
        this.pageLoading = false;
        this.handleUserDataError();
      }
    });
  }
  

  checkIfFriend() {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser && storedUser.friends) {
      this.user.isFriend = storedUser.friends.includes(this.userId);
    } else {
      this.user.isFriend = false;
    }
  }

  async getAuthUser() {
    try {
      let token: string | null = null;
  
      // Retrieve token from storage
      if (this.platform.is('cordova')) {
        try {
          token = await this.nativeStorage.getItem('token'); 
          console.log('🔹 Auth token retrieved from NativeStorage:', token);
        } catch (error) {
          console.warn('⚠️ Failed to retrieve auth token from NativeStorage:', error);
        }
      } else {
        token = localStorage.getItem('token'); 
        console.log('🔹 Auth token retrieved from localStorage:', token);
      }
  
      if (!token) {
        console.error('❌ No auth token found. Redirecting to login...');
        this.router.navigate(['/login']);
        return;
      }
  
      // Decode token to get user ID
      const decodedToken = this.jwtHelper.decodeToken(token);
      console.log('🔹 Decoded Token:', decodedToken);
  
      if (!decodedToken || !decodedToken._id) {
        console.error('❌ Failed to extract userId from token.');
        this.router.navigate(['/login']);
        return;
      }
  
      this.userId = decodedToken._id;
      console.log('✅ Extracted userId from token:', this.userId);
  
      // Store userId in LocalStorage if missing
      let storedUser = JSON.parse(localStorage.getItem('user')) || {};
      if (!storedUser._id) {
        storedUser._id = this.userId;
        localStorage.setItem('user', JSON.stringify(storedUser));
        console.log('✅ Stored userId in LocalStorage:', storedUser);
      }
  
      // Fetch authenticated user profile
      this.userService.getUserProfile(this.userId).subscribe({
        next: (user) => {
          if (user && user._id) {
            this.user = user;
            this.myProfile = true; // ✅ Ensure myProfile is set
            this.setMainAvatar();
            this.pageLoading = false;
            console.log('✅ Loaded authenticated user data:', this.user);
            this.loadUserData();
          } else {
            console.error('❌ Authenticated user data is undefined or missing _id:', user);
            this.handleUserDataError();
          }
          this.changeDetectorRef.detectChanges();
        },
        error: (err) => {
          console.error('❌ Error fetching authenticated user profile:', err);
          this.pageLoading = false;
          this.handleUserDataError();
        }
      });
  
    } catch (error) {
      console.error("❌ Unexpected error retrieving auth token:", error);
      this.router.navigate(['/login']);
    }
  }
  

  
  
  

  checkUserStatus() {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser && storedUser._id) {
      if (storedUser._id === this.user._id) {
        this.user.loggedIn = true;
        this.myProfile = true;
      } else if (storedUser.friends && storedUser.friends.includes(this.user._id)) {
        this.user.isFriend = true;
      } else {
        this.user.isFriend = false;
      }
    } else {
      this.user.loggedIn = false;
    }
    this.notFriendOrMe = !this.user.isFriend && !this.myProfile;
  }

  updateMainAvatar() {
    if (this.user && this.user.avatar && this.user.avatar.length > 0) {
      this.mainAvatar = this.user.mainAvatar || this.user.avatar[0];
    } else {
      this.setDefaultAvatar();
    }
    this.filterAvatars();
    this.updateUserInStorage(this.user.toObject());
    this.changeDetectorRef.detectChanges(); // Trigger change detection
  }
  
  
  

  isDefaultAvatar(avatarUrl: string): boolean {
    return avatarUrl === constants.defaultMaleAvatarUrl ||
           avatarUrl === constants.defaultFemaleAvatarUrl ||
           avatarUrl === constants.defaultOtherAvatarUrl;
  }
  setDefaultAvatar() {
    console.log("ssssssssssssssssssss we arer hreher");
    this.mainAvatar = this.user.gender === 'male' ? constants.defaultMaleAvatarUrl : 
                      (this.user.gender === 'female' ? constants.defaultFemaleAvatarUrl : constants.defaultOtherAvatarUrl);
    this.user.mainAvatar = this.mainAvatar;
    this.updateUserInStorage(this.user.toObject());
    this.changeDetectorRef.detectChanges(); // Trigger change detection
  }
  

  sanitizeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }


  takePicture() {
    this.uploadFile.takePicture(this.camera.PictureSourceType.CAMERA)
      .then((resp: any) => {
        let imageUrl = resp.imageData;
  
        // Convert file path for Cordova platform
        if (this.platform.is('cordova')) {
          imageUrl = this.webView.convertFileSrc(resp.imageData);
        }
  
        const imageFile = new Blob([resp.file], { type: resp.file.type });
        const imageName = resp.name || resp.file.name;
  
        // Create a FormData object to send the image file to the server
        const formData = new FormData();
        formData.append('avatar', imageFile, imageName);
  
        // Upload the image and handle the response
        this.userService.uploadAvatar(this.user._id, formData).subscribe({
          next: (response: any) => {
            if (response && response.user) {
              this.userService.getUserProfile(response.user._id).subscribe({
                next: (updatedUser) => {
                  if (updatedUser && updatedUser._id) {
                    this.user = updatedUser;
                    this.setMainAvatar();
                    this.filterAvatars();
                    this.updateUserInStorage(this.user.toObject());
                    this.changeDetectorRef.detectChanges();
                    this.toastService.presentStdToastr('Avatar uploaded successfully!');
                  } else {
                    console.error('Updated user data is undefined or missing _id:', updatedUser);
                    this.handleUserDataError();
                  }
                },
                error: (err) => {
                  console.error('Failed to reload user data after image upload:', err);
                  this.toastService.presentStdToastr('Failed to reload user data.');
                }
              });
            } else {
              console.error('Invalid response structure:', response);
              this.toastService.presentStdToastr('Error: Invalid response from server.');
            }
          },
          error: (error) => {
            this.toastService.presentStdToastr('Error uploading image: ' + error);
            console.error('Image upload failed:', error);
          }
        });
      },
      err => {
        this.toastService.presentStdToastr('Image capture failed: ' + err);
        console.error('Image capture failed:', err);
      });
  }

  
  selectPictures() {
    this.imageLoading = true;
  
    // Step 1: Select the image from the gallery or other source
    this.uploadFile.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY)
      .then((resp: any) => {
        this.imageLoading = false;
        let imageUrl = resp.imageData;
  
        // Convert file path for Cordova platform
        if (this.platform.is('cordova')) {
          imageUrl = this.webView.convertFileSrc(resp.imageData);
        }
  
        const imageFile = new Blob([resp.file], { type: resp.file.type });
        const imageName = resp.name || resp.file.name;
  
        // Create a FormData object to send the image file to the server
        const formData = new FormData();
        formData.append('avatar', imageFile, imageName);
  
        // Step 2: Upload the avatar and update UI accordingly
        this.userService.uploadAvatar(this.user?._id, formData).subscribe({
          next: (response: any) => {
            if (response && response.user) {
              // Reinitialize the user after successful upload
              if (response.user._id) {
                this.userService.getUserProfile(response.user._id).subscribe({
                  next: (updatedUser) => {
                    if (updatedUser && updatedUser._id) {
                      this.user = updatedUser;
                      // Continue with your logic
                      this.setMainAvatar();
                      this.filterAvatars();
                      this.updateUserInStorage(this.user.toObject());
                      this.changeDetectorRef.detectChanges();
                      this.toastService.presentStdToastr('Avatar uploaded successfully!');
                    } else {
                      console.error('Updated user data is undefined or missing _id:', updatedUser);
                      this.handleUserDataError();
                    }
                  },
                  error: (err) => {
                    console.error('Failed to reload user data after image upload:', err);
                    this.toastService.presentStdToastr('Failed to reload user data.');
                  }
                });
              } else {
                console.error('Uploaded user data is missing _id:', response.user);
                this.handleUserDataError();
              }
            } else {
              console.error('Invalid response structure:', response);
              this.toastService.presentStdToastr('Error: Invalid response from server.');
            }
          },
          error: (error) => {
            this.toastService.presentStdToastr('Error uploading image: ' + error);
            console.error('Image upload failed:', error);
          }
        });
        
      }, 
      err => {
        this.imageLoading = false;
        this.toastService.presentStdToastr('Image selection failed: ' + err);
        console.error('Image selection failed:', err);
      });
  }
  
  

  async showProfileAlert() {
    if (!this.user.profileCreated) {
      const alert = await this.alertCtrl.create({
        header: 'Remember',
        message: 'You can whenever hide your age, and disable/enable random function from setting',
        buttons: [
          {
            text: 'OK',
            role: 'cancel'
          }
        ]
      });

      await alert.present();
    }
  }

  saveUserToStorage() {
    if (this.myProfile) {
      this.platform.ready().then(() => {
        if (this.platform.is('cordova')) {
          this.nativeStorage.setItem('user', this.user.toObject());
        } else {
          localStorage.setItem('user', JSON.stringify(this.user.toObject()));
        }
      });
    }
  }

  refresh(event) {
    if (this.userId && this.userId !== 'null') {
      this.getUser(event);
      this.nativeStorage.getItem('user').then(
        user => {
          this.authUser = user;
        }
      );
    } else {
      this.getAuthUser();
      this.myProfile = true;
    }
  }

  getUser(event?) {
    this.userService.getUserProfile(this.userId).subscribe({
      next: (user: User) => {
        if (user && user._id) {
          this.pageLoading = false;
          this.user = new User().initialize(user);
          this.updateMainAvatar();
          this.filterAvatars();
          this.updateUserInStorage(this.user.toObject());
  
          if (user.friends && this.authUser && this.authUser._id) {
            this.isFriend = user.friends.includes(this.authUser._id);
          } else {
            this.isFriend = false;
            console.warn('User friends list or authUser is undefined:', user.friends, this.authUser);
          }
  
          this.notFriendOrMe = !this.isFriend && !this.myProfile;
          console.log('Loaded user data:', this.user);
        } else {
          console.error('User data is undefined or missing _id:', user);
          this.handleUserDataError();
        }
        this.changeDetectorRef.detectChanges();
  
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error('Error fetching user profile:', err);
        this.pageLoading = false;
        if (event) event.target.complete();
        this.handleUserDataError();
      }
    });
  }
  
  private handleUserDataError() {
    // Display a toast message
    this.toastService.presentStdToastr('Failed to load user data. Please try again later.');
  
    // Optionally, navigate to a different page
    // this.router.navigate(['/error']);
  
    // Reset relevant variables
    this.user = null;
    this.pageLoading = false;
  }
  
  follow() {
    this.userService.follow(this.user._id).subscribe(
      (resp: any) => {
        this.user.followed = resp.data;
        this.toastService.presentStdToastr(this.user.followed ? 'follow' : 'unfollow');
      },
      err => {
        this.toastService.presentStdToastr(err);
      }
    );
  }

  request() {
    if (this.user.friend) this.removeFriendShipConf();
    else if (this.user.request === 'requesting') this.acceptRequest();
    else if (this.user.request === 'requested') this.cancelRequest();
    else this.requestFriendship();
  }

  handleError(err) {
    this.toastService.presentStdToastr(err);
  }

  acceptRequest() {
    this.requestService.acceptRequest(this.user.requests[0]._id).then(
      () => {
        this.user.friend = true;
      },
      err => this.handleError(err)
    );
  }

  removeFriend() {
    this.userService.removeFriendship(this.user._id).subscribe(
      (resp: any) => {
        this.toastService.presentStdToastr(resp.message);
        if (resp.data) {
          this.user.friend = false;
          this.user.request = null;
        }
      },
      err => {
        this.toastService.presentStdToastr(err);
      }
    );
  }

  cancelRequest() {
    this.requestService.cancelRequest(this.user.requests[0]._id).then(
      () => {
        this.user.request = null;
        this.user.requests = [];
      },
      err => this.handleError(err)
    );
  }

  requestFriendship() {
    this.requestService.request(this.user._id).then(
      (resp: any) => {
        this.user.request = 'requested';
        this.user.friend = false;
        this.user.requests.push(new Request(resp.data.request));
        this.toastService.presentStdToastr(resp.message);
      },
      err => {
        err = JSON.parse(err);
        if (err.code && err.code === constants.ERROR_CODES.SUBSCRIPTION_ERROR) {
          this.router.navigate(['/tabs/subscription']);
          this.toastService.presentStdToastr(err.message);
        } else {
          this.toastService.presentStdToastr(err);
        }
      }
    );
  }

  async removeFriendShipConf() {
    const alert = await this.alertCtrl.create({
      header: 'Remove Friendship',
      message: 'Do you really want to remove your friendship?',
      buttons: [
        {
          text: 'CANCEL',
          role: 'cancel'
        },
        {
          text: 'REMOVE',
          cssClass: 'text-danger',
          handler: () => this.removeFriendship()
        }
      ]
    });
    await alert.present();
  }

  removeFriendship() {
    this.userService.removeFriendship(this.user._id).subscribe(
      (resp: any) => {
        this.toastService.presentStdToastr(resp.message);
        if (resp.data) {
          this.user.friend = false;
          this.user.request = null;
        }
      },
      err => {
        this.toastService.presentStdToastr(err);
      }
    );
  }

  async presentPopover(ev: any) {
    const popoverItems = [
      {
        text: 'Block',
        icon: 'fas fa-minus-circle',
        event: 'block'
      },
      {
        text: 'Report',
        icon: 'fas fa-exclamation-triangle',
        event: 'report'
      }
    ];
    const popover = await this.popoverController.create({
      component: DropDownComponent,
      event: ev,
      cssClass: 'dropdown-popover',
      componentProps: {
        items: popoverItems
      }
    });
    await popover.present();

    const { data } = await popover.onDidDismiss();
    if (data && data.event) {
      if (data.event === 'block') {
        this.blockUserConf();
      } else if (data.event === 'report') {
        this.reportUser();
      }
    }
  }

  changeMainAvatar(avatar: string) {
    console.log('Attempting to change main avatar to:', avatar);
    this.userService.updateMainAvatar(this.user._id, avatar).subscribe(
      (response: any) => {
        if (response && response.user) {
          console.log('Main avatar changed successfully:', response);
          this.user.mainAvatar = avatar;
          this.updateUserInStorage(this.user.toObject());
          this.toastService.presentStdToastr('Main avatar updated');
          this.changeDetectorRef.detectChanges();
        } else {
          console.error('Invalid response structure:', response);
        }
      },
      (error) => {
        console.error('Error updating main avatar:', error);
        this.toastService.presentStdToastr(error);
      }
    );
  }
  
  
  

  filterAvatars() {
    const defaultAvatars = [
      constants.defaultMaleAvatarUrl,
      constants.defaultFemaleAvatarUrl,
      constants.defaultOtherAvatarUrl,
    ];
  
    // Filter out default avatars from the list of avatars
    if (this.user.avatar && this.user.avatar.length > 0) {
      this.user.avatar = this.user.avatar.filter(
        (url) => !defaultAvatars.includes(url)
      );
    }
  
    // Ensure that if no custom avatars exist, the main avatar is set to the default avatar
    if (this.user.avatar.length === 0) {
      this.setDefaultAvatar();
    } else {
      this.mainAvatar = this.user.mainAvatar || this.user.avatar[0]; // Set the main avatar to the first available custom avatar
    }
  
    // Ensure mainAvatar is not added to the avatar list if it's a default avatar
    if (defaultAvatars.includes(this.mainAvatar)) {
      this.user.avatar = this.user.avatar.filter(
        (url) => url !== this.mainAvatar
      );
    }
  }
  
  
  

  updateUserInStorage(updatedUser: any) {
    if (this.platform.is('cordova')) {
      this.nativeStorage.setItem('user', updatedUser)
        .then(() => console.log('User updated in NativeStorage'))
        .catch(error => console.error('Error updating user in NativeStorage:', error));
    } else {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    this.changeDetectorRef.detectChanges();
  }

  removeAvatar(avatarUrl: string) {
    this.userService.removeAvatar(this.user._id, avatarUrl).subscribe(
      (response: any) => {
        this.user = new User().initialize(response.user);
        this.filterAvatars();
        
        if (this.user.avatar.length === 0) {
          this.setDefaultAvatar();
        } else {
          this.updateMainAvatar();
        }

        this.updateUserInStorage(this.user.toObject());
        this.changeDetectorRef.detectChanges();
      },
      err => {
        this.toastService.presentStdToastr(err);
      }
    );
  }

  uploadAvatar(files: { url: string, file: any, name: string }[]) {
    const formData: FormData = new FormData();
    files.forEach(file => {
      formData.append('avatar', file.file, file.name);
    });
  
    this.userService.updateAvatar(this.user._id, formData).subscribe(
      (response: any) => {
        if (response && response.user) {
          // Assume response.user contains the updated user data, including the new avatar URLs
          const updatedUser = new User().initialize(response.user);
  
          // Update the avatar list
          this.user.avatar = updatedUser.avatar;
          this.filterAvatars(); // Filter out default avatars if necessary
  
          // Update the user in local storage or native storage
          this.updateUserInStorage(updatedUser.toObject());
  
          // Trigger change detection to update the UI
          this.changeDetectorRef.detectChanges();
  
          // Optionally, display a success toast
          this.toastService.presentStdToastr('Avatar uploaded successfully!');
        } else {
          console.error('Invalid response structure:', response);
          this.toastService.presentStdToastr('Error: Invalid response from server.');
        }
      },
      (error) => {
        console.error('Error uploading avatar:', error);
        this.toastService.presentStdToastr('Error uploading avatar. Please try again.');
      }
    );
  }
  

  setMainAvatar() {
    const defaultAvatars = [
      constants.defaultMaleAvatarUrl,
      constants.defaultFemaleAvatarUrl,
      constants.defaultOtherAvatarUrl,
    ];
  
    // Check if there are custom avatars available, set the first one as main avatar
    if (this.user && this.user.avatar && this.user.avatar.length > 0) {
      this.mainAvatar = this.user.mainAvatar || this.user.avatar[0];
    } else {
      // If no custom avatars are available, set the default avatar based on gender
      this.setDefaultAvatar();
    }
  
    // Ensure the main avatar is not included in the avatar list if it's a default avatar
    if (defaultAvatars.includes(this.mainAvatar)) {
      this.user.avatar = this.user.avatar.filter(
        (url) => url !== this.mainAvatar
      );
    }
  
    this.updateUserInStorage(this.user.toObject());
    this.changeDetectorRef.detectChanges();
  }
  
  
  
  async blockUserConf() {
    const alert = await this.alertCtrl.create({
      header: 'Block User',
      message: 'Do you really want to block this user?',
      buttons: [
        {
          text: 'CANCEL',
          role: 'cancel'
        },
        {
          text: 'BLOCK',
          cssClass: 'text-danger',
          handler: () => this.blockUser()
        }
      ]
    });
    await alert.present();
  }

  blockUser() {
    this.userService.block(this.user._id).subscribe(
      (resp: any) => {
        this.toastService.presentStdToastr(resp.message);
        this.router.navigateByUrl('/tabs/profile/display/null');
      },
      err => {
        this.toastService.presentStdToastr(err);
      }
    );
  }

  async reportUser() {
    const alert = await this.alertCtrl.create({
      header: 'Report ' + this.user.fullName,
      inputs: [
        {
          type: 'text',
          name: 'message',
          placeholder: 'Message'
        }
      ],
      buttons: [
        {
          text: 'CANCEL',
          role: 'cancel'
        },
        {
          text: 'SEND',
          cssClass: 'text-danger',
          handler: (val) => {
            const message = val.message;
            this.userService.report(this.userId, message).subscribe(
              (resp: any) => {
                this.toastService.presentStdToastr(resp.message);
              },
              err => {
                this.toastService.presentStdToastr(err);
              }
            );
          }
        }
      ]
    });
    await alert.present();
  }

  videoCall() {
    if (this.user && this.user.isFriend) {
      this.router.navigateByUrl('/messages/video/' + this.user._id);
    } else {
      this.videoCallSubAlert();
    }
  }
  

  async videoCallSubAlert() {
    const message = !this.user.isFriend ? 
      `You can only have a call with friends. How about sending a friend request to ${this.user.fullName}?` :
      `You must subscribe to call ${this.user.fullName}.`;
      
    const buttons: any[] = [
      {
        text: 'CANCEL',
        role: 'cancel'
      }
    ];
  
    if (!this.user.isFriend) {
      buttons.push(
        {
          text: 'SEND REQUEST',
          cssClass: 'text-primary',
          handler: () => {
            this.request();
          }
        }
      );
    } else {
      buttons.push(
        {
          text: 'SUBSCRIBE',
          cssClass: 'text-danger',
          handler: () => {
            this.router.navigateByUrl('/tabs/subscription');
          }
        }
      );
    }
  
    const alert = await this.alertCtrl.create({
      header: `You can't call ${this.user.fullName}`,
      message: message,
      buttons: buttons
    });
  
    await alert.present();
  }
  
}

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { User } from './../../models/User';
import { Platform } from '@ionic/angular';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import constants from 'src/app/helpers/constants';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  user: User;
  authUser: User;

  edit = false;
  form: FormGroup;
  pageLoading = true;
  myProfile = false;
  mainAvatar: string = '';
  viewedUser: User;

  constructor(
    private userService: UserService,
    private platform: Platform,
    private nativeStorage: NativeStorage,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log("sssssssdewwwwwwwwwwwwwww");

    this.initializeForm();
    this.loadUserData();
  }

  initializeForm() {
    this.form = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      avatar: [''],
      birthDate: [''],
      gender: [''],
      education: [''],
      school: [''],
      country: [''],
      city: [''],
      profession: [''],
      interests: [[]]
    });
  }

  loadUserData() {
    console.log("sssssssdewwwwwwwwwwwwwww");

    const userId = this.route.snapshot.paramMap.get('id');
    this.myProfile = !userId; // Check if it's the user's profile

    if (this.platform.is('cordova')) {
      this.nativeStorage.getItem('user')
        .then(user => {
          this.authUser = new User().initialize(user); // Store the authenticated user's data separately
          this.handleUserData(user, userId);
        })
        .catch(() => {
          this.loadUserDataFromLocalStorage(userId);
        });
    } else {
      this.loadUserDataFromLocalStorage(userId);
    }
  }

  loadUserDataFromLocalStorage(userId: string) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      this.authUser = new User().initialize(user); // Store the authenticated user's data separately
      this.handleUserData(user, userId);
    }
  }

  handleUserData(user: any, userId: string) {
    if (userId && userId !== this.authUser._id) {
      this.fetchUserProfileDirectly(userId);
    } else {
      this.viewedUser = this.authUser; // Set the viewed user to the authenticated user
      this.filterAvatars();
      this.mainAvatar = this.viewedUser.avatar.length > 0 ? this.viewedUser.avatar[0] : '';
      this.populateForm();
      this.pageLoading = false;
    }
  }

  filterAvatars() {
    if (this.user && this.user.avatar) {
      this.user.avatar = this.user.avatar.filter(url => url.startsWith('http'));
    }
  }

  fetchUserProfileDirectly(userId: string) {
    if (userId) {
      this.userService.getUserProfile(userId).subscribe({
        next: (user) => {
          this.user = new User().initialize(user);
          this.filterAvatars(); // Apply the filter after fetching user profile
          this.mainAvatar = this.user.avatar.length > 0 ? this.user.avatar[0] : '';
          console.log('Fetched User Main Avatar URL:', this.mainAvatar); // Log the fetched main avatar URL
          this.populateForm();
          this.pageLoading = false;
        },
        error: () => {
          this.pageLoading = false;
        }
      });
    } else {
      this.pageLoading = false;
    }
  }

  populateForm() {
    if (this.form && this.viewedUser) {
      this.form.patchValue({
        firstName: this.viewedUser.firstName,
        lastName: this.viewedUser.lastName,
        avatar: this.viewedUser.avatar,
        birthDate: this.viewedUser.birthDate,
        gender: this.viewedUser.gender,
        education: this.viewedUser.education,
        school: this.viewedUser.school,
        country: this.viewedUser.country,
        city: this.viewedUser.city,
        profession: this.viewedUser.profession,
        interests: this.viewedUser.interests
      });
    }
  }

  startEditing() {
    this.edit = true;
  }

  cancelEditing() {
    this.edit = false;
    this.populateForm(); // Reset form with current user data
  }

  saveChanges() {
    if (this.form.valid) {
      const updatedUser = {
        firstName: this.form.value.firstName,
        lastName: this.form.value.lastName,
        birthDate: this.form.value.birthDate,
        gender: this.form.value.gender,
        education: this.form.value.education,
        school: this.form.value.school,
        country: this.form.value.country,
        city: this.form.value.city,
        profession: this.form.value.profession,
        interests: this.form.value.interests,
        avatar: this.viewedUser.avatar // Ensure avatars are included
      };

      const userId = this.viewedUser.getId(); // Use the getter method

      this.userService.updateUser(userId, updatedUser).subscribe(
        () => {
          this.updateUserInStorage(updatedUser);
          this.edit = false; // Exit edit mode
          if (this.myProfile) {
            this.authUser = new User().initialize(updatedUser); // Update the authenticated user if it's their profile
          } else {
            this.viewedUser = new User().initialize(updatedUser); // Update the viewed user if it's another user's profile
          }
        },
        (error) => {
          console.error('Error updating user:', error);
        }
      );
    }
  }

  updateUserInStorage(updatedUser: any) {
    if (this.platform.is('cordova')) {
      this.nativeStorage.setItem('user', updatedUser)
        .then(() => {
          console.log('User updated in NativeStorage');
          this.changeDetectorRef.detectChanges(); // Ensure the UI updates
        })
        .catch(error => console.error('Error updating user in NativeStorage:', error));
    } else {
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.changeDetectorRef.detectChanges(); // Ensure the UI updates
    }
    if (this.myProfile) {
      this.authUser = new User().initialize(updatedUser);
    } else {
      this.viewedUser = new User().initialize(updatedUser);
    }
  }
}

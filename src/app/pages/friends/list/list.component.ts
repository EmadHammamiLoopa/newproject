import { UserService } from './../../../services/user.service';
import { User } from './../../../models/User';
import { Platform, IonInfiniteScroll } from '@ionic/angular';
import { ToastService } from './../../../services/toast.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { RequestService } from './../../../services/request.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements OnInit {
  @ViewChild('infinitScroll') infinitScroll: IonInfiniteScroll;

  pageLoading = false;
  friends: User[] = [];
  page: number = 0;
  myProfile: User; // Ensure myProfile is defined

  constructor(
    private requestService: RequestService,
    private platform: Platform,
    private toastService: ToastService,
    private userService: UserService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadUserProfile(); // Load user profile on component initialization
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {
      this.page = 0;
      this.friends = []; // Clear out any old friends data
      this.getFriends();
    });
  }

  
  loadUserProfile() {
    const currentUserId = this.userService.getCurrentUserId(); // Dynamically get the current user ID
    if (!currentUserId) {
      console.error('Current user ID not found');
      this.toastService.presentStdToastr('Failed to load profile.');
      return;
    }
  
    this.userService.getUserProfile(currentUserId).subscribe(
      (profile: User) => {
        this.myProfile = profile; // Set the current user profile
      },
      (error) => {
        console.error('Error loading user profile:', error);
        this.toastService.presentStdToastr('Failed to load profile.');
      }
    );
  }
  

  getFriends(event?: any, refresh: boolean = false) {
    if (!event) this.pageLoading = true;
    if (refresh) this.page = 0;

    this.userService.getFriends(this.page).subscribe(
      (resp: any) => {
        if (!event || refresh) this.friends = [];
        if (refresh) this.infinitScroll.disabled = false;

        resp.friends.forEach((usr: any) => {
          this.userService.getUserProfile(usr._id).subscribe((userProfile) => {
            const friend = new User().initialize({
              ...usr,
              mainAvatar: userProfile.mainAvatar || usr.mainAvatar,
              avatar: userProfile.avatar.length ? userProfile.avatar : usr.avatar,
              firstName: userProfile.firstName || usr.firstName,
              lastName: userProfile.lastName || usr.lastName,
            });
            friend.friend = true;
            this.friends.push(friend);
          });
        });

        this.pageLoading = false;
        this.page++;

        if (event) {
          event.target.complete();
          if (!resp.more && !refresh) event.target.disabled = true;
        }
      },
      (err) => {
        console.error('Error fetching friends:', err);
        this.toastService.presentStdToastr('Failed to load friends.');
        this.pageLoading = false;
        if (event) event.target.complete();
      }
    );
  }

  loadMoreFriends(event: any) {
    this.getFriends(event);
  }

  async removeFriend(friend: User) {
    const alert = await this.alertCtrl.create({
      header: 'Remove Friend',
      message: `Are you sure you want to remove ${friend.fullName} from your friends?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Remove',
          cssClass: 'text-danger',
          handler: () => {
            this.userService.removeFriendship(friend._id).subscribe(
              (resp: any) => {
                this.toastService.presentStdToastr(resp.message);
                this.friends = this.friends.filter((f) => f._id !== friend._id);
              },
              (err) => {
                console.error('Error removing friend:', err);
                this.toastService.presentStdToastr('Failed to remove friend.');
              }
            );
          },
        },
      ],
    });
    await alert.present();
  }

  async blockUser(friend: User) {
    const alert = await this.alertCtrl.create({
      header: 'Block User',
      message: `Are you sure you want to block ${friend.fullName}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Block',
          cssClass: 'text-danger',
          handler: () => {
            this.userService.block(friend._id).subscribe(
              (resp: any) => {
                this.toastService.presentStdToastr(resp.message);
                this.friends = this.friends.filter((f) => f._id !== friend._id);
              },
              (err) => {
                console.error('Error blocking user:', err);
                this.toastService.presentStdToastr('Failed to block user.');
              }
            );
          },
        },
      ],
    });
    await alert.present();
  }
}

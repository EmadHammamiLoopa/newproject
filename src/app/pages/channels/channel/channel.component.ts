import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonInfiniteScroll, ModalController, PopoverController, AlertController, Platform } from '@ionic/angular';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { ChannelService } from './../../../services/channel.service';
import { ToastService } from './../../../services/toast.service';
import { Channel } from 'src/app/models/Channel';
import { User } from './../../../models/User';
import { Post } from './../../../models/Post';
import { PostFormComponent } from './post-form/post-form.component';
import { DropDownComponent } from './../../drop-down/drop-down.component';
import { OneSignalService } from 'src/app/services/one-signal.service';

@Component({
  selector: 'app-channel',
  templateUrl: './channel.component.html',
  styleUrls: ['./channel.component.scss'],
})
export class ChannelComponent implements OnInit {
  @ViewChild('infinitScroll') infinitScroll: IonInfiniteScroll;
  @ViewChild('content') content: IonContent;

  anonyme = false;
  channel: Channel;
  user: User = new User();
  pageLoading = false;
  posts: Post[] = [];
  page = 0;

  constructor(
    private channelService: ChannelService,
    private route: ActivatedRoute,
    private modalCtrl: ModalController,
    private popoverController: PopoverController,
    private alertCtrl: AlertController,
    private toastService: ToastService,
    private router: Router,
    private nativeStorage: NativeStorage,
    private platform: Platform,
    private changeDetectorRef: ChangeDetectorRef,
    private oneSignalService: OneSignalService // Ensure to provide this service if needed
  ) {}

  ngOnInit() {
    this.getUserData();
    this.getChannelParams();
  }

  ionViewWillEnter() {
    this.page = 0;
    this.pageLoading = true;
    this.getChannelPosts(null, true);
  }

  private getUserData() {
    if (this.platform.is('cordova')) {
      this.nativeStorage.getItem('user')
        .then(
          user => {
            console.log('Fetched user data from NativeStorage:', user);
            this.initializeUser(user);
          }
        )
        .catch(error => {
          console.warn('Error fetching user data from NativeStorage:', error);
          this.fetchUserFromLocalStorage();
        });
    } else {
      this.fetchUserFromLocalStorage();
    }
  }

  private fetchUserFromLocalStorage() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      console.log('Fetched user data from localStorage:', user);
      this.initializeUser(user);
    } else {
      console.log('User data not found in localStorage');
      // Handle the scenario where user data is not found
      // For example, redirect to login or handle initial setup
    }
  }

  private initializeUser(user: any) {
    this.user = new User().initialize(user);
    // Assuming filterAvatars, connectUser, initWebrtc, and oneSignalService.open are methods you need
  //  this.oneSignalService.open(this.user._id);
    this.changeDetectorRef.detectChanges(); // Trigger Angular change detection
    console.log('User initialized successfully:', this.user);
  }
  

  getChannelParams() {
    this.route.queryParamMap.subscribe(params => {
      this.pageLoading = false;
      const channelData = JSON.parse(params.get('channel') || '{}');
      this.channel = new Channel().initialize(channelData);
      this.getChannelPosts(null, true);
    });
  }

  
  getChannelPosts(event?, refresh?) {
    if (!event) this.pageLoading = true;
    if (refresh) this.page = 0;

    console.log("channelchannelchannel", this.channel.id);
    console.log("this.page++this.page++this.page++", this.page);
    console.log("Fetching posts for channel ID:", this.channel.id);

    this.channelService.getPosts(this.channel.id, this.page).then(
        (resp: any) => {
          console.log("Posts fetched", resp);

            if (!event || refresh) this.posts = [];
            if (refresh) this.infinitScroll.disabled = false;
            if (event) event.target.complete();

            resp.data.posts.forEach(pst => {
                this.posts.push(new Post().initialize(pst));
            });

            this.page++;
            this.pageLoading = false;
        },
        err => {
          console.error('Error fetching posts:', err);
          this.pageLoading = false;
          
        }
    );
}

  addPost(post: Post) {
    this.posts.unshift(post);
    this.content.scrollToTop(200);
  }

  deletePost(post: Post) {
    this.posts.splice(this.posts.indexOf(post), 1);
  }

async showPostForm() {
  const modal = await this.modalCtrl.create({
    component: PostFormComponent,
    componentProps: { channelId: this.channel.id },
  });

  await modal.present();

  const { data } = await modal.onWillDismiss();
  if (data && data.post) {
    this.addPost(data.post);
  } else {
    console.log("Modal was closed without any post submission.");
  }

  // Proper dismissal of the modal
  await modal.dismiss();
  await modal.onDidDismiss(); // Ensures cleanup
  console.log('Modal cleanup complete');
}

  
  

  async presentPopover(ev: any) {
    const popoverItems = this.getPopoverItems();
    const popover = await this.popoverController.create({
      component: DropDownComponent,
      event: ev,
      cssClass: 'dropdown-popover',
      showBackdrop: false,
      componentProps: { items: popoverItems },
    });
    await popover.present();

    const { data } = await popover.onDidDismiss();
    if (data && data.event) this.handlePopoverEvent(data.event);
  }

  getPopoverItems() {
    const items = [];
    if (this.channel.user.id == this.user._id) {
      items.push({ text: 'Delete', icon: 'fas fa-trash-alt', event: 'delete' });
    } else {
      items.push(
        { text: this.channel.followedBy(this.user._id) ? 'Unfollow' : 'Follow', icon: this.channel.followedBy(this.user._id) ? 'fas fa-minus-circle' : 'fas fa-plus', event: 'follow' },
        { text: 'Report', icon: 'fas fa-exclamation-triangle', event: 'report' }
      );
    }
    return items;
  }

  async handlePopoverEvent(event) {
    if (event === 'follow') {
      if (this.channel.followedBy(this.user._id)) this.togglefollowConf();
      else this.togglefollow();
    } else if (event === 'delete') this.deleteConf();
    else if (event === 'report') this.reportChannel();
  }

  async togglefollowConf() {
    const alert = await this.alertCtrl.create({
      header: `Unfollow ${this.channel.name}`,
      message: 'Do you really want to unfollow this channel?',
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Yes', handler: () => this.togglefollow(), cssClass: 'text-danger' }
      ],
    });
    await alert.present();
  }

  togglefollow() {
    this.channelService.follow(this.channel.id).then(
      (resp: any) => {
        this.toastService.presentStdToastr(resp.message);
        if (resp.data) this.channel.followers.push(this.user._id);
        else this.channel.followers.splice(this.channel.followers.indexOf(this.user._id), 1);
      },
      err => {
        this.toastService.presentStdToastr(err);
      }
    );
  }

  async deleteConf() {
    const alert = await this.alertCtrl.create({
      header: 'Delete Channel',
      message: 'Do you really want to delete this channel?',
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Yes', handler: () => this.deleteChannel(), cssClass: 'text-danger' }
      ],
    });
    await alert.present();
  }

  deleteChannel() {
    this.channelService.deleteChannel(this.channel.id).then(
      (resp: any) => {
        this.toastService.presentStdToastr(resp.message);
        this.router.navigateByUrl('/tabs/channels/list/mines');
      },
      err => {
        this.toastService.presentStdToastr(err);
      }
    );
  }

  async reportChannel() {
    const alert = await this.alertCtrl.create({
      header: `Report ${this.channel.name}`,
      inputs: [{ type: 'text', name: 'message', placeholder: 'Message' }],
      buttons: [
        { text: 'CANCEL', role: 'cancel' },
        {
          text: 'SEND',
          cssClass: 'text-danger',
          handler: val => {
            const message = val.message;
            this.channelService.reportChannel(this.channel.id, message).then(
              (resp: any) => {
                this.toastService.presentStdToastr(resp.message);
              },
              err => {
                this.toastService.presentStdToastr(err);
              }
            );
          },
        },
      ],
    });
    await alert.present();
  }
}

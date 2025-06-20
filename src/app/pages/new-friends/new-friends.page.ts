
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { IonInfiniteScroll, IonSlides, ModalController } from '@ionic/angular';
import { UserService } from 'src/app/services/user.service';
import { SearchOptionsComponent } from './search-options/search-options.component';
import { User } from './../../models/User';
import { AdMobFeeService } from './../../services/admobfree.service';

@Component({
  selector: 'app-new-friends',
  templateUrl: './new-friends.page.html',
  styleUrls: ['./new-friends.page.scss'],
})
export class NewFriendsPage implements OnInit {
  @ViewChild('infinitScroll') infinitScroll: IonInfiniteScroll;
  @ViewChild('slides') slides: IonSlides;

  users: (User | { isDivider: true })[] = [];
  isGlobalSearch: boolean = false; // Declare and initialize

  options = {
    gender: 'both',
    profession: '0',
    interests: '0',
    education: '0'
  }
  page = 0;
  pageLoading = false;
  initialSlide = 0;
  showSlides = false;
  random = false;
  authUser: User;
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    onlyExternal: false
  };


  constructor(private userService: UserService, private modalController: ModalController, private router: Router,
              private changeDetectorRef: ChangeDetectorRef, private nativeStorage: NativeStorage, private adMobFeeService: AdMobFeeService) { }

              ngOnInit() {
                this.getAuthUser();
              }

  ionViewWillEnter(){
    this.page = 0;
    this.slideOpts = {
      initialSlide: 0,
      speed: 400,
      onlyExternal: false
    }
    this.getNearUsers(null, true);
    this.getAuthUser();
  }

  toggleRandom(){
    this.users = [];
    this.pageLoading = true;
    this.getNearUsers(null, true)
  }

  getAuthUser() {
    this.pageLoading = true;
    this.nativeStorage.getItem('user')
      .then(
        user => {
          if (user) {
            this.authUser = new User().initialize(user);
            console.log("Authenticated user data fetched and stored:", this.authUser);
          } else {
            this.fallbackToLocalStorage();
          }
        },
        err => {
          this.fallbackToLocalStorage();
        }
      );
  }
  

  fallbackToLocalStorage() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        this.authUser = new User().initialize(user);
      } else {
        this.pageLoading = false;
      }
    } catch (err) {
      this.pageLoading = false;
    }
  }

  getNearUsers(event?, refresh?) {
    if (refresh) {
      this.page = 0;
      this.pageLoading = true;
    }
  
    this.userService.getUsers(this.page++, { ...this.options, type: this.random ? 'random' : 'near' })
      .subscribe(
        (resp: any) => {
          this.isGlobalSearch = resp.data.isGlobalSearch; // Capture the flag from the backend
       console.log("global..........", this.isGlobalSearch);

      console.log("Response received from backend:", resp);
    console.log("Users array:", resp.data.users);

          if (refresh) this.users = [];
  
          resp.data.users.forEach(user => {
            if (user.isDivider) {
              this.users.push({ isDivider: true });
            } else {
              const initializedUser = new User().initialize(user);
              console.log('Initialized User:', initializedUser);
              this.users.push(initializedUser);
            }
          });
  
          if (refresh && this.infinitScroll) this.infinitScroll.disabled = false;
  
          if (this.random) {
            this.showSlides = true;
            this.initialSlide = 0;
          }
  
          if (event) {
            event.target.complete();
            if (!resp.data.more && !refresh) event.target.disabled = true;
          }
  
          if (refresh && this.slides) {
            this.slides.slideTo(0, 200);
          }
  
          this.pageLoading = false;
          this.changeDetectorRef.detectChanges();
        },
        err => {
          if (event) {
            event.target.complete();
          }
          if (refresh && this.infinitScroll) this.infinitScroll.disabled = false;
  
          this.pageLoading = false;
          console.log(err);
        }
      );
  }
  
  isUser(user: any): user is User {
    return !user.isDivider;
  }
  
  

  async presentSearchByModal(){
    const modal = await this.modalController.create({
      componentProps: {
        checkItems: {
          profession: this.options.profession,
          education: this.options.education,
          interests: this.options.interests,
        },
        gender: this.options.gender
      },
      component: SearchOptionsComponent
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    console.log(data);

    if(Object.keys(data).length){
      this.options = data;
      this.page = 0;
      this.getNearUsers(null, true)
    }
  }

  showUser(ind: number){
    this.initialSlide = ind;
    this.showSlides = true
  }

  showProfile(id: string){
    this.router.navigateByUrl('/tabs/profile/display/' + id)
  }

  skipSlide(){
    this.slides.slideNext();
  }

}

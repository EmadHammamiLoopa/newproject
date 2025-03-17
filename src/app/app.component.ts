import { ChangeDetectorRef, Component } from '@angular/core';
import { Platform, ModalController } from '@ionic/angular';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { JsonService } from './services/json.service';
import { Router } from '@angular/router';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { Network } from '@ionic-native/network/ngx';
import { OneSignalService } from './services/one-signal.service';
import { WebrtcService } from './services/webrtc.service';
import { MessengerService } from './pages/messenger.service';
import { AdMobFeeService } from './services/admobfree.service';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { User } from './models/User';
import { SocketService } from './services/socket.service';
import { ListSearchComponent } from '../app/pages/list-search/list-search.component';
import { ToastService } from './services/toast.service'; // Import ToastService
import { RequestService } from './services/request.service';
import { Socket } from 'socket.io-client';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  socket: Socket | null = null; // Use the Socket type from socket.io-client
  user: User;
  audio: HTMLAudioElement;
  newRequestsCount: number = 0;
  showSplash = true;

  countries = [];
  currencies = {};
  educations = [];
  professions = [];
  interests = [];
  selectedCountry: any;
  selectedCity: any;
  selectedProfession: any;
  selectedInterests: any;

  constructor(
    private platform: Platform,
    private nativeStorage: NativeStorage,
    private jsonService: JsonService,
    private oneSignalService: OneSignalService,
    private webrtcService: WebrtcService,
    private statusBar: StatusBar,
    private splashScreen: SplashScreen,
    private network: Network,
    private router: Router,
    private messengerService: MessengerService,
    private adMobFreeService: AdMobFeeService,
    private backgroundMode: BackgroundMode,
    private modalCtrl: ModalController,
    private changeDetectorRef: ChangeDetectorRef,
    private toastService: ToastService, // Inject ToastService
    private requestService: RequestService,
    private socketService: SocketService // ✅ Inject SocketService

  ) {

    
    this.initializeApp();
  }

  ngOnInit() {
    this.loadRequests();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      if (this.platform.is('cordova')) {
        this.statusBar.styleDefault();
        this.splashScreen.hide();
        this.backgroundMode.enable();
        this.network.onDisconnect().subscribe(() => {
          this.onOffline();
        });
      } else {
        console.log('Running in browser, Cordova not available');
      }
  
      this.getUserData();  // ✅ WebSocket initialization is moved to getUserData()
      this.getJsonData();
  
      setTimeout(() => {
        this.showSplash = false;
      }, 8000);
    });
  }
  

  ionViewWillEnter() {
  //  this.oneSignalService.close();
  }


  loadRequests() {
    this.requestService.requests(0).then((resp: any) => {
        if (!resp || !resp.data) { // ✅ Check if `resp` and `resp.data` exist
            console.warn("No request data received. Defaulting to 0.");
            this.newRequestsCount = 0;
            return;
        }

        this.newRequestsCount = resp.data.length;
    }).catch(err => {
        console.error("Error in loadRequests:", err);
        this.newRequestsCount = 0; // ✅ Prevent app crash by setting a default value
    });
}

  
  async presentModal(data: any[], title: string) {
    let modalData = data;

    if (!Array.isArray(data)) {
      console.error('Input data is not an array:', data);
      modalData = Object.keys(data).map(key => ({ name: key, values: data[key] }));
    }

    const modal = await this.modalCtrl.create({
      component: ListSearchComponent,
      componentProps: { data: modalData, title }
    });

    modal.onDidDismiss().then((result) => {
      console.log(`Selected ${title}:`, result.data);
      if (title === 'Countries') {
        this.selectedCountry = result.data;
      } else if (title === 'Cities') {
        this.selectedCity = result.data;
      } else if (title === 'Professions') {
        this.selectedProfession = result.data;
      } else if (title === 'Interests') {
        this.selectedInterests = result.data;
      }
    });

    return await modal.present();
  }

  async presentCountriesModal() {
    await this.presentModal(this.countries, 'Countries');
  }

  async presentProfessionsModal() {
    await this.presentModal(this.professions, 'Professions');
  }

  async presentEducationsModal() {
    await this.presentModal(this.educations, 'Educations');
  }

  async presentInterestsModal() {
    await this.presentModal(this.interests, 'Interests');
  }

  playAudio(src: string) {
    console.log('play app audio');
    console.log(src);
    this.audio = new Audio();
    this.audio.src = src;
    this.audio.load();
    this.audio.loop = true;
    this.audio.play();
  }

  connectUser() {
    if (!this.socket || !this.socket.emit) {
        console.error('❌ Socket is not initialized.');
        return;
    }

    this.socket.emit('connect-user', this.user.id);
    this.socket.on('called', (data) => {
        console.log("📞 Incoming call from:", data.callerId);

        // ✅ Store partner ID for WebRTC connection
        localStorage.setItem('partnerId', data.callerId);

        this.playAudio('./../../../../../assets/audio/calling.mp3');

        this.messengerService.onMessage().subscribe((msg) => {
            if (msg?.event === 'stop-audio') {
                this.audio.pause();
            }
        });

        console.log("📡 WebRTC connection initialized.");
        this.initWebrtc(); // ✅ Initialize WebRTC with stored partner ID
    });

    this.socket.on('video-canceled', () => {
        console.log("🚫 Call canceled.");
        if (this.audio) this.audio.pause();
        localStorage.removeItem('partnerId'); // ✅ Clear stored partner ID
    });
}


  getUserData() {
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
    this.filterAvatars();
    this.connectUser();
    this.initWebrtc();
    
    // ✅ Initialize WebSocket when user data is loaded
    SocketService.initializeSocket(this.user.id).catch(err => {
      console.error("WebSocket initialization failed:", err);
    });
  
    this.changeDetectorRef.detectChanges();
  }
  
  
  private filterAvatars() {
    if (this.user.avatar) {
      this.user.avatar = this.user.avatar.filter(url => url.startsWith('http') && url !== '');
    }
    this.changeDetectorRef.detectChanges(); // Trigger Angular change detection
  }

  async initWebrtc() {
    if (!this.user || !this.user.id) {
        console.error("❌ User data is missing. Cannot initialize WebRTC.");
        return;
    }

    // ✅ Retrieve stored partner ID if available
    let partnerId = localStorage.getItem('partnerId');
    if (!partnerId) {
        console.warn("⚠️ No partner ID found. Waiting for incoming call...");
        return;
    }

    console.log(`🔵 Initializing WebRTC for auth user: ${this.user.id}, Partner: ${partnerId}`);

    try {
        // ✅ Establish a WebRTC peer connection with the partner
        await this.webrtcService.createPeer(this.user.id, partnerId);
    } catch (error) {
        console.error("❌ Error initializing WebRTC:", error);
    }
}


  getJsonData() {
    this.jsonService.getCountries()
      .then((resp: any) => {
        //console.log('Countries response:', resp); // Log the response
        if (Array.isArray(resp)) {
          this.countries = resp;
        } else {
          this.countries = Object.keys(resp).map(key => ({ name: key, values: resp[key] }));
        }
        this.nativeStorage.setItem('countries', JSON.stringify(this.countries)).catch((error) => {
          console.warn('NativeStorage not available, using localStorage fallback', error);
          localStorage.setItem('countries', JSON.stringify(this.countries));
        });
       // console.log('Countries fetched:', this.countries);
      });
  
    this.jsonService.getCurrencies()
      .then((resp: any) => {
      //  console.log('Currencies response:', resp); // Log the response
        this.currencies = resp;
        this.nativeStorage.setItem('currencies', JSON.stringify(resp)).catch((error) => {
          console.warn('NativeStorage not available, using localStorage fallback', error);
          localStorage.setItem('currencies', JSON.stringify(resp));
        });
        //console.log('Currencies fetched:', resp);
      });
  
    this.jsonService.getEducations()
      .then((resp: any) => {
        //console.log('Educations response:', resp); // Log the response
        this.educations = resp;
        this.nativeStorage.setItem('educations', JSON.stringify(resp)).catch((error) => {
          console.warn('NativeStorage not available, using localStorage fallback', error);
          localStorage.setItem('educations', JSON.stringify(resp));
        });
       // console.log('Educations fetched:', resp);
      });
  
    this.jsonService.getProfessions()
      .then((resp: any) => {
      //  console.log('Professions response:', resp); // Log the response
        this.professions = resp;
        this.nativeStorage.setItem('professions', JSON.stringify(resp)).catch((error) => {
          console.warn('NativeStorage not available, using localStorage fallback', error);
          localStorage.setItem('professions', JSON.stringify(resp));
        });
        //console.log('Professions fetched:', resp);
      });
  
    this.jsonService.getInterests()
      .then((resp: any) => {
        //console.log('Interests response:', resp); // Log the response
        this.interests = resp;
        this.nativeStorage.setItem('interests', JSON.stringify(resp)).catch((error) => {
          console.warn('NativeStorage not available, using localStorage fallback', error);
          localStorage.setItem('interests', JSON.stringify(resp));
        });
        //console.log('Interests fetched:', resp);
      });
  }

  async onOffline() {
    this.router.navigate(['/internet-error']);
  }
}

import { Location } from '@angular/common';
import { ToastService } from './../../../../services/toast.service';
import { UserService } from './../../../../services/user.service';
import { User } from './../../../../models/User';
import { WebrtcService } from './../../../../services/webrtc.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, ElementRef, OnInit } from '@angular/core';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { SocketService } from 'src/app/services/socket.service';
import { MessengerService } from './../../../messenger.service';
import { AdMobFeeService } from './../../../../services/admobfree.service';
import { Socket } from 'socket.io-client';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss'],
})
export class VideoComponent implements OnInit {
  calling = false;
  isAudioPlaying = false; // Add this flag

  pageLoading = false;
  topVideoFrame = 'partner-video';
  userId: string;
  myEl: HTMLMediaElement;
  partnerEl: HTMLMediaElement;
  partner: User = new User();
  user: User = new User();
  answer = false;
  answered = false;
  socket: Socket;
  audio: HTMLAudioElement;
  audioEnabled = true;
  cameraEnabled = true;

  constructor(
    public webRTC: WebrtcService,
    public elRef: ElementRef,
    private route: ActivatedRoute,
    private userService: UserService,
    private toastService: ToastService,
    private location: Location,
    private nativeStorage: NativeStorage,
    private router: Router,
    private messengerService: MessengerService,
    private adMobFeeService: AdMobFeeService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    console.log("ngOnInit called");
    this.getAuthUser();
    this.route.paramMap.subscribe(params => {
      const userId = params.get('id');
      console.log("Retrieved userId from route parameters:", userId);
      if (userId) {
        this.userId = userId;
        this.getUser();
      } else {
        console.warn("No userId found in route parameters.");
      }
    });
  }

  ionViewWillEnter() {
    this.pageLoading = true;
    this.getUserId();
  }

  getUserId() {
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('id');
      this.route.queryParamMap.subscribe(query => {
        this.answer = query.get('answer') ? true : false;
        this.getUser();
      });
    });
  }

  getUser() {
    console.log('Fetching user profile for ID:', this.userId);
    this.userService.getUserProfile(this.userId).subscribe(
      (resp: any) => {
        this.pageLoading = false;
        console.log('User profile response:', resp);
  
        const userData = resp.data || resp; // Check for both resp.data and resp
  
        if (userData) {
          try {
            // Log the userData to see its structure
            console.log('Raw userData:', userData);
  
            // Initialize only if userData is a plain object
            if (userData instanceof User) {
              this.partner = userData;
            } else if (typeof userData === 'object') {
              this.partner = new User().initialize(userData);
            } else {
              console.error('Invalid response data: userData is not a plain object');
              console.error('Received userData:', userData);
              this.handleUserInitError();
              return;
            }
  
            console.log('Partner initialized successfully:', this.partner);
            this.getAuthUser();
          } catch (error) {
            // Log the error details
            console.error('Error initializing partner user:', error);
            console.error('User data causing error:', userData);
            this.handleUserInitError();
          }
        } else {
          // Log if userData is null or undefined
          console.error('Invalid response data: userData is null or undefined');
          console.error('Received response:', resp);
          this.handleUserInitError();
        }
      },
      err => {
        // Log the error from the service call
        console.error('Error fetching user profile:', err);
        this.pageLoading = false;
        this.location.back();
        this.toastService.presentStdToastr("Cannot make this call, try again later");
      }
    );
  }
  
  

  getAuthUser() {
    if (this.isCordovaAvailable()) {
      this.nativeStorage.getItem('user').then(
        user => {
          if (user) {
            try {
              if (typeof user === 'object' && !(user instanceof User)) {
                this.user = new User().initialize(user);
              } else {
                console.error('Invalid user data from native storage:', user);
                this.handleUserInitError();
                return;
              }
              console.log('Auth user initialized successfully:', this.user);
              this.connectSocketAndInit();
            } catch (error) {
              console.error('Error initializing auth user from native storage:', error);
              this.handleUserInitError();
            }
          } else {
            this.fetchUserFromLocalStorage();
          }
        },
        err => {
          console.error('Error getting auth user from native storage:', err);
          this.fetchUserFromLocalStorage();
        }
      );
    } else {
      console.log('Cordova not available - using localStorage');
      this.fetchUserFromLocalStorage();
    }
  }

  fetchUserFromLocalStorage() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        if (typeof user === 'object' && !(user instanceof User)) {
          this.user = new User().initialize(user);
        } else {
          console.error('Invalid user data from localStorage:', user);
          this.handleUserInitError();
          return;
        }
        console.log('Auth user initialized from localStorage:', this.user);
        this.connectSocketAndInit();
      } else {
        this.handleUserInitError();
      }
    } catch (err) {
      console.error('Error initializing auth user from localStorage:', err);
      this.handleUserInitError();
    }
  }

  handleUserInitError() {
    this.pageLoading = false;
    this.toastService.presentStdToastr("User not found, please log in again");
    this.router.navigate(['/auth/signin']);
  }

  pauseAudio() {
    if (this.audio && this.isAudioPlaying) {
      this.audio.pause();
      this.isAudioPlaying = false;
    }
  }

  connectSocketAndInit() {
    this.socket = SocketService.socket;  // Initialize socket from static member
    if (!this.socket) {
      console.error('SocketService.socket is undefined');
      return;
    }
    this.socket.emit('connect-user', this.user.id);

    if (this.init()) {
      if (this.answer) {
        this.messengerService.sendMessage({ event: 'stop-audio' });
        this.playAudio("./../../../../../assets/audio/calling.mp3");
      }
      this.cancelListener();
    }
  }
  playAudio(src: string) {
    if (!this.audio) {
      this.audio = new Audio();
    }
    if (this.audio.src !== src) {
      this.audio.src = src;
      this.audio.load();
    }
    this.audio.loop = true;

    // Pause the audio if it is currently playing before playing it again
    if (!this.audio.paused) {
      this.audio.pause();
    }

    this.audio.play().then(() => {
      this.isAudioPlaying = true;
    }).catch(error => {
      console.error('Error playing audio:', error);
    });
  }

  init() {
    this.myEl = document.querySelector('#my-video');
    this.partnerEl = this.elRef.nativeElement.querySelector('#partner-video');

    if (this.myEl && this.partnerEl) {
      this.webRTC.init(this.myEl, this.partnerEl).then(
        () => {
          if (!this.answer) this.call();
        },
        () => this.cancel()
      );
      return true;
    }
    return false;
  }

  call() {
    this.pauseAudio();
    this.messengerService.sendMessage({ event: 'stop-audio' });
    this.playAudio("./../../../../../assets/audio/ringing.mp3");
    this.webRTC.callPartner(this.partner.id);
    this.socket.emit('calling', this.partner.id, this.user.fullName, this.user.id);
    this.waitForAnswer();
  }
  waitForAnswer() {
    const timer = setInterval(() => {
      if (this.partnerEl && this.partnerEl.srcObject) {
        this.pauseAudio();
        this.messengerService.sendMessage({ event: 'stop-audio' });
        this.answered = true;
        this.countVideoCalls();
        this.swapVideo('my-video');
        clearInterval(timer);
      }
    }, 10);
  }

  getVideoCalls() {
    return this.nativeStorage.getItem('videoCalls').then(
      calls => {
        return calls;
      },
      err => {
        return [];
      }
    );
  }

  countVideoCalls() {
    this.getVideoCalls().then(calls => {
      calls = calls.filter(call => new Date().getTime() - call.date < 24 * 60 * 60 * 1000);
      calls.push({
        id: this.user.id,
        date: new Date().getTime()
      });
      this.nativeStorage.setItem('videoCalls', calls);
    });
  }

  swapVideo(topVideo: string) {
    this.topVideoFrame = topVideo;
  }

  cancelListener() {
    this.socket.on('video-canceled', () => {
      if (this.audio) this.audio.muted = false;
      this.messengerService.sendMessage({ event: 'stop-audio' });
      this.playAudio("./../../../../../assets/audio/call-canceled.mp3");
      setTimeout(() => {
        this.cancel();  // Removed manualClose to prevent automatic call closing
      }, 2000);
    });
  }

  closeCall() {
    this.socket.emit('cancel-video', this.partner.id);
    this.cancel(true); // Pass true to indicate that this is a manual close
  }

  cancel(manualClose = false) {
    if (manualClose) {
      // Manual call closure
      this.pauseAudio();
      this.messengerService.sendMessage({ event: 'stop-audio' });
      if (this.webRTC) {
        this.webRTC.close();
      }
    } else {
      // Automatic call closure
      this.location.back();
      this.messengerService.sendMessage({ event: 'stop-audio' });
      this.pauseAudio();
      if (this.webRTC) {
        this.webRTC.close();
      }
    }
  }

  answerCall() {
    this.pauseAudio();
    this.messengerService.sendMessage({ event: 'stop-audio' });
    this.webRTC.answer();
    this.waitForAnswer();
  }


  toggleCamera() {
    this.cameraEnabled = this.webRTC.toggleCamera();
  }

  toggleAudio() {
    this.audioEnabled = this.webRTC.toggleAudio();
  }

  toggleCameraDirection() {
    this.webRTC.toggleCameraDirection();
  }

  ionViewWillLeave() {
    if (this.audio) {
      this.audio.pause();
    }
    this.messengerService.sendMessage({ event: 'stop-audio' });
  }

  isCordovaAvailable(): boolean {
    return !!(window.cordova && window.cordova.platformId !== 'browser');
  }
}

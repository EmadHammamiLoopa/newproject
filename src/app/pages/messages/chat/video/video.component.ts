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
import { JwtHelperService } from '@auth0/angular-jwt';

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
  authUser: User; // ✅ The logged-in user
  partnerUser: User; // ✅ The recipient user (partner in the call)
  userId: string; // ID of the recipient
  myEl: HTMLMediaElement;
  partnerEl: HTMLMediaElement;
  partner: User = new User();
  user: User = new User();
  answer = false;
  answered = false;
  socket: Socket | null = null; // Use the Socket type from socket.io-client
  audio: HTMLAudioElement;
  audioEnabled = true;
  cameraEnabled = true;
  localStream: MediaStream | null = null;
  jwtHelper = new JwtHelperService();

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
    console.log('📞 Initializing Video Call Component...');
    this.getAuthUser();

    this.route.queryParamMap.subscribe((query) => {
        this.answer = query.get('answer') ? true : false;

        if (!this.answer) { // ✅ If the user is the caller, start call automatically
            console.log("📞 Caller detected. Starting the call...");
            setTimeout(() => this.call(), 1000); // Wait a bit to ensure WebRTC is ready
        }
    });
}


async ionViewWillEnter() {
  try {
      this.pageLoading = true;
      await this.getUserId(); // Ensure this is awaited
      await this.getUser(); // Ensure this is awaited

      console.log("📹 Initializing WebRTC...");
      this.myEl = document.querySelector('#my-video');
      this.partnerEl = document.querySelector('#partner-video');

      if (!this.myEl || !this.partnerEl) {
          console.error("❌ Video elements not found.");
          return;
      }

      console.log(`✅ partnerEl: ${this.partnerEl}, Partner's Peer ID: ${this.partner.id}`);

      await this.webRTC.init(this.myEl, this.partnerEl);
      console.log("✅ WebRTC initialized successfully.");

      if (this.answer) {
          console.log("📲 Receiver detected. Waiting for calls...");
          this.webRTC.wait();
      } else {
          console.log("📞 Caller detected. Starting call...");
          this.call();
      }
  } catch (error) {
      console.error("❌ Error initializing WebRTC:", error);
  } finally {
      this.pageLoading = false;
  }
}




getUserId() {
  this.route.paramMap.subscribe((params) => {
      this.userId = params.get('id');
      console.log("🟢 Retrieved Parternrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr User ID:", this.userId);
      
      this.route.queryParamMap.subscribe((query) => {
          this.answer = query.get('answer') ? true : false;
          console.log("🟢 Answer Mode:", this.answer);
          
          this.getUser();
      });
  });
}


getUser() {
  console.log('Fetching partner profile for ID:', this.userId);
  this.userService.getUserProfile(this.userId).subscribe(
    async (resp: any) => {
      this.pageLoading = false;
      console.log('Partner profile response:', resp);

      const userData = resp.data || resp;

      if (userData) {
        try {
          console.log('Raw userData:', userData);
          this.partner = userData instanceof User ? userData : new User().initialize(userData);
          console.log('Partner initialized successfully:', this.partner);
        } catch (error) {
          console.error('Error initializing partner user:', error);
          this.handleUserInitError();
        }
      } else {
        console.error('Invalid response data: userData is null or undefined');
        this.handleUserInitError();
      }
    },
    (err) => {
      console.error('Error fetching partner profile:', err);
      this.pageLoading = false;
      this.location.back();
      this.toastService.presentStdToastr('Cannot make this call, try again later');
    }
  );
}


getAuthUser() {
  console.log('🔍 Starting authentication process...');
  
  const getToken = async (): Promise<string | null> => {
    console.log('🔑 Attempting to retrieve token...');
    if (this.isCordovaAvailable()) {
      console.log('📱 Cordova platform detected - using NativeStorage');
      try {
        const token = await this.nativeStorage.getItem('token');
        console.log('✅ Token retrieved from NativeStorage');
        return token;
      } catch (err) {
        console.warn("⚠️ Failed to retrieve token from NativeStorage:", err);
        return null;
      }
    } else {
      console.log('🖥️ Web platform detected - using localStorage');
      const token = localStorage.getItem('token');
      console.log(token ? '✅ Token retrieved from localStorage' : '❌ No token in localStorage');
      return token;
    }
  };

  getToken().then((token) => {
    if (!token) {
      console.error("❌ No token found in storage");
      this.router.navigate(['/auth/signin']);
      return;
    }

    console.log('🔍 Token found, decoding...');
    try {
      const decoded = this.jwtHelper.decodeToken(token);
      console.log('🔍 Decoded token content:', {
        idPresent: !!decoded?._id,
        firstNamePresent: !!decoded?.firstName,
        lastNamePresent: !!decoded?.lastName,
        avatarPresent: !!decoded?.mainAvatar
      });

      if (!decoded?._id) {
        console.error("❌ Invalid token structure - missing _id");
        this.router.navigate(['/auth/signin']);
        return;
      }

      // ONLY use the decoded token data
      this.authUser = new User().initialize({
        _id: decoded._id,
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
        mainAvatar: decoded.mainAvatar || ''
      });
      
      console.log("🔐 Successfully initialized authenticated user:", {
        id: this.authUser._id,
        name: `${this.authUser.firstName} ${this.authUser.lastName}`,
        hasAvatar: !!this.authUser.mainAvatar
      });
    } catch (error) {
      console.error("❌ Token decoding failed with error:", error);
      this.router.navigate(['/auth/signin']);
    }
  });
}

  handleUserInitError() {
    this.pageLoading = false;
    this.toastService.presentStdToastr('User not found, please log in again');
    this.router.navigate(['/auth/signin']);
  }

  pauseAudio() {
    if (this.audio && this.isAudioPlaying) {
      this.audio.pause();
      this.isAudioPlaying = false;
    }
  }

  async initializeSocket(userId: string) {
    try {
        if (this.socket) {
            console.warn("⚠️ WebSocket already initialized. Checking connection...");
            if (this.socket.connected) {
                console.log("✅ WebSocket is already connected.");
                return;
            } else {
                console.warn("🔄 WebSocket was disconnected. Attempting to reconnect...");
                this.socket.disconnect(); // Ensure cleanup before reconnecting
            }
        }

        console.log("🔵 Initializing WebSocket for userId:", userId);
        await SocketService.initializeSocket(userId);

        // ✅ Retry WebSocket retrieval to ensure it's available
        let attempts = 0;
        while (!this.socket && attempts < 3) {
            this.socket = await SocketService.getSocket();
            if (!this.socket) {
                console.warn(`⚠️ WebSocket still not available. Retrying (${attempts + 1}/3)...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 sec before retrying
            }
            attempts++;
        }

        if (!this.socket) {
            console.error("❌ WebSocket initialization failed after multiple attempts.");
            return;
        }

        console.log("✅ WebSocket instance retrieved:", this.socket.id);
        this.listenForVideoCallEvents(); // Ensure event listeners are set up

    } catch (error) {
        console.error("❌ WebSocket initialization failed:", error);
    }
}

  
listenForVideoCallEvents() {
  if (!this.socket) {
      console.error("❌ WebSocket not initialized. Cannot listen for video call events.");
      return;
  }

  // Prevent multiple listeners
  this.socket.off('video-call-started');
  this.socket.off('video-canceled');
  this.socket.off('video-call-ended');
  this.socket.off('video-call-failed');

  this.socket.on('video-call-started', (data) => {
      console.log("📞 Video call started:", data);
      this.playAudio('./../../../../../assets/audio/calling.mp3');
      if (this.answer) { // If user is answering a call
        this.answerCall();
    }
  });

  this.socket.on('video-canceled', () => {
      console.log("🚫 Video call canceled by other user.");
      this.pauseAudio();
      this.cancel(); // Close call UI
  });

  this.socket.on('video-call-ended', () => {
      console.log("📴 Video call ended.");
      this.pauseAudio();
      this.closeCall(); // Ensure call is properly closed
    });

  this.socket.on('video-call-failed', (error) => {
      console.error("❌ Video call error:", error);
      this.toastService.presentStdToastr("Call failed. Please try again.");
      this.cancel();
  });

  // ✅ Handle unexpected disconnections
  this.socket.on("disconnect", () => {
      console.warn("⚠️ WebSocket disconnected. Attempting auto-reconnect...");
      setTimeout(() => this.initializeSocket(this.userId), 2000);
  });
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

  this.audio.oncanplaythrough = () => {
      this.audio.play()
          .then(() => {
              this.isAudioPlaying = true;
              console.log("🎵 Playing audio:", src);
          })
          .catch(error => {
              console.error('❌ Audio play error:', error);
              console.warn("⚠️ Some browsers block autoplay. Ensure user interaction occurs first.");
          });
  };
}



  async init(myVideoEl: HTMLVideoElement, partnerVideoEl: HTMLVideoElement): Promise<void> {
    try {
        // ✅ Request user media (camera + mic)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        if (!stream) {
            throw new Error("❌ Failed to get media stream.");
        }

        // ✅ Assign local stream to video element
        myVideoEl.srcObject = stream;

        // ✅ Store the stream for later use
        this.localStream = stream;

        console.log("✅ Local video stream initialized.");

    } catch (err) {
        console.error("❌ Error initializing video:", err);
    }
}

async emitWebSocketEvent(eventName: string, data: any) {
  if (!this.socket) {
      console.warn("⚠️ WebSocket is not ready. Trying to retrieve...");
      this.socket = await SocketService.getSocket();

      if (!this.socket) {
          console.error("❌ WebSocket is still not available. Aborting event emit.");
          return;
      }
  }

  if (!this.socket.connected) {
      console.warn("⚠️ WebSocket is disconnected. Attempting to reconnect...");
      await this.initializeSocket(this.userId);
  }

  console.log(`📤 Emitting event: ${eventName}`, data);
  this.socket.emit(eventName, data);
  
}

async call() {
  console.log("📞 Initiating video call...");

  const callerId = this.authUser._id;
  const receiverId = this.userId;

  if (!callerId || !receiverId) {
    console.error("❌ Missing IDs - Caller:", callerId, "Receiver:", receiverId);
    return;
  }

  try {
    const myPeerId = this.webRTC.getPeerId();
    if (!myPeerId) {
      console.error("❌ My Peer ID is not initialized.");
      return;
    }

    // ✅ Step 1: Get partner's peerId from backend
    const partnerPeerId = await this.userService.getPartnerPeerId(receiverId).toPromise();

    if (!partnerPeerId || partnerPeerId === myPeerId) {
      console.warn("⚠️ Partner Peer ID is invalid or same as mine.");
      return;
    }

    // ✅ Step 2: Initiate call
    console.log(`📞 Calling partner with Peer ID: ${partnerPeerId}`);
    await this.webRTC.callPartner(partnerPeerId);
    this.calling = true;
    await this.emitWebSocketEvent('video-call-started', {
      from: this.authUser._id,
      to: this.userId
    });
    
  } catch (error) {
    console.error("❌ Call failed:", error);
    this.toastService.presentStdToastr('Call initialization failed');
    this.closeCall();
  }
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
      (calls) => {
        return calls;
      },
      (err) => {
        return [];
      }
    );
  }

  countVideoCalls() {
    this.getVideoCalls().then((calls) => {
        calls = Array.isArray(calls) ? calls : []; // ✅ Ensure it's an array
        calls = calls.filter((call) => new Date().getTime() - call.date < 24 * 60 * 60 * 1000);
        
        calls.push({
          id: this.authUser._id, // Changed from this.user.id
          date: new Date().getTime(),
        });

        this.nativeStorage.setItem('videoCalls', calls);
    });
}


  swapVideo(topVideo: string) {
    this.topVideoFrame = topVideo;
  }

  cancelListener() {
    if (this.socket) {
      this.socket.on('video-canceled', () => {
        if (this.audio) this.audio.muted = false;
        this.messengerService.sendMessage({ event: 'stop-audio' });
        this.playAudio('./../../../../../assets/audio/call-canceled.mp3');
        setTimeout(() => {
          this.cancel(); // Removed manualClose to prevent automatic call closing
        }, 2000);
      });
    }
  }

  closeCall() {
    console.log("📴 Closing the call...");

    if (this.socket) {
        this.emitWebSocketEvent('cancel-video', this.partner.id);
    }

    this.cancel(true); // ✅ Pass `true` to indicate manual close

    // ✅ Clear stored partner ID
    localStorage.removeItem('partnerId');

    setTimeout(() => {
        console.log("🔄 Redirecting user to previous page...");
        this.router.navigate(['/auth/home']);
    }, 1000);
}



  cancel(manualClose = false) {
    console.log("❌ Cancelling call...");

    this.pauseAudio();
    this.messengerService.sendMessage({ event: 'stop-audio' });

    // ✅ Ensure WebRTC stream is stopped and video elements are reset
    if (this.webRTC && this.webRTC.myStream) {
        console.log("✅ Closing WebRTC stream...");
        this.webRTC.myStream.getTracks().forEach(track => track.stop());
        this.webRTC.myStream = null;
    }

    // ✅ Reset video elements
    if (this.myEl) {
        this.myEl.srcObject = null;
    }
    if (this.partnerEl) {
        this.partnerEl.srcObject = null;
    }

    // ✅ Ensure WebSocket is disconnected
    if (this.socket) {
        console.log("✅ Disconnecting from WebSocket...");
        this.emitWebSocketEvent('video-call-ended', { from: this.authUser._id, to: this.userId });
        this.socket.disconnect();
        this.socket = null;
    }

    if (manualClose) {
        console.log("✅ Manual call closure.");
        return;
    }

    console.log("🔄 Navigating back to previous page...");
    this.location.back();
}


  

answerCall() {
  this.pauseAudio();
  this.messengerService.sendMessage({ event: 'stop-audio' });

  if (WebrtcService.call) {
    this.webRTC.answer(WebrtcService.call);
  } else {
    console.warn("⚠️ No active call found. Will retry shortly...");
    setTimeout(() => {
      if (WebrtcService.call) {
        this.webRTC.answer(WebrtcService.call);
      } else {
        console.error("❌ Still no call available to answer.");
      }
    }, 1000);
  }  

  this.countVideoCalls(); // ✅ Track answered calls
  this.waitForAnswer();
}


  toggleAudio() {
    if (!this.webRTC.myStream) {
      console.error("❌ Cannot toggle audio: Media stream is not initialized.");
      return;
    }
    this.audioEnabled = this.webRTC.toggleAudio();
  }
  
  toggleCamera() {
    if (!this.webRTC.myStream) {
      console.error("❌ Cannot toggle camera: Media stream is not initialized.");
      return;
    }
    this.cameraEnabled = this.webRTC.toggleCamera();
  }
  

  toggleCameraDirection() {
    this.webRTC.toggleCameraDirection();
  }

  ionViewWillLeave() {
    console.log("🔄 Cleaning up before leaving the video call page...");

    if (this.audio) {
        this.audio.pause();
    }
    this.messengerService.sendMessage({ event: 'stop-audio' });

    if (this.webRTC && this.webRTC.myStream) {
        console.log("✅ Stopping WebRTC stream...");
        this.webRTC.myStream.getTracks().forEach(track => track.stop());
        this.webRTC.myStream = null;
    }

    if (this.myEl) {
        this.myEl.srcObject = null;
    }
    if (this.partnerEl) {
        this.partnerEl.srcObject = null;
    }

    if (this.socket) {
        console.log("✅ Disconnecting WebSocket...");
        this.socket.emit('disconnect-user');
        this.socket.disconnect();
        this.socket = null;
    }
}


  
  
  isCordovaAvailable(): boolean {
    return !!(window.cordova && window.cordova.platformId !== 'browser');
  }
}
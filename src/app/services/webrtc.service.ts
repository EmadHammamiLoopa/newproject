import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { Injectable } from '@angular/core';
import Peer, { MediaConnection, PeerJSOption } from 'peerjs';
import { PermissionService } from './permission.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { UserService } from './user.service';
import { ToastService } from './toast.service';
import { User } from '../models/User';

@Injectable({
  providedIn: 'root'
})

export class WebrtcService {
  static peer: Peer;
  myStream: MediaStream;
  myEl: HTMLMediaElement;
  partnerEl: HTMLMediaElement;
  missedCalls$ = new BehaviorSubject([]);
  user: User = new User(); // ✅ Added `user` property here

  userId: string;
partnerId: string;
myPeerId: string;

  stun = 'stun.l.google.com:19302';
  mediaConnection: MediaConnection;
  options: PeerJSOption;
  stunServer: RTCIceServer = {
    urls: 'stun:' + this.stun,
  };
  static call;
  facingMode = "user";

  constructor(private androidPermission: AndroidPermissions, private permissionService: PermissionService,
              private router: Router,     private userService: UserService,private toastService: ToastService          ) {
    this.options = {
      key: 'cd1ft79ro8g833di',
      debug: 3
    };
  }

  getMedia(facingMode: string) {
    return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode
        },
        audio: true
    })
    .then((stream) => {
      this.handleSuccess(stream);
      return true
    }, err => {
      this.handleError(err);
      return false
    })
  }

  async init(myEl: HTMLMediaElement, partnerEl: HTMLMediaElement): Promise<boolean> {
    try {
      if (!myEl || !partnerEl) {
        console.error("❌ Cannot initialize WebRTC: one or both video elements are undefined.");
        return false;
      }
  
      // ✅ Store the elements before any stream assignment
      this.myEl = myEl;
      this.partnerEl = partnerEl;
  
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.error("❌ Cannot proceed: Permissions not granted.");
        return false;
      }
  
      this.myStream = await this.getUserMedia();
      if (!this.myStream) {
        console.error("❌ Failed to initialize media stream.");
        return false;
      }
  
      console.log("✅ WebRTC initialized successfully.");
      return true;
  
    } catch (error) {
      console.error("❌ Error initializing WebRTC:", error);
      return false;
    }
  }
  
  getPeerId(): string {
    return this.myPeerId;
  }
  

  async createPeer(authUserId: string, partnerId?: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.userId = authUserId;
      this.partnerId = partnerId;
  
      console.log(`🔵 Creating PeerJS connection for user: ${authUserId}`);
  
      const myPeerId = `${authUserId}-${Math.random().toString(36).substr(2, 5)}`;
      this.myPeerId = myPeerId;
  
      WebrtcService.peer = new Peer(myPeerId, {
        host: 'peerjs-whei.onrender.com',
        secure: true,
        port: 443,
        path: '/peerjs',
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      });
  
      WebrtcService.peer.on('open', async (id) => {
        console.log(`✅ PeerJS connected with ID: ${id}`);
        localStorage.setItem('myPeerId', id);
  
        try {
          await this.userService.sendPeerIdToBackend(authUserId, id);
          console.log(`📤 Sent Peer ID to backend`);
          resolve();
        } catch (err) {
          console.error("❌ Failed to send Peer ID to backend:", err);
          reject(err);
        }
      });
  
      WebrtcService.peer.on('error', (err) => {
        console.error('❌ PeerJS Error:', err);
        reject(err);
      });
    });
  }
  




  
  async getPartnerUser(partnerId: string): Promise<User | null> {
    try {
      const user = await this.userService.getUserProfile(partnerId).toPromise();
      console.log("userService.getUserProfile(userService.getUserProfile(userService.getUserProfile(userService.getUserProfile(", user);

      return user || null; // Return the user object or null if undefined
    } catch (error) {
      console.error("❌ Error fetching partner user:", error);
      return null;
    }
  }

  async callPartner(partnerPeerId: string) {
    console.log(`📞 Attempting to call partner with Peer ID: ${partnerPeerId}`);

    if (!partnerPeerId) {
        console.error("❌ Partner's Peer ID is missing. Cannot call.");
        this.toastService.presentStdToastr("User is offline or unavailable.");
        return;
    }

    WebrtcService.call = WebrtcService.peer.call(partnerPeerId, this.myStream);

    if (!WebrtcService.call) {
        console.error("❌ WebRTC Call object is undefined.");
        return;
    }

    WebrtcService.call.on("stream", (stream) => {
        if (this.partnerEl) {
            this.partnerEl.srcObject = stream;
            console.log("✅ Remote stream received.");
        } else {
            console.error("❌ Partner video element is undefined.");
        }
    });

    console.log("✅ Call initiated successfully.");
}


  


async getUserMedia(): Promise<MediaStream | null> {
  try {
    console.log("🎥 Requesting user media...");

    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some(device => device.kind === "videoinput");
    const hasMic = devices.some(device => device.kind === "audioinput");

    if (!hasCamera) {
      console.warn("⚠️ No camera detected.");
      return null;
    }
    if (!hasMic) {
      console.warn("⚠️ No microphone detected.");
      return null;
    }

    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true
    });

    this.handleSuccess(stream);
    console.log("✅ Media stream initialized successfully.");
    return stream;
  } catch (error) {
    this.handleError(error);
    console.error("❌ Error getting user media:", error);
    return null;
  }
}




// Store missed call when recipient is offline
handleMissedCall(partnerId: string) {
  console.warn(`⚠️ Missed call detected for ${partnerId}`);
  
  // Store in local storage or database
  let missedCalls = JSON.parse(localStorage.getItem("missedCalls") || "[]");
  missedCalls.push({
      callerId: this.userId,
      receiverId: partnerId,
      timestamp: new Date().toISOString()
  });
  localStorage.setItem("missedCalls", JSON.stringify(missedCalls));
}


notifyMissedCalls() {
  const missedCalls = JSON.parse(localStorage.getItem('missedCalls')) || [];
  if (missedCalls.length > 0) {
      alert(`📞 You have ${missedCalls.length} missed call(s)!`);
      localStorage.removeItem('missedCalls'); // Clear after notifying
  }
}


async requestPermissions() {
  try {
    await this.permissionService.getPermission(this.androidPermission.PERMISSION.CAMERA);
    await this.permissionService.getPermission(this.androidPermission.PERMISSION.RECORD_AUDIO);
    await this.permissionService.getPermission(this.androidPermission.PERMISSION.MODIFY_AUDIO_SETTINGS);
  } catch (err) {
    console.error("❌ Permission error:", err);
    return false;
  }
  return true;
}


storeMissedCall(userId: string) {
  let missedCalls = JSON.parse(localStorage.getItem("missedCalls") || "[]");

  if (!missedCalls.some(call => call.userId === userId)) {
    missedCalls.push({ userId, timestamp: new Date().toISOString() });
    localStorage.setItem("missedCalls", JSON.stringify(missedCalls));

    // ✅ Update UI dynamically
    this.missedCalls$.next(missedCalls);
    console.log(`🔔 Missed call stored from user: ${userId}`);
  }
}



wait() {
  console.log("📡 Waiting for incoming calls...");

  WebrtcService.peer.on("call", async (call) => {
    console.log("📞 Incoming call detected from:", call.peer);

    // 👉 Ensure media stream is ready before answering
    if (!this.myStream) {
      console.log("🎥 Media stream not ready. Attempting to getUserMedia...");
      this.myStream = await this.getUserMedia();

      if (!this.myStream) {
        console.error("❌ Cannot answer: No media stream available.");
        return;
      }

      this.myEl.srcObject = this.myStream;
    }

    call.answer(this.myStream); // ✅ Answer with stream
    WebrtcService.call = call;

    call.on("stream", (remoteStream) => {
      console.log("✅ Remote stream received.");
      if (this.partnerEl) {
        this.partnerEl.srcObject = remoteStream;
      }
    });

    call.on("error", (err) => {
      console.error("❌ Call error:", err);
    });
  });
}



// ✅ Function to check if the peer is online
async checkPeerOnline(peerId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const conn = WebrtcService.peer.connect(peerId);
    conn.on("open", () => {
      console.log(`✅ Peer ${peerId} is online`);
      resolve(true);
      conn.close();
    });
    conn.on("error", () => {
      console.warn(`⚠️ Peer ${peerId} is offline`);
      resolve(false);
    });
  });
}





handleSuccess(stream: MediaStream) {
  this.myStream = stream;

  if (!this.myEl) {
    console.warn("⚠️ myEl is undefined during handleSuccess(). Will not assign stream to video element yet.");
    return;
  }

  this.myEl.srcObject = stream;
  console.log("✅ Local stream assigned to myEl");
}



  handleError(error: any) {
    if (error.name === 'ConstraintNotSatisfiedError') {
      this.errorMsg(`The resolution px is not supported by your device.`);
    } else if (error.name === 'PermissionDeniedError') {
      this.errorMsg('Permissions have not been granted to use your camera and ' +
        'microphone, you need to allow the page access to your devices in ' +
        'order for the demo to work.');
    }
    this.errorMsg(`getUserMedia error: ${error.name}`, error);
  }

  errorMsg(msg: string, error?: any) {
    const errorElement = document.querySelector('#errorMsg');
    if (errorElement) {
      errorElement.innerHTML += `<p>${msg}</p>`;
    }
    
    if (typeof error !== 'undefined') {
      console.error(error);
    }
  }

  answer(call?: MediaConnection) {
    if (!this.myStream) {
        console.error("❌ Cannot answer: No media stream available.");
        return;
    }

    // If no call object is passed, use the static stored call
    if (!call) {
        call = WebrtcService.call;
    }

    if (!call) {
        console.error("❌ No incoming call to answer.");
        return;
    }

    console.log("📞 Answering call from:", call.peer);
    call.answer(this.myStream); // ✅ Answer with our media stream

    call.on('stream', (remoteStream) => {
        console.log("✅ Remote stream received.");
        this.partnerEl.srcObject = remoteStream;
    });

    call.on('error', (err) => {
        console.error("❌ Call error:", err);
    });

    WebrtcService.call = call; // ✅ Store the active call instance
}



  close() {
    if (WebrtcService.call) {
      WebrtcService.call.close();
      WebrtcService.call = null;
    }
    if (this.myStream) {
      this.myStream.getTracks().forEach(track => track.stop());
    }
    if (WebrtcService.peer) {
      WebrtcService.peer.destroy();
    }
    this.router.navigate(['/tabs/new-friends']);

  }

  toggleCamera() {
    this.myStream.getVideoTracks()[0].enabled = !this.myStream.getVideoTracks()[0].enabled;
    return this.myStream.getVideoTracks()[0].enabled;
  }

  toggleAudio() {
    this.myStream.getAudioTracks()[0].enabled = !this.myStream.getAudioTracks()[0].enabled;
    return this.myStream.getAudioTracks()[0].enabled;
  }

  toggleCameraDirection() {
    this.facingMode = this.facingMode == 'user' ? 'environment' : 'user';
    this.getMedia(this.facingMode);
  }
}

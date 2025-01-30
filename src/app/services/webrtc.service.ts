import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { Injectable } from '@angular/core';
import Peer, { MediaConnection, PeerJSOption } from 'peerjs';
import { PermissionService } from './permission.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class WebrtcService {
  static peer: Peer;
  myStream: MediaStream;
  myEl: HTMLMediaElement;
  partnerEl: HTMLMediaElement;

  userId: string;
  partnerId: String;

  stun = 'stun.l.google.com:19302';
  mediaConnection: MediaConnection;
  options: PeerJSOption;
  stunServer: RTCIceServer = {
    urls: 'stun:' + this.stun,
  };
  static call;
  facingMode = "user";

  constructor(private androidPermission: AndroidPermissions, private permissionService: PermissionService,
              private router: Router) {
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


  async init(myEl: HTMLMediaElement, partnerEl: HTMLMediaElement) {
    return new Promise((resolve, reject) => {
      this.permissionService.getPermission(this.androidPermission.PERMISSION.CAMERA).then(() => {
        this.permissionService.getPermission(this.androidPermission.PERMISSION.RECORD_AUDIO).then(() => {
          this.permissionService.getPermission(this.androidPermission.PERMISSION.MODIFY_AUDIO_SETTINGS).then(() => {
            this.myEl = myEl;
            this.partnerEl = partnerEl;
            try {
              this.getMedia('user').then(() => resolve(true), () => reject(true))
            } catch (e) {
              this.handleError(e);
              reject(true)
            }
          }, () => {
            reject(true)
          })
        }, () => {
          reject(true)
        })
      }, () => {
        reject(true)
      })
    })
  }

  async createPeer(userId: string) {
    this.userId = userId
    WebrtcService.peer = new Peer(userId);
    WebrtcService.peer.on('open', () => {
      this.wait();
    });
  }

  callPartner(partnerId: string) {
    WebrtcService.call = WebrtcService.peer.call(partnerId, this.myStream);

    WebrtcService.call.on('error', (error) => {
      console.log(error);
    })

    WebrtcService.call.on('stream', (stream) => {
      this.partnerEl.srcObject = stream;
    });
  }

  wait() {
    WebrtcService.peer.on('call', (call) => {
      WebrtcService.call = call;
      this.router.navigateByUrl('/messages/video/' + call.peer + '?answer=true');
    });
  }

  handleSuccess(stream: MediaStream) {
    this.myStream = stream;
    this.myEl.srcObject = stream;
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
    errorElement.innerHTML += `<p>${msg}</p>`;
    if (typeof error !== 'undefined') {
      console.error(error);
    }
  }

  answer() {
    WebrtcService.call.answer(this.myStream)
    WebrtcService.call.on('stream', (stream) => {
      this.partnerEl.srcObject = stream;
    });
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

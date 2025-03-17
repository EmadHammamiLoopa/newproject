import { Injectable } from '@angular/core';
import { FileEntry } from '@ionic-native/file/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';
import { Platform } from '@ionic/angular';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { PermissionService } from './permission.service';
import { MockCordovaService } from './mock-cordova.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UploadFileService {

  constructor(
    private filePath: FilePath,
    private platform: Platform,
    private camera: Camera,
    private permissionService: PermissionService,
    private androidPermission: AndroidPermissions,
    private mockCordovaService: MockCordovaService,
    private http: HttpClient
  ) {}

  takePicture(sourceType: number): Promise<string> {
    const destinationType = this.camera.DestinationType.NATIVE_URI;

    const options: CameraOptions = {
      quality: 75,
      destinationType,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      sourceType,
      targetWidth: 1024,
      targetHeight: 1024,
      allowEdit: false,
      saveToPhotoAlbum: false,
      correctOrientation: true,
    };

    return this.platform.ready().then(() => {
      if (!this.platform.is('cordova')) {
        return this.mockCordovaService.getPicture({ sourceType });
      }

      return new Promise((resolve, reject) => {
        this.permissionService.getPermission(sourceType === PictureSourceType.CAMERA ? this.androidPermission.PERMISSION.CAMERA : this.androidPermission.PERMISSION.READ_EXTERNAL_STORAGE)
          .then(() => {
            this.camera.getPicture(options)
              .then((imageData) => {
                if (this.platform.is('android') && sourceType === PictureSourceType.PHOTOLIBRARY) {
                  this.filePath.resolveNativePath(imageData)
                    .then(filePath => {
                      resolve(filePath);
                    }).catch(err => {
                      reject(err);
                    });
                } else {
                  resolve(imageData);
                }
              }).catch(err => {
                reject(err);
              });
          }).catch(err => {
            reject(err);
          });
      });
    });
  }

  getPicturesFromBrowser(): Promise<string[]> {
    return this.mockCordovaService.getMultiplePictures();
  }

  upload(file: File, userId: string): Observable<any> {
    const formData = new FormData();
    formData.append('avatars', file); // Ensure the field name matches the backend expectation

    return this.http.put(`https://newbackedn22.onrender.com/api/v1/user/${userId}/avatar`, formData);
  }
}

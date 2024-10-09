import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Camera } from '@ionic-native/camera/ngx';
import { UploadFileService } from './../../../services/upload-file.service';
import { ToastService } from './../../../services/toast.service';
import { ChannelService } from './../../../services/channel.service';
import { Router } from '@angular/router';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { Platform, ModalController } from '@ionic/angular'; // Import Platform and ModalController
import { TermsModalComponent } from './terms-modal.component'; // Adjust the path as needed

@Component({
  selector: 'app-channel-form',
  templateUrl: './channel-form.component.html',
  styleUrls: ['./channel-form.component.scss'],
})
export class ChannelFormComponent implements OnInit {

  termsAccepted = false;
  imageLoading = false;
  pageLoading = false;
  channelImage = {
    url: "",
    file: null,
    name: ''
  };
  validatorErrors = {};
  form: FormGroup;

  get name() {
    return this.form.get('name');
  }

  get description() {
    return this.form.get('description');
  }

  get category() {
    return this.form.get('category');
  }

  constructor(private camera: Camera, private formBuilder: FormBuilder, private uploadFile: UploadFileService,
              private toastService: ToastService, private webView: WebView, private channelService: ChannelService,
              private router: Router, private platform: Platform, private modalController: ModalController) { }

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.maxLength(255)]],
      category: ['', [Validators.required]], // Add category field
      termsAccepted: [false, Validators.requiredTrue] // Add termsAccepted field
    });
  }

  async presentTermsModal() {
    const modal = await this.modalController.create({
      component: TermsModalComponent
    });

    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.accepted) {
        this.termsAccepted = true;
        this.form.get('termsAccepted').setValue(true); // Update the form field
        this.form.updateValueAndValidity(); // Update form validation state
      } else {
        this.termsAccepted = false;
        this.form.get('termsAccepted').setValue(false); // Update the form field
        this.form.updateValueAndValidity(); // Update form validation state
      }
    });

    return await modal.present();
  }

  pickImage() {
    this.imageLoading = true;
    this.uploadFile.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY)
    .then(
      (resp: any) => {
        this.imageLoading = false;
        let imageUrl = resp.imageData;
        if (this.platform.is('cordova')) {
          imageUrl = this.webView.convertFileSrc(resp.imageData);
        }
        this.channelImage = {
          url: imageUrl,
          file: resp.file,
          name: resp.name
        };
      }
    )
    .catch(err => {
      this.imageLoading = false;
      this.toastService.presentStdToastr(err);
    });
  }

  getProductForm() {
    const form: FormData = new FormData();
    form.append('name', this.name.value);
    form.append('description', this.description.value);
    form.append('category', this.category.value); // Append category to form data
    form.append('photo', this.channelImage.file, this.channelImage.name);
    form.append('type', 'user'); // Append category to form data

    return form;
  }

  clearProductForm() {
    this.form.patchValue({
      name: '',
      description: '',
      category: '', // Clear category field
      termsAccepted: false // Reset termsAccepted field
    });
    this.channelImage = {
      url: "",
      file: null,
      name: ''
    };
    this.termsAccepted = false;
  }

  submit() {
    if (this.form.invalid) {
      this.toastService.presentStdToastr('Please complete the form correctly');
      return;
    }

    if (!this.channelImage.file) {
      this.toastService.presentStdToastr('Please select an image for your product');
      return;
    }

    this.validatorErrors = {};
    this.pageLoading = true;
    this.channelService.store(this.getProductForm())
    .then(
      (resp: any) => {
        this.pageLoading = false;
        this.toastService.presentStdToastr(resp.message);
        this.router.navigateByUrl('/tabs/channels');
        console.log(resp);
        this.clearProductForm();
      },
      err => {
        this.pageLoading = false;
        if (err.errors) {
          this.validatorErrors = err.errors;
        }
        if (typeof err === 'string') {
          this.toastService.presentStdToastr(err);
        }
        console.log(err);
      }
    );
  }
}

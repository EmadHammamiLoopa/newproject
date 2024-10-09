import { JobService } from './../../../../services/job.service';
import { Router } from '@angular/router';
import { ToastService } from './../../../../services/toast.service';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { UploadFileService } from './../../../../services/upload-file.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Camera } from '@ionic-native/camera/ngx';
import { Component, OnInit } from '@angular/core';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { ModalController, Platform } from '@ionic/angular';
import { ListSearchComponent } from 'src/app/pages/list-search/list-search.component';
import { AdMobFeeService } from './../../../../services/admobfree.service';
import { JsonService } from 'src/app/services/json.service';

@Component({
  selector: 'app-job-form',
  templateUrl: './job-form.component.html',
  styleUrls: ['./job-form.component.scss'],
})
export class JobFormComponent implements OnInit {

  countriesObject = {};
  countries: string[] = [];
  cities: string[] = [];
  selectedCountry: string;
  selectedCity: string;

  pageLoading = false;
  jobImage = {
    url: "",
    file: null,
    name: ''
  };
  validatorErrors = {};
  form: FormGroup;
  imageLoading = false;

  get title() {
    return this.form.get('title');
  }

  get company() {
    return this.form.get('company');
  }

  get email() {
    return this.form.get('email');
  }

  get description() {
    return this.form.get('description');
  }

  constructor(
    private camera: Camera,
    private formBuilder: FormBuilder,
    private uploadFile: UploadFileService,
    private nativeStorage: NativeStorage,
    private toastService: ToastService,
    private webView: WebView,
    private jobService: JobService,
    private router: Router,
    private modalController: ModalController,
    private adMobFeeService: AdMobFeeService,
    private platform: Platform,
    private jsonService: JsonService
  ) { }

  ngOnInit() {
    this.initializeForm();
    this.fetchCountriesAndCities(); // Fetch country and city data
  }

  ionViewWillEnter() {
    // Re-initialize form data if needed
  }

  initializeForm() {
    this.form = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.maxLength(255)]],
      company: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]]
    });

    this.platform.ready().then(() => {
      if (this.platform.is('cordova')) {
        this.nativeStorage.getItem('job-data').then(
          data => {
            this.form.patchValue(data);
          },
          error => {
            console.error('Error getting job data from NativeStorage', error);
          }
        );
      } else {
        console.warn('Cordova not available - using localStorage as fallback');
        const data = JSON.parse(localStorage.getItem('job-data'));
        if (data) {
          this.form.patchValue(data);
        }
      }
    });
  }

  fetchCountriesAndCities() {
    this.platform.ready().then(() => {
      if (this.platform.is('cordova')) {
        this.nativeStorage.getItem('countries').then(
          data => {
            this.processCountryData(JSON.parse(data));
          },
          error => {
            console.error('Error getting countries data from NativeStorage', error);
            this.fetchFromLocalStorage();
          }
        );
      } else {
        this.fetchFromLocalStorage();
      }
    });
  }

  fetchFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('countries'));
    if (data) {
      this.processCountryData(data);
    } else {
      this.fetchFromJsonService();
    }
  }

  async fetchFromJsonService() {
    try {
      const data = await this.jsonService.getCountries();
      this.processCountryData(data);
      this.nativeStorage.setItem('countries', JSON.stringify(data)).catch((error) => {
        console.warn('NativeStorage not available, using localStorage fallback', error);
        localStorage.setItem('countries', JSON.stringify(data));
      });
    } catch (err) {
      console.error('Failed to load countries from JsonService:', err);
      this.toastService.presentStdToastr('Error fetching countries and cities.');
    }
  }

  processCountryData(data) {
    if (Array.isArray(data)) {
      this.countries = data;
    } else {
      this.countriesObject = data;
      this.countries = Object.keys(this.countriesObject);
    }
  }

  saveData() {
    const formData = this.form.value;
    if (this.platform.is('cordova')) {
      this.nativeStorage.setItem('job-data', formData).then(
        () => console.log('Data saved to NativeStorage'),
        error => console.error('Error saving data to NativeStorage', error)
      );
    } else {
      console.warn('Cordova not available - using localStorage as fallback');
      localStorage.setItem('job-data', JSON.stringify(formData));
    }
  }

  pickImage() {
    this.imageLoading = true;
    console.log('Attempting to pick an image...');
    this.uploadFile.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY)
      .then(
        (resp: any) => {
          console.log('Image picked successfully', resp);
          this.imageLoading = false;
          let imageUrl = resp.imageData;
          if (this.platform.is('cordova') && this.webView && this.webView.convertFileSrc) {
            imageUrl = this.webView.convertFileSrc(resp.imageData);
          }
          this.jobImage = {
            url: imageUrl,
            file: resp.file,
            name: resp.name
          }
        },
        err => {
          console.error('Error picking image', err);
          this.imageLoading = false;
          this.toastService.presentStdToastr(err);
        }
      );
  }

  getJobForm() {
    const form: FormData = new FormData();
    form.append('title', this.title.value);
    form.append('company', this.company.value);
    form.append('email', this.email.value);
    form.append('country', this.selectedCountry);
    form.append('city', this.selectedCity);
    form.append('description', this.description.value);
    if (this.jobImage.file) {
      form.append('photo', this.jobImage.file, this.jobImage.name);
    }
    return form;
  }

  clearJobForm() {
    this.form.patchValue({
      title: '',
      description: '',
      company: '',
      email: ''
    });
    this.jobImage = {
      url: "",
      file: null,
      name: ''
    };
  }

  submit() {
    if (!this.jobImage.file) {
      this.toastService.presentStdToastr('Please select an image for the job');
      return;
    }
    this.validatorErrors = {};
    this.pageLoading = true;
    console.log('Submitting job form...');
    this.jobService.store(this.getJobForm())
      .then(
        resp => {
          this.pageLoading = false;
          console.log('Job created successfully', resp);
          this.toastService.presentStdToastr('Job created successfully');
          this.router.navigateByUrl('/tabs/small-business/jobs');
          // this.adMobFeeService.showInterstitialAd();
          this.clearJobForm();
        },
        err => {
          this.pageLoading = false;
          console.error('Error creating job', err);
          if (err.errors) {
            this.validatorErrors = err.errors;
          }
          if (typeof err === 'string') {
            this.toastService.presentStdToastr(err);
          }
        }
      );
  }

  async presentCountriesModal() {
    const result = await this.presentSearchListModal(this.countries, 'Countries');
    if (result) {
      this.selectedCountry = result;
      this.cities = this.countriesObject[this.selectedCountry];
    }
  }

  async presentCitiesModal() {
    const result = await this.presentSearchListModal(this.cities, 'Cities');
    if (result) {
      this.selectedCity = result;
    }
  }

  async presentSearchListModal(list: any, title: string) {
    const modal = await this.modalController.create({
      componentProps: {
        data: list,
        title
      },
      component: ListSearchComponent
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    return data; // Make sure data is directly returned
  }

  isFormValid(form: FormGroup) {
    return !form.valid || !this.selectedCountry || !this.selectedCity;
  }
}

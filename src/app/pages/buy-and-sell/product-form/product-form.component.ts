import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Camera } from '@ionic-native/camera/ngx';
import { Platform } from '@ionic/angular';
import { UploadFileService } from '../../../services/upload-file.service';
import { ToastService } from '../../../services/toast.service';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { Router, ActivatedRoute } from '@angular/router';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { ModalController } from '@ionic/angular';
import { AdMobFeeService } from '../../../services/admobfree.service';
import { ListSearchComponent } from '../../list-search/list-search.component';
import { ProductService } from 'src/app/services/product.service';
import { User } from 'src/app/models/User';
import { Product } from 'src/app/models/Product';
import { CategoryService } from './Categories.service';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
})
export class ProductFormComponent implements OnInit {

  pageLoading = false;
  productImages: { url: string, file: any, name: string }[] = [];
  validatorErrors = {};
  form: FormGroup;
  imageLoading = false;
  currencies = [];
  categories = [];
  selectedCurrency: string = '';
  user: User = new User();
  isEditMode = false;
  productId: string;

  constructor(
    private camera: Camera,
    private platform: Platform,
    private formBuilder: FormBuilder,
    private uploadFile: UploadFileService,
    private toastService: ToastService,
    private webView: WebView,
    private productService: ProductService,
    private router: Router,
    private nativeStorage: NativeStorage,
    private modalController: ModalController,
    private adMobFeeService: AdMobFeeService,
    private route: ActivatedRoute,
    private categoryService: CategoryService
  ) { }

  ngOnInit() {
    this.initializeForm();
    this.platform.ready().then(() => {
      if (this.platform.is('cordova')) {
        this.initializeCordova();
      }
      this.getUserData();
    });
  
    this.route.paramMap.subscribe(params => {
      console.log("paaaaaaaaaaaaaaa",params);
      this.productId = params.get('id');
      if (this.productId) {
        this.isEditMode = true;
        this.getProductDetails(this.productId);
      } else {
        this.initializeNewProduct();
      }
    });
  
    this.fetchCategories();
  }
  
  initializeNewProduct() {
    const newProduct = new Product();
    this.setFormValues(newProduct);
  }
  
  setFormValues(product: Product) {
    this.form.patchValue({
      label: product.label,
      description: product.description,
      price: product.price,
      currency: product.currency,
      category: product.category,
      stock: product.stock,
      brand: product.brand,
      condition: product.condition,
      weight: product.weight,
      dimensions: {
        length: product.dimensions.length,
        width: product.dimensions.width,
        height: product.dimensions.height
      },
      tags: product.tags.join(', ')
    });
  
    this.productImages = product.photos.map(photo => ({
      url: `http://127.0.0.1:3300/public${photo.path}`, // Add the full URL prefix
      file: new Blob(), // Set to a new Blob for now, will be updated with correct file when picking images
      name: photo.path.split('/').pop()
    }));
  
    this.selectedCurrency = product.currency;
  }
  

  get label() {
    return this.form.get('label');
  }
  
  get price() {
    return this.form.get('price');
  }
  
  get category() {
    return this.form.get('category');
  }
  
  get description() {
    return this.form.get('description');
  }

  
  
  initializeCordova() {
    // Any Cordova-specific initialization
  }

  initializeForm() {
    this.form = this.formBuilder.group({
      label: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.maxLength(255)]],
      price: ['', [Validators.required, Validators.maxLength(12)]],
      currency: ['', [Validators.required]],
      category: ['', [Validators.required]],
      stock: ['', [Validators.required, Validators.min(0)]],
      brand: [''],
      condition: [''],
      weight: [''],
      dimensions: this.formBuilder.group({
        length: [''],
        width: [''],
        height: ['']
      }),
      tags: ['']
    });

    this.nativeStorage.getItem('currencies').then(resp => {
      this.currencies = Object.keys(JSON.parse(resp));
    }).catch(err => {
      console.warn('NativeStorage not available, using fallback');
    });
  }

  getUserData() {
    this.nativeStorage.getItem('user').then(
      user => {
        console.log('Fetched user data from NativeStorage:', user);
        this.initializeUser(user);
      }
    ).catch(error => {
      console.warn('Error fetching user data from NativeStorage:', error);
      this.fetchUserFromLocalStorage();
    });
  }

  fetchUserFromLocalStorage() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      console.log('Fetched user data from localStorage:', user);
      this.initializeUser(user);
    } else {
      console.log('User data not found in localStorage');
    }
  }

  initializeUser(user: any) {
    this.user = new User().initialize(user);
    console.log('User initialized successfully:', this.user);
  }
  pickImages() {
    this.imageLoading = true;
    this.uploadFile.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY)
      .then(
        (resp: any) => {
          this.imageLoading = false;
          let imageUrl = resp.imageData;
          if (this.platform.is('cordova')) {
            imageUrl = this.webView.convertFileSrc(resp.imageData);
          }
          const imageFile = new Blob([resp.file], { type: resp.file.type });
          // Use file.name if resp.name is not available
          const imageName = resp.name || resp.file.name;
          this.productImages.push({
            url: imageUrl,
            file: imageFile,
            name: imageName
          });
        },
        err => {
          this.imageLoading = false;
          this.toastService.presentStdToastr(err);
        }
      );
  }
  
  

  removeImage(index: number) {
    this.productImages.splice(index, 1);
  }
  getProductForm() {
    const form: FormData = new FormData();
    form.append('label', this.form.get('label').value);
    form.append('price', this.form.get('price').value);
    form.append('currency', this.selectedCurrency);
    form.append('description', this.form.get('description').value);
    form.append('userId', this.user._id);
    form.append('category', this.form.get('category').value);
    form.append('stock', this.form.get('stock').value);
    form.append('brand', this.form.get('brand').value);
    form.append('condition', this.form.get('condition').value);
    form.append('weight', this.form.get('weight').value);
    form.append('country', this.user.country);
    form.append('city', this.user.city);
    
    // Append dimensions as individual fields
    const dimensions = this.form.get('dimensions').value;
    form.append('dimensions.length', dimensions.length);
    form.append('dimensions.width', dimensions.width);
    form.append('dimensions.height', dimensions.height);
  
    // Ensure tags are formatted as an array of strings
    const tagsArray = this.form.get('tags').value.split(',').map(tag => tag.trim());
    tagsArray.forEach((tag, index) => {
      form.append(`tags[${index}]`, tag);
    });
  
    // Append multiple images
    this.productImages.forEach((image, index) => {
      if (image.file) {
        form.append(`photos[${index}]`, image.file, image.name);
      }
    });
  
    return form;
  }
  
  

  clearProductForm() {
    this.form.reset();
    this.productImages = [];
    this.selectedCurrency = '';
  }

submit() {
  if (this.productImages.length === 0 && !this.isEditMode) {
    this.toastService.presentStdToastr('Please select images for your product');
    return;
  }
  if (!this.selectedCurrency) {
    this.toastService.presentStdToastr('Please select a currency for your product');
    return;
  }
  this.validatorErrors = {};
  this.pageLoading = true;

  const formData = this.getProductForm();
  
  // Log form data to verify
  formData.forEach((value, key) => {
    console.log(key, value);
  });

  if (this.isEditMode) {
    this.productService.update(this.productId, formData).then(
      (resp: any) => {
        this.pageLoading = false;
        this.toastService.presentStdToastr('Product updated successfully');
        this.router.navigateByUrl('/tabs/buy-and-sell/products/sell');
      },
      (err) => {
        this.pageLoading = false;
        if (err.error && err.error.errors) {
          this.validatorErrors = err.error.errors;
        } else {
          this.toastService.presentStdToastr('An error occurred');
        }
        console.log('Error response:', err);
      }
    );
  } else {
    this.productService.store(formData).then(
      (resp: any) => {
        this.pageLoading = false;
        this.toastService.presentStdToastr('Product created successfully');
        this.router.navigateByUrl('/tabs/buy-and-sell/products/sell');
        this.clearProductForm();
      },
      (err) => {
        this.pageLoading = false;
        if (err.error && err.error.errors) {
          this.validatorErrors = err.error.errors;
        } else {
          this.toastService.presentStdToastr('An error occurred');
        }
        console.log('Error response:', err);
      }
    );
  }
}
  
  

  async presentCurrenciesModal() {
    const result = await this.presentSearchListModal(this.currencies, 'Currencies');
    if (result) {
      this.selectedCurrency = result;
      this.form.get('currency').setValue(result);
    }
  }

  async presentCategoriesModal() {
    const result = await this.presentSearchListModal(this.categories, 'Categories');
    if (result) {
      this.form.get('category').setValue(result);
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
    return data;
  }

  getProductDetails(productId: string) {
    this.productService.get(productId).then(
      (resp: any) => {
        const product = new Product().initialize(resp.data);
        this.setFormValues(product);
      },
      err => {
        console.error('Error fetching product details:', err);
        this.toastService.presentStdToastr('Error fetching product details.');
      }
    );
  }
  
  

  fetchCategories() {
    this.categoryService.getCategories().subscribe(
      (data: any) => {
        this.categories = data;
      },
      err => {
        console.error('Error fetching categories:', err);
        this.toastService.presentStdToastr('Error fetching categories.');
      }
    );
  }
}

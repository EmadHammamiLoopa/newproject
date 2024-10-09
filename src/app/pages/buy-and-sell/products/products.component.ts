import { IonInfiniteScroll } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from './../../../services/toast.service';
import { ProductService } from './../../../services/product.service';
import { Product } from './../../../models/Product';
import { Component, OnInit, ViewChild } from '@angular/core';
import constants from 'src/app/helpers/constants';
import { CategoryService } from '../product-form/Categories.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  @ViewChild('infinitScroll') infinitScroll: IonInfiniteScroll;

  pageLoading = false;
  products: Product[] = [];
  allProducts: Product[] = [];
  domain = constants.DOMAIN_URL;
  page: number = 0;
  searchQuery: string = '';
  type: string;
  categories: string[] = ['All'];
  selectedCategory: string = 'All';

  slideOpts = {
    slidesPerView: 3.5,  // Show more chips in one view
    spaceBetween: 0,     // No space between slides
    freeMode: true,      // Allow free scrolling
  };
  
  
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.fetchCategories();
    this.initializeProducts();
  }

  ionViewWillEnter() {
    this.pageLoading = true;
    this.searchQuery = "";
    this.page = 0;
    this.getPageType();
  }

  showProductForm() {
    this.pageLoading = true;
    this.productService.getStorePermession().then(
      (resp: any) => {
        if (resp.data.date) {
          this.router.navigate(['/tabs/subscription'], {
            queryParams: {
              lastDate: resp.data.date
            }
          });
        } else {
          this.router.navigateByUrl('/tabs/buy-and-sell/product/form');
        }
        this.pageLoading = false;
      },
      err => {
        console.log(err);
        this.pageLoading = false;
      }
    );
  }

  getPageType() {
    this.route.paramMap.subscribe(param => {
      this.type = param.get('type');
      this.page = 0;
      this.getProducts(null);
    });
  }

  search(val: string) {
    this.searchQuery = val;
    this.page = 0;
    this.getProducts(null);
  }

  handleResponse(event, refresh, resp: any) {
    if (!event || refresh) {
      this.products = [];
      this.allProducts = [];
    }

    resp.data.products.forEach(prd => {
      const product = new Product(prd);
      console.log('Product category:', product.category); // Log product category
      this.allProducts.push(product);
    });

    this.filterProductsByCategory();

    if (refresh) this.infinitScroll.disabled = false;

    if (event) {
      event.target.complete();
      if (!resp.data.more && !refresh) event.target.disabled = true;
    }

    this.pageLoading = false;
    console.log(this.products);
  }

  handleError(err) {
    console.log(err);
    this.pageLoading = false;
    this.toastService.presentStdToastr(err);
  }

  getProducts(event, refresh?) {
    if (refresh) this.page = 0;
    if (this.type === 'sell') {
      this.productService.posted(this.page++, this.searchQuery).then(
        resp => this.handleResponse(event, refresh, resp),
        err => this.handleError(err)
      );
    } else {
      this.productService.available(this.page++, this.searchQuery).then(
        resp => this.handleResponse(event, refresh, resp),
        err => this.handleError(err)
      );
    }
  }

  fetchCategories() {
    this.categoryService.getCategories().subscribe(
      (data: any) => {
        this.categories = ['All', ...data];
        console.log('Fetched categories:', this.categories); // Log fetched categories
      },
      err => {
        console.error('Error fetching categories:', err);
        this.toastService.presentStdToastr('Error fetching categories.');
      }
    );
  }

  initializeProducts() {
    this.products = [];
    this.allProducts = [];
    this.page = 0;
    this.getProducts(null);
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    console.log('Selected category:', this.selectedCategory); // Log selected category
    this.filterProductsByCategory();
  }

  filterProductsByCategory() {
    if (this.selectedCategory === 'All') {
      this.products = this.allProducts;
    } else {
      this.products = this.allProducts.filter(product => {
        console.log(`Product Category: ${product.category}, Selected Category: ${this.selectedCategory}`);
        return product.category === this.selectedCategory;
      });
    }
    console.log('Filtered products:', this.products);
  }
}

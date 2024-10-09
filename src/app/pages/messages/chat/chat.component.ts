import { Location } from '@angular/common';
import { ToastService } from './../../../services/toast.service';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { UploadFileService } from './../../../services/upload-file.service';
import { MessageService } from './../../../services/message.service';
import { User } from 'src/app/models/User';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from './../../../services/user.service';
import { Message } from './../../../models/Message';
import { Camera } from '@ionic-native/camera/ngx';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonInfiniteScroll, Platform, AlertController } from '@ionic/angular';
import { SocketService } from 'src/app/services/socket.service';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { ProductService } from 'src/app/services/product.service';
import { Product } from 'src/app/models/Product';
import { from } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {

  page = 0;
  resend = [];
  product: Product;
  productId: string;

  sentMessages = {};
  index = 0;

  image: string = null;
  imageFile: File = null;
  messageText = "";

  connected = false;
  @ViewChild('content') private content: IonContent;
  @ViewChild('infScroll') private infScroll: IonInfiniteScroll;

  messages: Message[] = [];
  socket: any;
  user: User;
  authUser: User;
  pageLoading = false;

  allowToChat = false;
  business = false;

  constructor(private camera: Camera, private userService: UserService, private route: ActivatedRoute,
              private messageService: MessageService, private changeDetection: ChangeDetectorRef,
              private platform: Platform, private uploadFileService: UploadFileService, private webView: WebView,
              private toastService: ToastService, private location: Location, private router: Router, private productService: ProductService, 
              private alertController: AlertController, private socketService: SocketService, private nativeStorage: NativeStorage) {
    this.socket = SocketService.socket; // Access static member correctly
  }

  ngOnInit() {
    console.log("ngOnInit called");
    this.getAuthUser();
  
    this.route.paramMap.subscribe(params => {
      const userId = params.get('id');
      if (userId) {
        console.log("User ID detected:", userId);
        this.getUserProfile(userId);
      }
    });
  
    this.route.queryParams.subscribe(queryParams => {
      const productId = queryParams['productId'];
      if (productId) {
        console.log("Product ID detected:", productId);
        this.productId = productId;
        this.getProductDetails(productId);
      }
    });
  }
  
  
  

  ionViewWillEnter() {
    console.log("ionViewWillEnter called");
    this.pageLoading = true;
    this.getUserId();
    if (this.authUser && this.authUser.id) {
      this.initializeSocket();
      this.route.paramMap.subscribe(params => {
        console.log("user params..................detected:", params);

        const userId = params.get('id');
        if (userId) {
          this.getUserProfile(userId);
        } else if (this.productId) {
          this.getProductDetails(this.productId);
        } else {
          this.pageLoading = false;
        }
      });
    }
  }
  
  

  getProductDetails(productId: string, event?) {
    if (!event) this.pageLoading = true;
    this.productService.get(productId).then(
      (resp: any) => {
        this.pageLoading = false;
        this.product = new Product().initialize(resp.data);
        if (event) event.target.complete();
      },
      err => {
        this.pageLoading = false;
        if (event) event.target.complete();
        this.toastService.presentStdToastr(err);
      }
    );
  }

  getAuthUser() {
    this.pageLoading = true;
    this.nativeStorage.getItem('user')
      .then(
        user => {
          if (user) {
            this.authUser = new User().initialize(user);
            console.log("Authenticated user data fetched and stored:", this.authUser);
            this.initializeSocket();
          } else {
            this.fallbackToLocalStorage();
          }
        },
        err => {
          this.fallbackToLocalStorage();
        }
      );
  }
  

  fallbackToLocalStorage() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        this.authUser = new User().initialize(user);
        this.initializeSocket();
        this.getUserId();
      } else {
        this.pageLoading = false;
      }
    } catch (err) {
      this.pageLoading = false;
    }
  }

  handleUserInitError() {
    this.pageLoading = false;
    this.router.navigate(['/login']);
  }

  getUserId() {
    if (this.authUser && this.authUser._id) {
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id && this.authUser._id !== id) {
          this.getUserProfile(id); // Fetch the recipient's profile (seller)
        } else {
          console.error('Recipient ID is the same as authenticated user ID or missing');
          this.handleUserInitError();
        }
      });
    } else {
      this.handleUserInitError();
    }
  }
  
  

  getUserProfile(userId: string) {
    if (!userId) {
      this.pageLoading = false;
      return;
    }
    console.log('Fetching profile for user ID:', userId);
    this.userService.getUserProfile(userId)
      .subscribe(
        (resp: any) => {
          if (resp && resp.data) {
            this.user = new User().initialize(resp.data);
            console.log("Recipient user data fetched and stored:", this.user);
            this.getMessages(null);
          } else if (resp) {
            this.user = new User().initialize(resp);
            console.log("Recipient user data fetched and stored:", this.user);
            this.getMessages(null);
          } else {
            this.pageLoading = false;
            console.error('User profile data is undefined or null');
            this.toastService.presentStdToastr('Sorry, this user is not available');
            this.location.back();
          }
        },
        err => {
          this.pageLoading = false;
          console.error('Error fetching user profile:', err);
          this.toastService.presentStdToastr('Sorry, this user is not available');
          this.location.back();
        }
      );
  }
  
  
  

  initializeSocket() {
    if (this.socket && this.authUser && this.authUser.id) {
      this.page = 0;
      this.socket.emit('connect-user', this.authUser.id);
      this.initSocketListeners();
    }
  }

  scrollToBottom() {
    this.content.scrollToPoint(0, 1000 * 1000);
  }

  getUser(id: string) {
    this.getUserProfile(id);
  }

  getMessages(event) {
    this.messageService.indexMessages(this.user?.id || this.productId, this.page++)
      .then(
        (resp: any) => {
          this.pageLoading = false;
          if (!event) {
            this.messages = [...resp.data.messages.map(message => new Message().initialize(message)), ...this.messages];
          } else {
            event.target.complete();
            this.messages = [...this.messages, ...resp.data.messages.map(message => new Message().initialize(message))];
          }
  
          if (!resp.data.more) {
            this.infScroll.disabled = true;
          }
  
          this.allowToChat = resp.data.allowToChat;
  
          // Use the productId from query parameters if available
          if (this.productId) {
            this.getProductDetails(this.productId);
          } else {
            this.messages.forEach(message => {
              if (this.isProductMessage(message)) {
                console.log('Product ID:', message.productId); // Log product ID
                if (message.product) {
                  // Initialize product details if already populated
                  this.product = new Product().initialize(message.product);
                } else {
                  // Fetch product details if not populated
                  this.getProductDetails(message.productId);
                }
              } else {
                const friendId = message.from === this.authUser.id ? message.to : message.from; // Determine the friend's ID
                console.log('Friend ID:', friendId); // Log friend ID
                this.getFriendInfo(friendId); // Use the determined friend's ID
              }
            });
          }
        },
        err => {
          this.pageLoading = false;
          this.toastService.presentStdToastr(err);
        }
      );
  }
  
  
  
  isProductMessage(message: Message): boolean {
    return message.type === 'product';
  }
  

  
  

  getFriendInfo(friendId: string) {
    this.userService.getUserProfile(friendId)
      .subscribe(
        (resp: any) => {
          // Process friend info here
          console.log('Friend info:', resp);
        },
        err => {
          this.toastService.presentStdToastr('Error fetching friend info');
        }
      );
  }

  checkMessageExisting(message) {
    return this.messages.find(msg => msg.id == message._id) ? true : false;
  }

  initSocketListeners() {
    if (this.socket) {
      this.socket.on('new-message', (message) => {
        if (this.user && message.from == this.user.id && !this.checkMessageExisting(message)) {
          this.messages.push(new Message().initialize(message));
          this.changeDetection.detectChanges();
          setTimeout(() => {
            this.scrollToBottom();
          }, 200);
        }
      });

      this.socket.on('message-sent', (message, ind) => {
        if (this.sentMessages[ind]) {
          this.sentMessages[ind].id = message._id;
          this.sentMessages[ind].state = 'sent';
          if (this.resend.includes(ind)) this.resend.splice(this.resend.indexOf(ind), 1);
        }

        this.sentMessages[ind] = undefined;
      });

      this.socket.on('message-not-sent', (ind) => {
        if (this.sentMessages[ind]) {
          this.sentMessages[ind].state = 'failed';
          if (this.resend.includes(ind)) this.resend.splice(this.resend.indexOf(ind), 1);
        }
      });
    }
  }

  resendMessage(message) {
    this.resend.push(message.id);
    this.sendMessage(message, message.id);
  }

  getChatPermission() {
    return new Promise((resolve, reject) => {
      this.messageService.getPermission(this.user.id)
        .then(
          (resp: any) => {
            if (resp.data) {
              resolve(true); // Permission granted
            } else {
              // Assuming the response includes details about how many chats have been used and the daily limit
              const usedChats = resp.data.usedChats || 0;
              const totalChats = resp.data.totalChats || 3; // Assuming 3 is the daily free chat limit
              this.showSubscriptionAlert(usedChats, totalChats); // Show the alert with details
              reject(false);
            }
          },
          err => {
            this.toastService.presentStdToastr(err);
            reject(false);
          }
        );
    });
}


async showSubscriptionAlert(usedChats: number, totalChats: number) {
  const remainingChats = totalChats - usedChats;
  const alert = await this.alertController.create({
    header: 'Free Chat Limit Reached',
    message: `You have used ${usedChats} out of ${totalChats} free chats for today. You can subscribe to continue chatting without limits.`,
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Subscribe Now',
        cssClass: 'text-danger',
        handler: () => {
          this.router.navigateByUrl('/tabs/subscription');
        }
      }
    ]
  });

  await alert.present();
}


  sendMessage(message, ind) {
    const payload = {
      from: message.from,
      to: message.to,
      text: message.text,
      state: 'sent',
      image: this.imageFile ? this.image : null,
      type: message.type, // Include type here
      productId: this.productId || null // Add productId if it's a product message
    };
  
    this.socket.emit('send-message', payload, this.imageFile, ind);
  }
  
  
  addMessage() {
    if (!this.messageText && !this.imageFile) return;

    if (!this.conversationStarted()) {
        this.messageText = "";
        return;
    }

    this.getChatPermission().then(
        () => {
            const message = new Message();
            message.id = this.index.toString();
            message.from = this.authUser.id;
            console.log("this.authUser.id:........................", this.authUser.id);
            message.to = this.user.id; // Ensure this is set correctly
            console.log("this.user.id:........................", this.user.id);

            message.text = this.messageText;
            message.state = '';
            message.createdAt = new Date();
            message.type = this.productId ? 'product' : 'friend'; // Set type appropriately
            if (this.productId) {
                message.productId = this.productId; // Include productId if available
            }
            if (this.image) {
                message.image = this.image;
            }

            this.messages.push(message);
            this.sentMessages[this.index] = message;

            setTimeout(() => {
                this.scrollToBottom();
            }, 200);

            this.sendMessage(message, this.index++);

            this.messageText = "";
            this.image = null;
            this.imageFile = null;
        },
        err => {
            if (err) this.router.navigate(['/tabs/subscription']);
        }
    );
}

  
  
  
  pickImage() {
    this.uploadFileService.takePicture(this.camera.PictureSourceType.CAMERA)
      .then(
        (resp: any) => {
          if (window.cordova && this.webView) {
            this.image = this.webView.convertFileSrc(resp.imageData);
          } else {
            this.image = resp.imageData;
          }
          this.imageFile = resp.file;
          this.addMessage();
        },
        err => {
        }
      );
  }

  allowToShowDate(ind: number): boolean {
    const currDate = {
      year: this.messages[ind].createdAt.toJSON().slice(0, 4),
      month: this.messages[ind].createdAt.toJSON().slice(5, 7),
      day: this.messages[ind].createdAt.toJSON().slice(8, 10)
    };
    if (ind) {
      const lastDate = {
        year: this.messages[ind].createdAt.toJSON().slice(0, 4),
        month: this.messages[ind].createdAt.toJSON().slice(5, 7),
        day: this.messages[ind].createdAt.toJSON().slice(8, 10)
      };

      return currDate.day != lastDate.day || currDate.month != lastDate.month
          || currDate.year != lastDate.year;
    }
    return true;
  }

  conversationStarted() {
    return (this.allowToChat || (this.messages && (this.messages.length <= 1 || this.messages.filter(msg => !msg.isMine(this.authUser.id)).length > 0)));
  }

  ProfileEnabled() {
    return this.allowToChat || (this.messages && (this.messages.filter(msg => !msg.isMine(this.authUser.id)).length > 0));
  }

  showUserProfile() {
    if (this.ProfileEnabled()) this.router.navigateByUrl('/tabs/profile/display/' + this.user.id);
    else this.lockedProfileAlert();
  }

  async lockedProfileAlert() {
    const alert = await this.alertController.create({
      header: 'Not Allowed',
      message: 'You can only access the profile after ' + this.user.fullName + ' respond to your messages',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  videoCall() {
    if (this.authUser  && this.user) {
      this.router.navigateByUrl('/messages/video/' + this.user.id);
    } else this.videoCallSubAlert();
  }
  
  async videoCallSubAlert() {
    const message = !this.user.friend ? ('You can only call friends, how about sending a friend request to ' + this.user.fullName) : ('You must subscribe to call ' + this.user.fullName);
    const alert = await this.alertController.create({
      header: 'You can\'t call ' + this.user.fullName,
      message: message,
      buttons: [
        {
          text: 'cancel',
          role: 'cancel'
        },
        {
          text: 'Subscribe',
          cssClass: 'text-danger',
          handler: () => {
            this.router.navigateByUrl('/tabs/subscription');
          }
        }
      ]
    });
    await alert.present();
  }

  nonFriendsChatEnabled() {
    console.log('Friend status:', this.user?.isFriend);
    console.log('Messages count:', this.messages.length);
  
    if (this.user && this.user.isFriend) {
      return true; // No limit for friends
    }
    
    return this.messages.length < 10; // Limit for non-friends
  }
  
  
}

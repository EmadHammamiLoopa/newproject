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
  private sendMessageCounter = 0;

  allowToChat = false;
  business = false;

  constructor(private camera: Camera, private userService: UserService, private route: ActivatedRoute,
              private messageService: MessageService, private changeDetection: ChangeDetectorRef,
              private platform: Platform, private uploadFileService: UploadFileService, private webView: WebView,
              private toastService: ToastService, private location: Location, private router: Router, private productService: ProductService, 
              private alertController: AlertController, private socketService: SocketService, private nativeStorage: NativeStorage) {
  }

  ngOnInit() {
    console.log("ngOnInit called");
    this.getAuthUser();
  
    this.route.paramMap.subscribe(params => {
      const userId = params.get('id');
      if (userId) {
        console.log("User ID detected:", userId);
        this.getUserProfile(userId);
        this.initializeSocket(userId); // Pass userId directly

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
    this.nativeStorage.getItem('user').then(
      (user) => {
        if (user) {
          this.authUser = new User().initialize(user);
          console.log("✅ Authenticated user:", this.authUser);
          this.getUserId();
        } else {
          this.fallbackToLocalStorage();
        }
      },
      (err) => this.fallbackToLocalStorage()
    );
  }
  
  fallbackToLocalStorage() {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        this.authUser = new User().initialize(user);
        console.log("✅ Loaded from localStorage:", this.authUser);
        this.getUserId();
      } else {
        console.error("❌ No user data found.");
        this.pageLoading = false;
      }
    } catch (err) {
      console.error("❌ Error parsing localStorage user data:", err);
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
  
  
  
  async initializeSocket(userId: string) {
    if (!userId) {
      console.error("❌ User ID missing, cannot initialize WebSocket.");
      return;
    }
  
    if (this.socket) {
      console.warn("⚠️ WebSocket already initialized. Skipping reinitialization.");
      return;
    }
  
    try {
      await SocketService.initializeSocket(userId);
      this.socket = await SocketService.getSocket(); // Ensure it's initialized
  
      if (!this.socket) {
        console.error("❌ WebSocket is still not initialized. Aborting.");
        return;
      }
  
      console.log("✅ WebSocket instance retrieved:", this.socket.id);
      this.socket.emit('connect-user', userId);
      this.initSocketListeners(); // Ensure event listeners are set up
    } catch (error) {
      console.error("❌ WebSocket initialization failed:", error);
    }
  }
  
  
  

  scrollToBottom() {
    this.content.scrollToPoint(0, 1000 * 1000);
  }

  getUser(id: string) {
    this.getUserProfile(id);
  }

  async getMessages(event?) {
    if (!this.socket) {
      console.warn("⚠️ WebSocket is not ready. Trying to reinitialize...");
      if (this.user?.id) {
        await this.initializeSocket(this.user.id);
      } else {
        console.error("❌ Cannot reinitialize WebSocket: User ID missing.");
        return;
      }
    }
  

  
    if (this.pageLoading) {
      console.warn("⚠️ Already loading messages, skipping request.");
      this.pageLoading = false; // ✅ Ensure loading state is updated

      return;
    }
    
    this.pageLoading = true;
    console.log("📩 Fetching messages...");
  
    try {
      const resp: any = await this.messageService.indexMessages(this.user?.id || this.productId, this.page++);
      
      if (!resp.data?.messages?.length) {
        console.log("✅ No new messages found.");
        this.pageLoading = false;
        return;
      }
  
      // Ensure no duplicate messages are pushed
      const newMessages = resp.data.messages.map(msg => new Message().initialize(msg));
      const existingMessageIds = new Set(this.messages.map(msg => msg.id));
  
      newMessages.forEach(msg => {
        if (!existingMessageIds.has(msg.id)) {
          this.messages.unshift(msg);
        }
      });
  
      console.log(`✅ Messages loaded: ${this.messages.length}`);
      this.pageLoading = false;
  
      if (!resp.data.more) {
        this.infScroll.disabled = true;
      }
  
      if (event) {
        event.target.complete();
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
      this.toastService.presentStdToastr(error);
    }
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
    if (!this.socket) {
      console.error("❌ WebSocket not initialized. Cannot listen for messages.");
      return;
    }
  
    this.socket.on('new-message', (message) => {
      console.log("📩 New message received from WebSocket:", message);
  
      if (typeof message === "string") {
        message = JSON.parse(message); // Ensure correct parsing
      }
      if (message.type === 'video-call-request') {
        console.log("📢 Video call request received:", message);
        // Show a notification or update the UI to indicate a video call request
        this.toastService.presentStdToastr(`${message.from} has requested a video call.`);
      }

      // ✅ Find the existing message and update its status instead of adding a duplicate
      const existingMsg = this.messages.find(msg => msg.text === message.text && msg.from === message.from);
      if (existingMsg) {
        console.log("✅ Updating message status to 'sent':", message);
        existingMsg.state = 'sent'; // ✅ Change status from "sending" (⏳) to "sent" (✅)
        existingMsg.id = message.id; // Assign real ID from backend
        this.changeDetection.detectChanges();
      } else {
        console.log("🆕 New message detected, adding to UI:", message);
        this.messages.push(new Message().initialize(message));
        this.changeDetection.detectChanges();
      }
    });
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


async showSubscriptionAlert(usedChats = 0, totalChats = 3) {
  const remainingChats = totalChats - usedChats;
  const alert = await this.alertController.create({
    header: 'Free Chat Limit Reached',
    message: `You have used ${usedChats} out of ${totalChats} free chats today. Subscribe for unlimited chats.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Subscribe Now',
        cssClass: 'text-danger',
        handler: () => this.router.navigateByUrl('/tabs/subscription'),
      }
    ]
  });

  await alert.present();
}


async sendMessage(message, ind) {
  if (!this.socket) {
    console.warn("⚠️ WebSocket is not ready. Trying to retrieve...");
    this.socket = await SocketService.getSocket();

    if (!this.socket) {
      console.error("❌ WebSocket is still not available. Aborting send.");
      return;
    }
  }


  const payload = new Message();
  payload.id = ''; // Let the backend generate an ID
  payload.from = this.authUser.id;
  payload.to = this.user.id;
  payload.text = message.text || ''; // Ensure text is not undefined
  payload.state = 'sending'; // Mark as "sending" ⏳
  payload.image = this.imageFile ? this.image : null;
  payload.type = message.type || 'text';
  payload.productId = this.productId || null;
  payload.createdAt = new Date();

  console.log("📤 Sending message:", payload);

  // ✅ Check if a message with the same text already exists (prevent duplicates)
  const existingMsg = this.messages.find(msg => msg.text === payload.text && msg.from === payload.from);
  if (!existingMsg) {
    this.messages.push(payload);
    this.changeDetection.detectChanges();
  } else {
    console.warn("⚠️ Duplicate message detected, skipping push:", payload);
  }

  // 🔥 Emit WebSocket event and wait for acknowledgment
  this.socket.emit('send-message', payload, (ack) => {
    console.log("📩 WebSocket acknowledgment received:", ack);

    if (ack?.success) {
      console.log("✅ Message sent successfully:", ack.message);

      // ✅ Find and update the existing message instead of adding a new one
      const msgToUpdate = this.messages.find(msg => msg.text === payload.text && msg.from === payload.from);
      if (msgToUpdate) {
        msgToUpdate.state = 'sent'; // ✅ Update status to "sent" (✅)
        msgToUpdate.id = ack.message.id; // Assign backend-generated ID
        this.changeDetection.detectChanges();
      } else {
        console.warn("⚠️ Sent message not found in UI, skipping update.");
      }

    } else {
      payload.state = 'failed'; // ❌ Mark as failed
      console.warn("⚠️ Message failed, retrying:", payload);
      setTimeout(() => this.sendMessage(payload, ind), 3000);
    }
    this.changeDetection.detectChanges();
  });

  // Reset input fields
  this.messageText = "";
  this.image = null;
  this.imageFile = null;
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

// Modify ProfileEnabled to always return true
ProfileEnabled() {
  return true;  // Allow profile viewing without restrictions
}

showUserProfile() {
  // Since ProfileEnabled now always returns true, you don't need the else case anymore
  this.router.navigateByUrl('/tabs/profile/display/' + this.user.id);
}

showUproduct() {
  // Since ProfileEnabled now always returns true, you don't need the else case anymore
  this.router.navigateByUrl('/tabs/buy-and-sell/product/' + this.productId);
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

  getProductImage(product: Product): string {
    if (product.photos && product.photos.length > 0) {
      console.log("imageeeeerrrrrrrrrrrrrrrrreeeeee",product.photos[0].url);
      return product.photos[0].url; // Return the URL of the first photo
    } else {
      return 'assets/imgs/no-image.png'; // Placeholder image if no photos exist
    }
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
   // console.log('Friend status:', this.user?.isFriend);
   // console.log('Messages count:', this.messages.length);
  
    if (this.user && this.user.isFriend) {
      return true; // No limit for friends
    }
    
    return this.messages.length < 10; // Limit for non-friends
  }
  
  async requestVideoCall() {
    // Ensure conversation is started and the user can still send messages (if non-friend)
    if (!this.conversationStarted() || !this.nonFriendsChatEnabled()) {
      console.log("Cannot request video call: conversation not started or message limit reached.");
      return;
    }
  
    if (!this.authUser || !this.user) {
      console.log("Missing user information.");
      return;
    }
  
    // Ensure the socket is initialized
    if (!this.socket) {
      console.warn("⚠️ WebSocket is not ready. Trying to reinitialize...");
      if (this.user?.id) {
        await this.initializeSocket(this.user.id);
      } else {
        console.error("❌ Cannot reinitialize WebSocket: User ID missing.");
        return;
      }
    }
  
    const videoCallMessage = new Message();
    videoCallMessage.id = this.index.toString();
    videoCallMessage.from = this.authUser.id;
    videoCallMessage.to = this.user.id;
    videoCallMessage.text = `${this.authUser.fullName} has requested a video call.`;
    videoCallMessage.state = '';
    videoCallMessage.createdAt = new Date();
    videoCallMessage.type = 'video-call-request'; // Custom type for video call request
  
    this.messages.push(videoCallMessage);
    this.sentMessages[this.index] = videoCallMessage;
  
    // Emit socket event to notify the recipient
    this.socket.emit('video-call-request', {
      from: this.authUser.id,
      to: this.user.id,
      text: videoCallMessage.text,
    });
  
    this.index++;
    this.scrollToBottom();
  }
  
  
  canRequestVideoCall(): boolean {
    return this.user && !this.user.isFriend;  // Only allow for non-friends
  }
  
  
  
}

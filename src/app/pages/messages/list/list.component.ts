import { MessageService } from './../../../services/message.service';
import { User } from './../../../models/User';
import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { UserService } from 'src/app/services/user.service';
import { WebrtcService } from 'src/app/services/webrtc.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements OnInit {
  page = 0;
  pageLoading = false;
  users: User[] = [];
  missedCalls = [];

  constructor(
    private messageService: MessageService,
    private alertController: AlertController,
    private userService: UserService,
    private webrtcService: WebrtcService
  ) {}

  ngOnInit() {
    this.loadMissedCalls();
  
    // ✅ Subscribe to missed calls updates dynamically
    this.webrtcService.missedCalls$.subscribe((calls) => {
      this.missedCalls = calls;
    });
  }

  ionViewWillEnter() {
    this.page = 0;
    this.getUsersMessages(null);
  }


  loadMissedCalls() {
    const storedCalls = localStorage.getItem("missedCalls");
    this.missedCalls = storedCalls ? JSON.parse(storedCalls) : [];
  }


  storeMissedCall(userId: string) {
    const missedCalls = JSON.parse(localStorage.getItem("missedCalls")) || [];
    missedCalls.push({ userId, timestamp: new Date().toISOString() });
    localStorage.setItem("missedCalls", JSON.stringify(missedCalls));
  
    console.log(`🔔 Missed call stored from user: ${userId}`);
  }
  
  /** ✅ Show Missed Calls */
  async showMissedCalls() {
    if (this.missedCalls.length === 0) {
      alert("✅ No missed calls.");
      return;
    }
  
    // ✅ Limit the number of buttons displayed (e.g., 5)
    const maxButtons = 5;
    const displayedCalls = this.missedCalls.slice(0, maxButtons);
  
    const buttons: any[] = displayedCalls.map(call => ({
      text: `📞 Call ${call.userId} (${new Date(call.timestamp).toLocaleTimeString()})`,
      handler: () => {
        this.callBack(call.userId);
      }
    }));
  
    // ✅ Add a "View More" button if there are more missed calls
    if (this.missedCalls.length > maxButtons) {
      buttons.push({
        text: "View More",
        handler: () => {
          // Show the remaining missed calls in a new alert
          const remainingCalls = this.missedCalls.slice(maxButtons);
          this.showRemainingMissedCalls(remainingCalls);
        }
      });
    }
  
    // ✅ Add a "Close" button
    buttons.push({
      text: "Close",
      role: "cancel",
      handler: () => {
        // Clear missed calls after acknowledgment
        this.missedCalls = [];
        localStorage.removeItem("missedCalls");
        this.webrtcService.missedCalls$.next(this.missedCalls); // Update UI
      }
    });
  
    // ✅ Create and present the alert
    const alertElement = await this.alertController.create({
      header: "📞 Missed Calls",
      message: `You have ${this.missedCalls.length} missed calls.`,
      buttons: buttons
    });
  
    await alertElement.present();
  }
  
  // ✅ Helper method to show remaining missed calls
  async showRemainingMissedCalls(remainingCalls: any[]) {
    const buttons: any[] = remainingCalls.map(call => ({
      text: `📞  ${call.userId} (${new Date(call.timestamp).toLocaleTimeString()})`,
      handler: () => {
        this.callBack(call.userId);
      }
    }));
  
    // ✅ Add a "Close" button
    buttons.push({
      text: "Close",
      role: "cancel",
      handler: () => {
        // Clear missed calls after acknowledgment
        this.missedCalls = [];
        localStorage.removeItem("missedCalls");
        this.webrtcService.missedCalls$.next(this.missedCalls); // Update UI
      }
    });
  
    // ✅ Create and present the alert for remaining calls
    const alertElement = await this.alertController.create({
      header: "📞 More Missed Calls",
      message: `You have ${remainingCalls.length} more missed calls.`,
      buttons: buttons
    });
  
    await alertElement.present();
  }
  
  

getUsersMessages(event?, refresh?) {
  if (!event) this.pageLoading = true;
  if (refresh) this.page = 0;

  this.messageService.usersMessages(this.page++).then(
    (resp: any) => {
      this.pageLoading = false;

      // Clear the users array if it's a refresh
      if (refresh) {
        this.users = [];
      }

      // Process each user
      resp.data.users.forEach((usr) => {
        if (usr.messages && usr.messages.length > 0) {
          this.userService.getUserProfile(usr._id).subscribe((userProfile) => {
            // Map messages to include productId if type is 'product'
            const messages = usr.messages.map((message) => {
              if (message.type === 'product') {
                return {
                  ...message,
                  productId: message.productId, // Ensure productId is preserved
                };
              } else {
                return message; // Return the message as is for other types
              }
            });

            // Create a new User object
            const user = new User().initialize({
              ...userProfile,
              _id: usr._id, // Ensure ID from message service is used
              messages: messages, // Include the processed messages
              firstName: userProfile.firstName || usr.firstName,
              lastName: userProfile.lastName || usr.lastName,
              mainAvatar: userProfile.mainAvatar || usr.mainAvatar,
              avatar: userProfile.avatar.length ? userProfile.avatar : usr.avatar,
            });

            // Add the user to the array
            this.users.push(user);

            // Sort the users array by the latest message timestamp
            this.sortUsersByLatestMessage();
          });
        }
      });

      // Complete the infinite scroll event
      if (event) {
        event.target.complete();
        if (!resp.data.more && !refresh) event.target.disabled = true;
      }
    },
    (err) => {
      this.pageLoading = false;
      if (event) {
        event.target.complete();
      }
      console.log(err);
    }
  );
}


callBack(userId: string) {
  console.log(`📞 Calling back ${userId}...`);
  this.webrtcService.callPartner(userId);
}


  // Sort users by the latest message timestamp (newest first)
  sortUsersByLatestMessage() {
    this.users.sort((a, b) => {
      const aTimestamp = a.messages?.length ? new Date(a.messages[0].createdAt).getTime() : 0;
      const bTimestamp = b.messages?.length ? new Date(b.messages[0].createdAt).getTime() : 0;
      return bTimestamp - aTimestamp; // Sort in descending order
    });
  }

  // Remove a user and their messages
  async removeUser(user: User) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete the conversation with ${user.fullName}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          handler: () => {
            // Delete all messages for the user
            user.messages.forEach((message) => {
              this.messageService.deleteMessage(message.id).then(() => {
                console.log('Message deleted:', message.id);
              });
            });

            // Remove the user from the local list
            this.users = this.users.filter((u) => u._id !== user._id);
          },
        },
      ],
    });

    await alert.present();
  }
}
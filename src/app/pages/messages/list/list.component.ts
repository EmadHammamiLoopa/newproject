import { MessageService } from './../../../services/message.service';
import { User } from './../../../models/User';
import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements OnInit {

  page = 0
  pageLoading = false;
  users: User[];

  constructor(private messageService: MessageService, private alertController: AlertController, private userService: UserService) { }

  ngOnInit() {}

  ionViewWillEnter(){
    this.page = 0;
    this.getUsersMessages(null)
  }

  getUsersMessages(event?, refresh?) {
    if (!event) this.pageLoading = true;
    if (refresh) this.page = 0;
  
    this.messageService.usersMessages(this.page++)
      .then(
        (resp: any) => {
          this.pageLoading = false;
          if (!event || refresh) {
            this.users = [];
          }
  
          resp.data.users.forEach(usr => {
            // Check if the user has messages
            if (usr.messages && usr.messages.length > 0) {
              this.userService.getUserProfile(usr._id).subscribe(userProfile => {
                const messages = usr.messages.map(message => {
                  console.log('Message object:', message);
                  if (message.type === 'product') {
                    return {
                      ...message,
                      productId: message.productId // Ensure productId is preserved
                    };
                  } else {
                    return message; // Return the message as is for other types
                  }
                });
  
                const user = new User().initialize({
                  ...userProfile,
                  _id: usr._id, // Ensure ID from message service is used
                  messages: messages, // Include the processed messages
                  firstName: userProfile.firstName || usr.firstName,
                  lastName: userProfile.lastName || usr.lastName,
                  mainAvatar: userProfile.mainAvatar || usr.mainAvatar,
                  avatar: userProfile.avatar.length ? userProfile.avatar : usr.avatar
                });
  
                this.users.push(user);
              });
            }
          });
  
          if (event) {
            event.target.complete();
            if (!resp.data.more && !refresh) event.target.disabled = true;
          }
        },
        err => {
          this.pageLoading = false;
          if (event) {
            event.target.complete();
          }
          console.log(err);
        }
      );
  }
  

  removeUser(user: User) {
    this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete the conversation with ${user.fullName}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: () => {
            // Iterate through user's messages and delete each one
            user.messages.forEach(message => {
              this.messageService.deleteMessage(message.id).then(() => {
                console.log('Message deleted:', message.id);
              });
            });
  
            // Remove the user from the local list
            this.users = this.users.filter(u => u._id !== user._id);
          }
        }
      ]
    }).then(alert => alert.present());
  }
  
}

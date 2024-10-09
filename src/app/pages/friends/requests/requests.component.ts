import { Component, OnInit } from '@angular/core';
import { RequestService } from 'src/app/services/request.service';
import { UserService } from 'src/app/services/user.service';
import { ToastService } from 'src/app/services/toast.service';
import { Request } from 'src/app/models/Request';
import { User } from 'src/app/models/User'; // Ensure you import User model
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.scss'],
})
export class RequestsComponent implements OnInit {
  requests: Request[] = [];
  pageLoading = false;
  page: number = 0;

  constructor(
    private requestService: RequestService,
    private userService: UserService,
    private toastService: ToastService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  ionViewWillEnter() {
    this.page = 0;
    this.loadRequests();
  }

  loadRequests(event?: any) {
    this.pageLoading = true;
    this.getRequests(this.page, event);
  }

  getRequests(page: number = this.page, event?: any) {
    this.requestService.requests(page).then(
      (resp: any) => {
        if (!event) {
          this.requests = [];
        }
  
        // Properly initialize each request including user details
        this.requests = [
          ...this.requests,
          ...resp.data.map((requestData: any) => {
            const request = new Request().initialize(requestData);
  
            // Properly initialize the 'from' user with detailed profile information
            request.from = new User().initialize({
              ...requestData.from,
              mainAvatar: requestData.from.mainAvatar || requestData.from.avatar[0],
            });
  
            return request;
          }),
        ];
  
        // Complete the refresh or infinite scroll event
        if (event && event.target) {
          event.target.complete();
        }
  
        this.pageLoading = false;
      },
      (err) => {
        this.pageLoading = false;
        console.error('Error loading requests:', err);
        this.toastService.presentStdToastr('Failed to load requests.');
        
        // Complete the event even on error
        if (event && event.target) {
          event.target.complete();
        }
      }
    );
  }
  

  acceptRequest(request: Request) {
    const requestId = request._id;
    this.requestService.acceptRequest(requestId).then(
      async (resp: any) => {
        this.requests = this.requests.filter((r) => r._id !== requestId);
        this.toastService.presentStdToastr(resp.message);
        await this.userService.refreshFriendsList();
      },
      (err) => {
        console.error('Error accepting request:', err);
        this.toastService.presentStdToastr('Failed to accept request.');
      }
    );
  }

  async rejectRequestConf(request: Request) {
    const alert = await this.alertCtrl.create({
      header: 'Reject request',
      message: 'Do you really want to reject this request?',
      buttons: [
        {
          text: 'CANCEL',
          role: 'cancel',
        },
        {
          text: 'REJECT',
          cssClass: 'text-danger',
          handler: () => this.rejectRequest(request),
        },
      ],
    });
    await alert.present();
  }

  rejectRequest(request: Request) {
    const requestId = request._id;
    this.requestService.cancelRequest(requestId).then(
      (resp: any) => {
        this.requests = this.requests.filter((r) => r._id !== requestId);
        this.toastService.presentStdToastr(resp.message);
      },
      (err) => {
        console.error('Error rejecting request:', err);
        this.toastService.presentStdToastr('Failed to reject request.');
      }
    );
  }
}

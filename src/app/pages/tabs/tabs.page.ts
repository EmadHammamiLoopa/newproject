import { Component, OnInit } from '@angular/core';
import { RequestService } from 'src/app/services/request.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage implements OnInit {

  newRequestsCount: number = 0;

  tabs: {
    url: string,
    icon?: string,
    iconColor?: string,
    badgeCount?: number
  }[] = [
    { url: 'profile', icon: 'fas fa-user' },
    { url: 'friends', icon: 'fas fa-users', iconColor: '', badgeCount: 0 },
    { url: 'messages', icon: 'fas fa-comments' },
    { url: 'new-friends', icon: 'fas fa-search' },
    { url: 'channels', icon: 'fas fa-object-group' },
    { url: 'buy-and-sell', icon: 'fas fa-store' },
    { url: 'small-business', icon: 'fas fa-briefcase' },
  ];

  constructor(private requestService: RequestService) { }

  ngOnInit() {
    this.loadNewRequestsCount();
  }

  loadNewRequestsCount() {
    this.requestService.requests(0).then((resp: any) => {
      this.newRequestsCount = resp.data.length;
      this.updateFriendsTab();
    });
  }

  updateFriendsTab() {
    const friendsTab = this.tabs.find(tab => tab.url === 'friends');
    if (friendsTab) {
      friendsTab.iconColor = this.newRequestsCount > 0 ? 'red' : '';
      friendsTab.badgeCount = this.newRequestsCount;
    }
  }
}

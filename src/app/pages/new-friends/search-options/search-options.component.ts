import { Component, Input, OnChanges, OnInit, SimpleChange, SimpleChanges } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-search-options',
  templateUrl: './search-options.component.html',
  styleUrls: ['./search-options.component.scss'],
})
export class SearchOptionsComponent implements OnInit {
  
  @Input() gender = 'male';
  @Input() checkItems;

  checkItemsNames: string[] = []

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.checkItemsNames = Object.keys(this.checkItems);
    this.checkItemsNames.forEach(item => {
      this.checkItems[item] = this.checkItems[item] == '1' ? 1 : 0;
    })
  }

  submit(){
    this.checkItemsNames.forEach(item => {
      this.checkItems[item] = this.checkItems[item] ? '1' : '0';
    })
    const data = {
      gender: this.gender,
      ...this.checkItems
    }
    this.modalCtrl.dismiss(data)
  }

}

export class Subscription{

  private _id: string;
  private _offers: string[];
  private _dayPrice: number;
  private _weekPrice: number;
  private _monthPrice: number;
  private _yearPrice: number;
  private _currency: string;

  constructor(subscription: Subscription){
    this.id = subscription._id;
    this.offers = subscription.offers;
    this.dayPrice = subscription.dayPrice;
    this.weekPrice = subscription.weekPrice;
    this.monthPrice = subscription.monthPrice;
    this.yearPrice = subscription.yearPrice;
    this.currency = subscription.currency;
  }

  get id(): string{ return this._id }
  get offers(): string[]{ return this._offers }
  get dayPrice(): number{ return this._dayPrice }
  get weekPrice(): number{ return this._weekPrice }
  get monthPrice(): number{ return this._monthPrice }
  get yearPrice(): number{ return this._yearPrice }
  get currency(): string{ return this._currency }

  set id(id: string){ this._id = id }
  set offers(offers: string[]){ this._offers = offers }
  set dayPrice(dayPrice: number){ this._dayPrice = dayPrice }
  set weekPrice(weekPrice: number){ this._weekPrice = weekPrice }
  set monthPrice(monthPrice: number){ this._monthPrice = monthPrice }
  set yearPrice(yearPrice: number){ this._yearPrice = yearPrice }
  set currency(currency: string){ this._currency = currency }
}

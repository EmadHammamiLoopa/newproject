import constants from '../helpers/constants';
import { User } from './User';
export class Service{

  private _id: string;
  private _title: string;
  private _description: string;
  private _company: string;
  private _phone: string;
  private _country: string;
  private _city: string;
  private _state: string;
  private _photo: string;
  private _createdAt: Date;
  private _user: User

  constructor(product: Service){
    this.id = product._id;
    this.title = product.title;
    this.description = product.description;
    this.company = product.company;
    this.phone = product.phone;
    this.country = product.country;
    this.city = product.city;
    this.state = product.state;
    this.photo = product.photo;
    this.user = product.user;
    this.createdAt = new Date(product.createdAt)
  }

  get id(): string{ return this._id }
  get title(): string{ return this._title }
  get description(): string{ return this._description }
  get company(): string{ return this._company }
  get phone(): string{ return this._phone }
  get country(): string{ return this._country }
  get city(): string{ return this._city }
  get state(): string{ return this._state }
  get user(): User{ return this._user }
  get photo(): string{ return this._photo }
  get createdAt(): Date{ return this._createdAt }

  set id(id: string){ this._id = id }
  set title(title: string){ this._title = title }
  set description(description: string){ this._description = description }
  set company(company: string){ this._company = company }
  set phone(phone: string){ this._phone = phone }
  set country(country: string){ this._country = country }
  set city(city: string){ this._city = city }
  set state(state: string){ this._state = state }
  set user(user: User){
    if(user){
      if(typeof user == 'string'){
        this._user = new User();
        this._user.id = user;
      }else{
        this._user = new User().initialize(user)
      }
    }
  }
  set photo(photo: string){
    this._photo = (!photo.includes(constants.DOMAIN_URL) ? constants.DOMAIN_URL : '') + photo
   }
  set createdAt(createdAt: Date){ this._createdAt = createdAt }
}

import constants from '../helpers/constants';
import { User } from './User';
export class Job{

  private _id: string;
  private _title: string;
  private _description: string;
  private _company: string;
  private _email: string;
  private _country: string;
  private _city: string;
  private _enabled: boolean;
  private _photo: string;
  private _createdAt: Date;
  private _user: User

  constructor(job: Job){
    this.id = job._id;
    this.title = job.title;
    this.description = job.description;
    this.company = job.company;
    this.email = job.email;
    this.country = job.country;
    this.city = job.city;
    this.enabled = job.enabled;
    this.photo = job.photo;
    this.user = job.user;
    this.createdAt = new Date(job.createdAt)
  }

  get id(): string{ return this._id }
  get title(): string{ return this._title }
  get description(): string{ return this._description }
  get company(): string{ return this._company }
  get email(): string{ return this._email }
  get country(): string{ return this._country }
  get city(): string{ return this._city }
  get enabled(): boolean{ return this._enabled }
  get user(): User{ return this._user }
  get photo(): string{ return this._photo }
  get createdAt(): Date{ return this._createdAt }

  set id(id: string){ this._id = id }
  set title(title: string){ this._title = title }
  set description(description: string){ this._description = description }
  set company(company: string){ this._company = company }
  set email(email: string){ this._email = email }
  set country(country: string){ this._country = country }
  set city(city: string){ this._city = city }
  set enabled(enabled: boolean){ this._enabled = enabled }
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

import constants from '../helpers/constants';
import { User } from './User';

interface PhotoObject {
  path: string;
  type?: string;
}

export class Channel {
  private _id: string;
  private _name: string;
  private _description: string;
  private _approved: boolean;
  private _photo: string;
  private _createdAt: Date;
  private _user: User;
  private _followers: string[];
  private _category: string;
  private _city?: string;
  private _country?: string;
  
  // Optional properties for static channels
  private _icon?: string;
  private _type?: 'static' | 'user' | 'static_events' |'static_dating';

  constructor() {}

  initialize(channel: Partial<Channel>) {
    this._id = channel.id ?? channel['_id'] ?? '';
    this._name = channel.name ?? '';
    this._description = channel.description ?? '';
    this._approved = true;
    this._photo = channel.photo ?? '';
    this._user = channel.user ?? new User();
    this._createdAt = channel.createdAt ? new Date(channel.createdAt) : new Date();
    this._category = channel.category ?? '';
    this._followers = channel.followers ?? [];
    this._icon = channel.icon;
    this._type = channel.type;
    this._city = channel.city;
    this._country = channel.country;
    return this;
  }

  static createFromData(data: Partial<Channel>): Channel {
    const channel = new Channel();
    const baseUrl = constants.DOMAIN_URL || 'http://127.0.0.1:3300';
  
    channel._id = data.id ?? data['_id'] ?? '';
    channel._name = data.name || '';
    channel._description = data.description || '';
    channel._approved = data.approved ?? true;

    if (typeof data.photo === 'string') {
      channel._photo = data.photo.startsWith('http')
        ? data.photo
        : `${baseUrl}${data.photo.startsWith('/') ? '' : '/'}${data.photo}`;
    } else if (typeof data.photo === 'object' && data.photo !== null && 'path' in data.photo) {
      const photo = data.photo as PhotoObject;
      channel._photo = photo.path.startsWith('http')
        ? photo.path
        : `${baseUrl}${photo.path.startsWith('/') ? '' : '/'}${photo.path}`;
    } else {
      channel._photo = 'assets/images/default-channel.png'; // Fallback image
    }

    channel._createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    channel._user = data.user || new User();
    channel._followers = data.followers || [];
    channel._category = data.category || '';
    channel._icon = data.icon;
    channel._type = data.type;
    channel._city = data.city;
    channel._country = data.country;

    return channel;
  }

  followedBy(userId: string): boolean {
  //  console.log(`Checking if user ${userId} follows the channel:`, this._followers);
    return this._followers.includes(userId);
  }
  

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get description(): string { return this._description; }
  get approved(): boolean { return this._approved; }
  get user(): User { return this._user; }
  get photo(): string { return this._photo; }
  get createdAt(): Date { return this._createdAt; }
  get followers(): string[] { return this._followers; }
  get category(): string { return this._category; }
  get city(): string | undefined { return this._city; }
  get country(): string | undefined { return this._country; }

  get icon(): string | undefined { return this._icon; }
  get type(): 'static' | 'user' | 'static_events' |'static_dating'| undefined { 
    return this._type; 
}
  set id(id: string) { this._id = id; }
  set name(name: string) { this._name = name; }
  set description(description: string) { this._description = description; }
  set approved(approved: boolean) { this._approved = approved; }
  set user(user: User) {
    if (user) {
      if (typeof user === 'string') {
        this._user = new User();
        this._user.id = user;
      } else {
        this._user = new User().initialize(user);
      }
    }
  }
  set photo(photo: string) {
    const baseUrl = constants.DOMAIN_URL || 'http://127.0.0.1:3300';
    this._photo = photo.startsWith('https')
      ? photo
      : `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
  }
  set createdAt(createdAt: Date) { this._createdAt = createdAt; }
  set followers(followers: string[]) { this._followers = followers; }
  set category(category: string) { this._category = category; }
  set city(city: string | undefined) { this._city = city; }
  set country(country: string | undefined) { this._country = country; }

  set icon(icon: string | undefined) { this._icon = icon; }
  set type(type: 'static' | 'user' | 'static_events' |'static_dating'| undefined) { 
    this._type = type; 
}

  toObject() {
    return {
      _id: this.id,
      name: this.name,
      description: this.description,
      approved: this.approved,
      category: this.category,
      photo: this.photo,
      createdAt: this.createdAt,
      user: this.user instanceof User ? this.user.toObject() : {},
      followers: this.followers,
      icon: this.icon,
      type: this.type,
      city: this.city,
      country: this.country
    };
  }
}

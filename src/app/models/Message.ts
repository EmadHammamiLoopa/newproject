import constants from '../helpers/constants';
import { Product } from './Product';

export class Message {
  private _id: string;
  private _from: string;
  private _to: string;
  private _text: string;
  private _state: string;
  private _createdAt: Date;
  private _image: string;
  private _type: string;
  public productId?: string; // Property to store product ID
  public product?: Product; // Property to store product details

  constructor() {}

  initialize(message: any) {
    console.log('Initializing message:', message);

    this.id = message._id;
    this.from = message.from;
    this.to = message.to;
    this.text = message.text;
    this.createdAt = new Date(message.createdAt);
    this.image = message.image;
    this.state = message.state;
    this.type = message.type;

    // Initialize productId and product based on the message type
    if (this.type === 'product') {
      this.productId = message.productId || null; // Ensure productId is assigned even if undefined
      // Assuming `message.product` can be directly used to initialize `Product`
      this.product = message.product ? new Product().initialize(message.product) : null;
    } else {
      this.productId = null;
      this.product = null;
    }

    return this;
  }

  get id(): string {
    return this._id;
  }
  get from(): string {
    return this._from;
  }
  get to(): string {
    return this._to;
  }
  get text(): string {
    return this._text;
  }
  get state(): string {
    return this._state;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get image(): string {
    return this._image;
  }
  get type(): string {
    return this._type;
  }

  set id(id: string) {
    this._id = id;
  }
  set from(from: string) {
    this._from = from;
  }
  set to(to: string) {
    this._to = to;
  }
  set text(text: string) {
    this._text = text;
  }
  set state(state: string) {
    this._state = state;
  }
  set createdAt(createdAt: Date) {
    this._createdAt = createdAt;
  }
  set image(image: any) {
    if (!image || image === 'undefined' || image === 'null') {
      this._image = null;
    } else if (typeof image === 'string') {
      this._image = image.includes(constants.DOMAIN_URL) ? image : constants.DOMAIN_URL + image;
    } else if (typeof image === 'object' && image.path) {
      // If `image` is an object, use its `path`
      this._image = constants.DOMAIN_URL + image.path;
    } else {
      this._image = null; // Default case if image is neither a string nor an object
    }
  }
  
  set type(type: string) {
    this._type = type;
  }

  isMine(id: string): boolean {
    return this.from === id;
  }
}

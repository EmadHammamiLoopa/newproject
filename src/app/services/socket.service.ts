import { Injectable } from '@angular/core';
import constants from '../helpers/constants';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private static socketInstance: Socket;

  constructor() {
    if (!SocketService.socketInstance) {
      SocketService.socketInstance = io(constants.DOMAIN_URL);
    }
  }

  static get socket(): Socket {
    return SocketService.socketInstance;
  }
}

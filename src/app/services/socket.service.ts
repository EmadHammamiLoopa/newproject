import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import constants from '../helpers/constants';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private static socketInstance: Socket | null = null;
  private static initializationPromise: Promise<void> | null = null;

  static initializeSocket(userId: string): Promise<void> {
    if (!userId) {
      console.error('❌ No userId provided. WebSocket will not connect.');
      return Promise.reject(new Error('No userId provided.'));
    }

    console.log('🔵 Initializing WebSocket with userId:', userId);

    if (!SocketService.initializationPromise) {
      SocketService.initializationPromise = new Promise((resolve, reject) => {
        try {
          SocketService.socketInstance = io(constants.DOMAIN_URL, {
            query: { userId },
            withCredentials: true,
          });

          SocketService.socketInstance.on('connect', () => {
            console.log('✅ WebSocket Connected:', SocketService.socketInstance?.id);
            resolve();
          });

          SocketService.socketInstance.on('disconnect', (reason) => {
            console.error('❌ WebSocket Disconnected:', reason);
            SocketService.socketInstance = null; // Reset instance on disconnect
          });

          SocketService.socketInstance.on('connect_error', (error) => {
            console.error('⚠️ WebSocket Connection Error:', error);
            reject(new Error(`WebSocket Connection Error: ${error.message}`));
          });
        } catch (error) {
          console.error('🚨 WebSocket Initialization Failed:', error);
          reject(error);
        }
      });
    }

    return SocketService.initializationPromise;
  }

  static async getSocket(): Promise<Socket> {
    if (!SocketService.socketInstance) {
      console.warn('⚠️ WebSocket is not initialized yet. Initializing now...');
      await SocketService.initializationPromise;
    }
    if (!SocketService.socketInstance) {
      throw new Error('❌ WebSocket is still not initialized.');
    }
    return SocketService.socketInstance;
  }
}

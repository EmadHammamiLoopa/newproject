import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import constants from '../helpers/constants';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private static socketInstance: Socket | null = null;
  private static initializationPromise: Promise<void> | null = null;

  private static reconnectionInProgress = false;

  static initializeSocket(userId: string): Promise<void> {
    if (!userId) {
      return Promise.reject(new Error('No userId provided.'));
    }
  
    // If already connected, return immediately
    if (SocketService.socketInstance?.connected) {
      return Promise.resolve();
    }
  
    // If reconnection already in progress, return that promise
    if (SocketService.reconnectionInProgress) {
      return SocketService.initializationPromise || Promise.reject(new Error('Connection in progress'));
    }
  
    SocketService.reconnectionInProgress = true;
    
    SocketService.initializationPromise = new Promise((resolve, reject) => {
      console.log('🔵 Initializing WebSocket connection...');
  
      // Destroy existing socket if it exists
      if (SocketService.socketInstance) {
        SocketService.socketInstance.removeAllListeners();
        SocketService.socketInstance.disconnect();
      }
  
      SocketService.socketInstance = io(constants.DOMAIN_URL, {
        query: { userId },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity, // Keep trying forever
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 20000,
      });
  
      const connectionTimeout = setTimeout(() => {
        console.warn('⌛ WebSocket connection timeout');
        reject(new Error('Connection timeout'));
        SocketService.reconnectionInProgress = false;
      }, 30000); // 30 second timeout
  
      SocketService.socketInstance.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ WebSocket Connected:', SocketService.socketInstance?.id);
        SocketService.reconnectionInProgress = false;
        resolve();
      });
  
      SocketService.socketInstance.on('connect_error', (error) => {
        console.error('⚠️ WebSocket Connection Error:', error);
        // Don't reject here - let reconnection attempts continue
      });
  
      SocketService.socketInstance.on('disconnect', (reason) => {
        console.warn('🔄 WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // The server forcibly disconnected, try to reconnect
          SocketService.socketInstance?.connect();
        }
      });
    });
  
    return SocketService.initializationPromise;
  }
  
  // Add heartbeat monitoring
  static startHeartbeat() {
    if (!SocketService.socketInstance) return;
  
    setInterval(() => {
      if (SocketService.socketInstance?.connected) {
        SocketService.socketInstance.emit('heartbeat', { 
          timestamp: Date.now() 
        });
      }
    }, 30000); // Every 30 seconds
  }


  static async getSocket(): Promise<Socket> {
    if (SocketService.socketInstance) {
      return SocketService.socketInstance;
    }
  
    if (!SocketService.initializationPromise) {
      throw new Error('❌ WebSocket is still not initialized.');
    }
  
    await SocketService.initializationPromise;
    
    if (!SocketService.socketInstance) {
      throw new Error('❌ WebSocket failed to initialize.');
    }
  
    return SocketService.socketInstance;
  }
  static emit(event: string, data: any): void {
    if (SocketService.socketInstance?.connected) {
      SocketService.socketInstance.emit(event, data);
    } else {
      console.warn(`⚠️ Cannot emit '${event}' — WebSocket not connected.`);
    }
  }
  
}

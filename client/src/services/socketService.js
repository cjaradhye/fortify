import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    this.socket = io('http://localhost:3000', {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from server');
    });
  }

  analyzeContract(contractAddress, callbacks) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return;
    }

    // Set up event listeners
    if (callbacks.onProgress) {
      this.socket.on('progress', callbacks.onProgress);
    }

    if (callbacks.onComplete) {
      this.socket.on('analysisComplete', callbacks.onComplete);
    }

    if (callbacks.onError) {
      this.socket.on('error', callbacks.onError);
    }

    // Start analysis
    this.socket.emit('analyzeContract', contractAddress);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
// import {
//   WebSocketGateway,
//   WebSocketServer,
//   SubscribeMessage,
//   ConnectedSocket,
//   MessageBody,
// } from '@nestjs/websockets';

// import { Server, Socket } from 'socket.io';

// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
// })
// export class SocketGateway {
//   @WebSocketServer()
//   server: Server;

//   private users = new Map<number, string>();

//   @SubscribeMessage('join')
//   handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: number) {
//     console.log('JOIN:', userId, client.id);

//     this.users.set(userId, client.id);

//     console.log('Users:', [...this.users.entries()]);
//   }

//   notifyUser(userId: number, data: any) {
//     const socketId = this.users.get(userId);

//     console.log('Notify =>', userId);
//     console.log('SocketId =>', socketId);
//     console.log('Users =>', [...this.users.entries()]);

//     if (!socketId) {
//       console.log('❌ User chưa join');
//       return;
//     }

//     this.server.to(socketId).emit('notify', data);
//     console.log('✅ Emit notify');
//   }
// }

// export class socketGateway {
//   @WebSocketServer()
//   server: Server;

//   // userId -> socketId
//   private users = new Map<number, string>();

//   @SubscribeMessage('join')
//   handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: number) {
//     this.users.set(userId, client.id);
//   }

//   notifyUser(userId: number, data: any) {
//     const socketId = this.users.get(userId);

//     if (!socketId) return;

//     this.server.to(socketId).emit('notify', data);
//   }
// }
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  private users = new Map<number, string>();

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: number) {
    console.log('JOIN:', userId, client.id);

    this.users.set(userId, client.id);

    console.log('Users:', [...this.users.entries()]);
  }

  notifyUser(userId: number, data: any) {
    const socketId = this.users.get(userId);

    console.log('Notify =>', userId);
    console.log('SocketId =>', socketId);

    if (!socketId) {
      console.log('❌ User chưa join');
      return;
    }

    this.server.to(socketId).emit('notify', data);

    console.log('✅ Emit notify');
  }
}

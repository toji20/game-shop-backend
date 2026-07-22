import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  path: '/api/socket.io',
  cors: {
    origin: process.env.CLIENT_URL, // временно для теста
    credentials: true,
  },
})
export class OrderGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    server.engine.on('initial_headers', (headers: any) => {
      headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
      headers['Access-Control-Allow-Credentials'] = 'true';
    });
  }

  notifyNewManualOrder(order: any) {
    this.server.emit('order:created', order);
  }

  notifyOrderStatusUpdated(order: any) {
    this.server.emit('order:updated', { id: order.id, order });
  }

  notifyOrderCompleted(userId: string, orderId: string) {
    this.server.emit(`order:completed:${userId}`, { orderId });
  }
}

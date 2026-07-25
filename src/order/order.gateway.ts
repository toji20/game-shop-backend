import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  path: '/api/socket.io',
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
})
export class OrderGateway {
  @WebSocketServer()
  server!: Server;

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

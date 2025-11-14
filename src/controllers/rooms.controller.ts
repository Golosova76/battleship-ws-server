export const roomsController = {
  handleRoomMessage(connectionContext, message) {
    console.log('roomsController got:', message.type);
  },
};

export const gamesController = {
  handleGameMessage(connectionContext, message) {
    console.log('gamesController got:', message.type);
  },
};

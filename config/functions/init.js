'use strict';

//Public dependencies
const EventEmitter = require('events');

/**
 * An asynchronous function that init important services for working project
 */

module.exports = () => {
  class MyEmitter extends EventEmitter {}

  //Change emitter limits to infinity
  MyEmitter._maxListeners = 0;
  MyEmitter.defaultMaxListeners = 0;

  //Attach emitter to global object
  strapi.eventEmitter = new MyEmitter();

  //Setup socket.io
  const io = require('socket.io')(2337);

  //Setup cross domain requests
  //io.set('transports', ['websocket']);

  //Handle connections
  io.on('connection', socket => {
    //console.log('New user connected', socket.id);

    //Event for enable online mode
    // socket.on('authorize', (jwt) => {
    //   //console.log('User try to authorize', socket.id, jwt);
    //   strapi.plugins['users-permissions'].services.user.activateUserAuth(socket.id, jwt);
    // });
    //
    // socket.on('disconnect', () => {
    //   //console.log('disconnected', socket.id);
    //   strapi.plugins['users-permissions'].services.user.deactivateUserAuth(socket.id);
    // });

  });

  //Handle system notifications
  strapi.eventEmitter.on('system::notify', async (notify) => {
    if(notify.data && typeof notify.data === typeof 'str'){
      notify.data = notify.data.replace(/\r/g, '');
      notify.data = notify.data.replace(/\n/g, '');
      notify.data = notify.data.replace(/\t/g, '');
    }

    io.emit(notify.topic, JSON.stringify(notify.data));
    // let socketIds = await strapi.plugins['users-permissions'].services.user.findSocketUsers(notify.users);
    //
    // for (var i = 0; i < socketIds.length; i++) {
    //   io.to(`${socketIds[i]}`).emit(notify.topic, JSON.stringify(notify.data));
    // }
  });
};

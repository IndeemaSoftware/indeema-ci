'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */
const exec = require('child_process').exec;

module.exports = {
    async runServerScript(server, command, status) {
        return new Promise((rs, rj) => {
          const commandConnect = exec(command);
                                      commandConnect.stdout.on('data', async function(data) {
          if (data !== '') {
              const consoleItem = await strapi.services.console.create({
              message: data,
              type: 'message',
              server: server.id
              });
      
              //Set status server
              await strapi.services.server.update({
                id: server.id
                }, {
                server_status: status.progress.status
              });
      
              //Send message
              strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${server.id}/message`,
              data: consoleItem.message
              });
          }
          });
          commandConnect.on('close', async (code) => {
              const consoleItem = await strapi.services.console.create({
                message: `Child process exited with code ${code}`,
                type: 'end',
                server: server.id
              });
              //Send message
              await strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${server.id}/end`,
                data: consoleItem.message
              });
      
              if(code !== 0){
                strapi.services.console.create({
                  message: status.bad.info,
                  type: 'build_error',
                  server: server.id
                });
      
                //Set status server
                await strapi.services.server.update({
                  id: server.id
                }, {
                  server_status: status.bad.status
                });
      
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                  topic: `/console/setup/${server.id}/build_error`,
                  data: status.bad.info
                });
              } else {
                const consoleItem = await strapi.services.console.create({
                  message: status.ok.info,
                  type: 'end',
                  server: server.id
                });
    
                //Set status server
                await strapi.services.server.update({
                  id: server.id
                }, {
                  server_status: status.ok.status
                });
    
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                  topic: `/console/setup/${server.id}/build_success`,
                  data: consoleItem.message
                });
            }
            });
          rs({status:"ok", data:"Good"});
        });
      },

      async runAppScript(app, command, status) {
        return new Promise((rs, rj) => {
          const commandConnect = exec(command);
                                      commandConnect.stdout.on('data', async function(data) {
          if(data !== ''){
              const consoleItem = await strapi.services.console.create({
              message: data,
              type: 'message',
              app: app.id
              });
      
              //Set status app
              strapi.services.app.update({
                id: app.id
              }, {
                app_status: status.progress.status
              });
      
              //Send message
              strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${app.id}/message`,
              data: consoleItem.message
              });
          }
          });

          commandConnect.on('close', async (code) => {
              const consoleItem = await strapi.services.console.create({
                message: `Child process exited with code ${code}`,
                type: 'end',
                app: app.id
              });
              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${app.id}/end`,
                data: consoleItem.message
              });
      
              if(code !== 0){
                 strapi.services.console.create({
                  message: status.bad.info,
                  type: 'build_error',
                  app: app.id
                });
      
                //Set status app
                strapi.services.app.update({
                    id: app.id
                }, {
                    app_status: status.bad.status
                });
      
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                  topic: `/console/setup/${app.id}/build_error`,
                  data: status.bad.info
                });
              } else {
                const consoleItem = await strapi.services.console.create({
                  message: status.ok.info,
                  type: 'end',
                  app: app.id
                });
    
                //Set status app
                strapi.services.app.update({
                  id: app.id
                }, {
                    app_status: status.ok.status
                });
    
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                  topic: `/console/setup/${app.id}/build_success`,
                  data: consoleItem.message
                });
            }
            });
          rs({status:"ok", data:"Good"});
        });
      }
};

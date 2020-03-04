'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */
const exec = require('child_process').exec;
var express = require('express');
var app = express();

app.listen(3000, function () {
  updateMessage();
  setInterval(updateMessage, 1000);
});

var messages = [{key:"",value:""}];
var gServer = null;
var gStatus = null;

function msleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

async function updateMessage() {
  while (messages.length > 0) {
    let object = messages.shift(); 
    console.log(object);
    if (object.key === 'data') {
      const consoleItem = await strapi.services.console.create({
        message: object.value,
        type: 'message',
        server: gServer.id
      });
      //Set status server
      await strapi.services.server.update({
        id: gServer.id
      }, {
        server_status: gStatus.progress.status
      });
      //Send message
      await strapi.eventEmitter.emit('system::notify', {
        topic: `/console/setup/${gServer.id}/message`,
        data: consoleItem.message
      }); 
    } else if (object.key === 'close') {
      let code = object.value

      const consoleItem = await strapi.services.console.create({
        message: `Child process exited with code ${code}`,
        type: 'end',
        server: gServer.id
      });
      //Send message
      await strapi.eventEmitter.emit('system::notify', {
        topic: `/console/setup/${gServer.id}/end`,
        data: consoleItem.message
      });

      if(code !== 0){
        await strapi.services.console.create({
          message: gStatus.bad.info,
          type: 'build_error',
          server: server.id
        });

        //Set status server
        await strapi.services.server.update({
          id: server.id
        }, {
          server_status: gStatus.bad.status
        });

        //Send message
        await strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${server.id}/build_error`,
          data: gStatus.bad.info
        });
      } else {
        const consoleItem = await strapi.services.console.create({
          message: gStatus.ok.info,
          type: 'end',
          server: gServer.id
        });

        //Set status server
        await strapi.services.server.update({
          id: gServer.id
        }, {
          server_status: gStatus.ok.status
        });

        //Send message
        await strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${gServer.id}/build_success`,
          data: consoleItem.message
        });
      }
    }  
  } 
}
module.exports = {
    async updateMessage(server, status) {

      while (messages.length > 0) {
        const consoleItem = await strapi.services.console.create({
          message: messages.pop(),
          type: 'message',
          server: server.id
        });
        //Set status server
        strapi.services.server.update({
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
    },

    async runServerScript(server, command, status) {
        return new Promise((rs, rj) => {
          gServer = server;
          gStatus = status;    
          
          const commandConnect = exec(command);
          commandConnect.stdout.on('data', async function (data) {
            console.log("new data" + messages.length);
            for (let tmpData of JSON.stringify(data).split(`\\r\\n`)) {
              for (let tmp of tmpData.split(`\\r`)) {
                tmp = tmp.replace('\"', '');
                tmp = tmp.replace('\"', '');
                tmp = tmp.replace('\\"', '');
                tmp = tmp.replace('\\t', '');
                tmp = tmp.replace('\n', '');
                tmp = tmp.replace('\\', '');
                tmp = tmp.replace('"', '');
                tmp = tmp.replace('"', '');
                // console.log(tmp);
                if (tmp !== '' && tmp !== '\\r' && tmp !== '\\n' && tmp !== ' ') {    
                  messages.push({key:"data", value:tmp});        
                }
              }
            }
            // strapi.services.console.updateMessage(server, status);
          });
          commandConnect.on('close', async (code) => {
            messages.push({key:"close", value:code});
            console.log("close" + messages.length);
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
              message: `data`,
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
      },
};

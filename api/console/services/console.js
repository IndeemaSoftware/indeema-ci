'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */
const exec = require('child_process').exec;
var express = require('express');
var server = express();
var app = express();

app.listen(3000, function () {
  messages();
  setInterval(messages, 1000);
});

var gServerMessages = [{key:"",value:""}];
var gServer = null;
var gServerStatus = null;

var gAppMessages = [{key:"",value:""}];
var gApp = null;
var gAppStatus = null;

function msleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

async function messages() {
  updateAppMessage();
  updateServerMessage();
}

async function updateAppMessage() {
  while (gAppMessages.length > 0) {
    let object = gAppMessages.shift(); 
    console.log(object);
    if (object.key === 'data') {
      const consoleItem = await strapi.services.console.create({
        message: object.value,
        type: 'message',
        app: gApp.id
        });

        //Set status app
        strapi.services.app.update({
          id: gApp.id
        }, {
          app_status: gAppStatus.progress.status
        });

        //Send message
        strapi.eventEmitter.emit('system::notify', {
        topic: `/console/setup/${gApp.id}/message`,
        data: consoleItem.message
        });
    } else if (object.key === 'close') {
      let code = object.value

      const consoleItem = await strapi.services.console.create({
        message: `Child process exited with code ${code}`,
        type: 'end',
        app: gApp.id
      });
      //Send message
      strapi.eventEmitter.emit('system::notify', {
        topic: `/console/setup/${gApp.id}/end`,
        data: consoleItem.message
      });

      if(code !== 0){
         strapi.services.console.create({
          message: gAppStatus.bad.info,
          type: 'build_error',
          app: gApp.id
        });

        //Set status app
        strapi.services.app.update({
            id: gApp.id
        }, {
            app_status: gAppStatus.bad.status
        });

        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${gApp.id}/build_error`,
          data: gAppStatus.bad.info
        });
      } else {
        const consoleItem = await strapi.services.console.create({
          message: gAppStatus.ok.info,
          type: 'end',
          app: gApp.id
        });

        //Set status app
        strapi.services.app.update({
          id: gApp.id
        }, {
            app_status: gAppStatus.ok.status
        });

        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${gApp.id}/build_success`,
          data: consoleItem.message
        });
      }
    }
  }
}

async function updateServerMessage() {
  while (gServerMessages.length > 0) {
    let object = gServerMessages.shift(); 
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
        server_status: gServerStatus.progress.status
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
          message: gServerStatus.bad.info,
          type: 'build_error',
          server: server.id
        });

        //Set status server
        await strapi.services.server.update({
          id: server.id
        }, {
          server_status: gServerStatus.bad.status
        });

        //Send message
        await strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${server.id}/build_error`,
          data: gServerStatus.bad.info
        });
      } else {
        const consoleItem = await strapi.services.console.create({
          message: gServerStatus.ok.info,
          type: 'end',
          server: gServer.id
        });

        //Set status server
        await strapi.services.server.update({
          id: gServer.id
        }, {
          server_status: gServerStatus.ok.status
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
  async runServerScript(server, command, status) {
    return new Promise((rs, rj) => {
      gServer = server;
      gServerStatus = status;    
      
      const commandConnect = exec(command);
      commandConnect.stdout.on('data', async function (data) {
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
              gServerMessages.push({key:"data", value:tmp});        
            }
          }
        }
      });
      commandConnect.on('close', async (code) => {
        gServerMessages.push({key:"close", value:code});
      });
      rs({status:"ok", data:"Good"});
    });
  },

  async runAppScript(app, command, status) {
    return new Promise((rs, rj) => {
      gApp = app;
      gAppStatus = status;

      const commandConnect = exec(command);
      commandConnect.stdout.on('data', async function(data) {
        for (let tmpData of JSON.stringify(data).split(`\\r\\n`)) {
          for (let tmp of tmpData.split(`\\r`)) {
            console.log(tmp);
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
              gAppMessages.push({key:"data", value:tmp});        
            }
          }
        }
      });
      commandConnect.on('close', async (code) => {
        gAppMessages.push({key:"close", value:code});
      });
      rs({status:"ok", data:"Good"});
    });
  },
};

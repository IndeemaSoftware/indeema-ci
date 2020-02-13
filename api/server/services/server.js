'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    cleanupServer: async (server) => {
        var command = resourcesPath + `platforms_cleanup/${server.platform.platform_name} `;

        return new Promise((rs, rj) => {
            const commandConnect = exec(command);
            commandConnect.stdout.on('data', async function(data){
            if(data !== ''){
                const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'message',
                server: server._id.toString()
                });
        
                //Set status project
                await strapi.services.server.update({
                id: server._id.toString()
                }, {
                server_status: 'progress'
                });
        
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${server._id.toString()}/message`,
                data: consoleItem.message
                });
            }
            });
            commandConnect.stderr.on('data', async function(data){
            if(data !== ''){
                const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'error',
                server: server._id.toString()
                });
        
                //Set status project
                await strapi.services.server.update({
                id: server._id.toString()
                }, {
                server_status: 'failed'
                });
        
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${server._id.toString()}/error`,
                data: consoleItem.message
                });
            }
            });
        });
    },

    setupServer: async (server) => {
        var command = resourcesPath + `platforms/${server.platform.platform_name} `;

        return new Promise((rs, rj) => {
            const commandConnect = exec(command);
            commandConnect.stdout.on('data', async function(data){
            if(data !== ''){
                const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'message',
                server: server._id.toString()
                });
        
                //Set status project
                await strapi.services.server.update({
                id: server._id.toString()
                }, {
                server_status: 'progress'
                });
        
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${server._id.toString()}/message`,
                data: consoleItem.message
                });
            }
            });
            commandConnect.stderr.on('data', async function(data){
            if(data !== ''){
                const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'error',
                server: server._id.toString()
                });
        
                //Set status project
                await strapi.services.server.update({
                id: server._id.toString()
                }, {
                server_status: 'failed'
                });
        
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${server._id.toString()}/error`,
                data: consoleItem.message
                });
            }
        });
    });
    }
};

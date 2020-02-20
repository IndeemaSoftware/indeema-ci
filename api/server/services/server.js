'use strict';
//Exec for shell command`s
const exec = require('child_process').exec;
const path = require('path');
const resourcesPath = path.resolve() + "/public/uploads/scripts/" 

const SSH = "ssh -o StrictHostKeyChecking=no -i ${server.ssh_key[server.ssh_key.length - 1].url} ${server.ssh_username}@${server.ssh_ip} -tt"

const SERVER_SETUP_STATUS = {ok:{status:"build_success", info:"Setup succed"},
                            bad:{status:"build_failed", info:"Setup failed"},
                            progress:{status:"progress", info:"Setup is in progress"}}
const SERVER_CLEANUP_STATUS = {ok:{status:"cleanup_success", info:"Cleanup succed"},
                            bad:{status:"cleanup_failed", info:"Cleanup failed"},
                            progress:{status:"progress", info:"Cleanup is in progress"}}
/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    cleanupServer: async (server) => {
        var command = resourcesPath + `platforms_cleanup/${server.platform.platform_name} `;

        command += ` -n ${server.server_name}`;
        command += ` -d ${server.server_description}`;
        command += ` -o ${server.platform.platform_name}`;
        command += ` -p "${server.ports}"`;
        command += ` -i ${server.ssh_ip}`;
        command += ` -u ${server.ssh_username}`;
        command += ` -k ${server.ssh_key[server.ssh_key.length - 1].url}`

        return strapi.services.server.runCommand(server, command, SERVER_CLEANUP_STATUS);
    },

    setupServer: async (server) => {
        var command = resourcesPath + `platforms/${server.platform.platform_name}`;

        command += ` -n ${server.server_name}`;
        command += ` -d ${server.server_description}`;
        command += ` -o ${server.platform.platform_name}`;
        command += ` -p "${server.ports}"`;
        command += ` -i ${server.ssh_ip}`;
        command += ` -u ${server.ssh_username}`;
        command += ` -k ${server.ssh_key[server.ssh_key.length - 1].url}`;

        if(server.server_dependencies && server.server_dependencies.length) {
            //Also prepare list for packages names
            const packagesNames = [];
            const postNames = [];
            const preNames = [];
      
            //Prepare repository, packages pre and post install scripts
            command += ' -r "';
            for(let item of server.server_dependencies){
              if(item.repo && item.repo !== '')
                command += item.repo + '; ';
      
              packagesNames.push(item.package);
              preNames.push(item.pre_install_script);
              postNames.push(item.post_install_script);
            }
            command += '" ';
      
            if(packagesNames.length){
              command += '-s "';
              for(let name of packagesNames){
                command += name + ' ';
              }
              command +='" ';
            }

            if(preNames.length){
                command += '-e "';
                for(let name of preNames){
                  command += name + ' ';
                }
                command +='" ';
              }

            if(postNames.length){
              command += '-t "';
              for(let name of postNames){
                command += name + ' ';
              }
              command +='" ';
            }
        }

        return strapi.services.server.runCommand(server, command, SERVER_SETUP_STATUS);
    },

    async runCommand(server, command,status) {
        return new Promise((rs, rj) => {
            console.log(command);

            const commandConnect = exec(command);
                                        commandConnect.stdout.on('data', async function(data) {
            console.log(data);
            if(data !== ''){
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
              console.log("close with code: " + code);
                const consoleItem = await strapi.services.console.create({
                  message: `Child process exited with code ${code}`,
                  type: 'end',
                  server: server.id
                });
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                  topic: `/console/setup/${server.id}/end`,
                  data: consoleItem.message
                });
        
                if(code !== 0){
                  await strapi.services.console.create({
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
    } 
};

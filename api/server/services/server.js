'use strict';
//Exec for shell command`s
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

const publicPath = path.resolve() + "/public";
const resourcesPath = publicPath + "/uploads/scripts/" 
const subscriptsPath = resourcesPath + "subscripts";
const scriptsPathOnServer = `/tmp/indeema_ci`;


const SERVER_SETUP_STATUS = {ok:{status:"success", info:"Setup succed"},
                            bad:{status:"failed", info:"Setup failed"},
                            progress:{status:"progress", info:"Setup is in progress"}}

const SERVER_COPYING_STATUS = {ok:{status:"success", info:"Resource copied to server"},
                            bad:{status:"failed", info:"Resource copying failed"},
                            progress:{status:"progress", info:"Copying resources to server"}}


const SERVER_CLEANUP_STATUS = {ok:{status:"cleanup_success", info:"Cleanup succed"},
                            bad:{status:"cleanup_failed", info:"Cleanup failed"},
                            progress:{status:"progress", info:"Cleanup is in progress"}}
/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  cleanupServer: async (server) => {
    const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`

    let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
    command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
    command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
    command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${subscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;

    let script = scriptsPathOnServer + `/` + server.platform.platform_name + `_cleanup`;
    command += `${ssh} "${script}"`;

    command += ` -n ${server.server_name}`;
    command += ` -d ${server.server_description}`;
    command += ` -o ${server.platform.platform_name}`;
    command += ` -p "${server.ports}"`;
    command += ` -i ${server.ssh_ip}`;
    command += ` -u ${server.ssh_username}`;
    command += ` -k ${server.ssh_key.url}`

    return strapi.services.server.runPlatformScript(server, command, SERVER_CLEANUP_STATUS);
  },

  setupServer: async (server) => {
    await strapi.services.server.generateSubScripts(server);

    const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`

    //create dir on remove machine
    let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
    command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
    command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
    command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${subscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;

    let script = scriptsPathOnServer + `/` + server.platform.platform_name;
    command += `${ssh} "${script}"`;

    command += ` -n ${server.server_name}`;
    command += ` -d ${server.server_description}`;
    command += ` -o ${server.platform.platform_name}`;
    command += ` -p "${server.ports}"`;
    command += ` -i ${server.ssh_ip}`;
    command += ` -u ${server.ssh_username}`;
    command += ` -k ${server.ssh_key.url}`;
    command += ` -z ${subscriptsPath}`;

    // if (server.server_dependencies && server.server_dependencies.length) {
    //     //Also prepare list for packages names
    //     const packagesNames = [];
    //     const postNames = [];
    //     const preNames = [];
  //
        //Prepare repository, packages pre and post install scripts
      //   command += ' -r "';
      //   for (let item of server.server_dependencies) {
      //     if (item.repo && item.repo !== '')
      //       command += item.repo + '; ';
  
      //     packagesNames.push(item.package);
      //     preNames.push(item.pre_install_script);
      //     postNames.push(item.post_install_script);
      //   }
      //   command += '" ';
  
      //   if (packagesNames.length) {
      //     command += '-s "';
      //     for (let name of packagesNames) {
      //       command += name + ' ';
      //     }
      //     command +='" ';
      //   }

      //   if (preNames.length) {
      //       command += '-e "';
      //       for(let name of preNames){
      //         command += name + ' ';
      //       }
      //       command +='" ';
      //     }

      //   if(postNames.length){
      //     command += '-t "';
      //     for(let name of postNames){
      //       command += name + ' ';
      //     }
      //     command +='" ';
      //   }
      // }

    let status = strapi.services.server.runPlatformScript(server, command, SERVER_SETUP_STATUS);
    // strapi.services.server.deleteFolderRecursive(subscriptsPath);
    return status;
  },

  async runPlatformScript(server, command, status) {
    console.log(command);
    return new Promise((rs, rj) => {
      const commandConnect = exec(command);
                                  commandConnect.stdout.on('data', async function(data) {
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
          await strapi.eventEmitter.emit('system::notify', {
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
            await strapi.eventEmitter.emit('system::notify', {
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
            await strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${server.id}/build_success`,
              data: consoleItem.message
            });
        }
        });
      rs({status:"ok", data:"Good"});
    });
  },

  async moveScriptsToServer(server) {
    //prepare all scripts for copying
    await strapi.services.server.generateSubScripts(server);

    if (server && server.ssh_key && server.ssh_key.url && server.ssh_username && server.ssh_ip) {
      const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`

      //create dir on remove machine
      let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
      command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
      command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
      command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${subscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;

      await strapi.services.server.runPlatformScript(server, command, SERVER_COPYING_STATUS);
    }
  },
  
  async generateSubScripts(server) {
    return new Promise((rs, rj) => {
      strapi.services.server.deleteFolderRecursive(subscriptsPath);

      if (!fs.existsSync(subscriptsPath)){
        fs.mkdirSync(subscriptsPath);
      }

      //copying server setup and cleanup files
      if (server.platform.platform_name) {
        fs.copyFile(`${resourcesPath}platforms/${server.platform.platform_name}`, `${subscriptsPath}/${server.platform.platform_name}`, (err) => {
          if (err) throw err;
        });   
      }

      //copying server setup and cleanup files
      if (server.platform.platform_name) {
        fs.copyFile(`${resourcesPath}platforms_cleanup/${server.platform.platform_name}`, `${subscriptsPath}/${server.platform.platform_name}_cleanup`, (err) => {
          if (err) throw err;
        });   
      }


      if (server.server_dependencies && server.server_dependencies.length) {
        for (let obj of server.server_dependencies) {
          let i_script = subscriptsPath + `/${obj.name}_install`;
          let pre_script = subscriptsPath + `/${obj.name}_pre`;
          let post_script = subscriptsPath + `/${obj.name}_post`;

          //generating server dependency script files
          if (obj.install_script) {
            fs.writeFile(i_script, obj.install_script, (err) => {
              if (err) rs({"status":"bad", "data":err});
              exec(`chmod a+x ${i_script}`);
                rs();
            });               
          }
          if (obj.pre_install_script) {
            fs.writeFile(pre_script, obj.pre_install_script, (err) => {
              if (err) rs({"status":"bad", "data":err});
              exec(`chmod a+x ${pre_script}`);
                rs();
            });   
          }
          if (obj.post_install_script) {
            fs.writeFile(post_script, obj.post_install_script, (err) => {
              if (err) rs({"status":"bad", "data":err});
              exec(`chmod a+x ${post_script}`);
                rs();
            });   
          }
        }  
      }

      //generating custom dependency script files
      if (server.custom_dependencies && server.custom_dependencies.length) {
        for (let obj of server.custom_dependencies) {
          let i_script = subscriptsPath + `/${obj.name}_install`;

          if (obj.install_script) {
            fs.writeFile(i_script, obj.install_script, (err) => {
              if (err) rs({"status":"bad", "data":err});
              exec(`chmod a+x ${i_script}`);
                rs();
            });   
          }
        }  
      }

      rs();
    });
  },

  async deleteFolderRecursive(del_path) {
    if (fs.existsSync(del_path)) {
      fs.readdirSync(del_path).forEach((file, index) => {
        const curPath = path.join(del_path, file);
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(del_path);
    }
  }
};

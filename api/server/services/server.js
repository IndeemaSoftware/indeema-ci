'use strict';
//Exec for shell command`s
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const publicPath = path.resolve() + "/public";
const resourcesPath = publicPath + "/uploads/scripts/" 
const subscriptsPath = resourcesPath + "subscripts";
const scriptsPathOnServer = `/tmp/indeema_ci`;

const SETUP = "setup";
const CLEANUP = "cleanup";

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
  setupServer: async (server) => {
    return strapi.services.server.runScript(server, SETUP);
  },

  cleanupServer: async (server) => {
    return strapi.services.server.runScript(server, CLEANUP);
  },

  runScript: async (server, name) => {
    await strapi.services.server.generateSubScripts(server);

    const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`

    //create dir on remove machine
    let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
    // command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
    command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
    command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${subscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;

    let script = scriptsPathOnServer + `/` + server.platform.platform_name + `_` + name;
    command += `${ssh} "${script}"`;

    let status = strapi.services.console.runServerScript(server, command, (name === SETUP)?SERVER_SETUP_STATUS:SERVER_CLEANUP_STATUS);
    // strapi.services.server.deleteFolderRecursive(subscriptsPath);
    return status;
  },
  
  async generateSubScripts(server) {
    return new Promise((rs, rj) => {
      strapi.services.server.deleteFolderRecursive(subscriptsPath);

      if (!fs.existsSync(subscriptsPath)){
        fs.mkdirSync(subscriptsPath);
      }
      let setup_script = subscriptsPath + `/${server.platform.platform_name}_setup`;
      let cleanup_script = subscriptsPath + `/${server.platform.platform_name}_cleanup`;
      
      let script = "#!/bin/bash\n";

      if (Object.keys(server.platform.variables).length > 0) {
        for (let key of server.platform.variables) {
          script += key.name.toUpperCase() + `=` + `"${key.value}"` + "\n";
        }
      }

      for (let key in server) {
        if (key !== "createdAt" && key !== "updatedAt" && key !== "id" && key !== "ports") {
          if (server[key] !== null && typeof server[key] !== 'object') {
            script += key.toUpperCase() + `=` + `"${server[key]}"` + "\n";
          }
        } else if (key === "ports") {
          script += "PORTS=(";
          for (let port of server.ports) {
            script += port + " ";
          }  
          script += ")\n";
        }
      }

      //generating server dependency script files
      if (server.platform.setup_script) {
        script += server.platform.setup_script;
        fs.writeFile(setup_script, script, (err) => {
          if (err) rs({"status":"bad", "data":err});
            exec(`chmod a+x ${setup_script}`);
            rs();
        });               
      }
      
      if (server.platform.cleanup_script) {
        script += server.platform.cleanup_script;
        fs.writeFile(cleanup_script, server.platform.cleanup_script, (err) => {
          if (err) rs({"status":"bad", "data":err});
            exec(`chmod a+x ${cleanup_script}`);
            rs();
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

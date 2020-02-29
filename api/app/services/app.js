'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;


const publicPath = path.resolve() + "/public";
const resourcesPath = publicPath + "/uploads/scripts/" 
const subscriptsPath = resourcesPath + "subscripts";
const scriptsPathOnServer = `/tmp/indeema_ci`;

const APP_SETUP_STATUS = {ok:{status:"success", info:"Setup succed"},
                            bad:{status:"failed", info:"Setup failed"},
                            progress:{status:"progress", info:"Setup is in progress"}}

const SERVER_COPYING_STATUS = {ok:{status:"success", info:"Resource copied to server"},
                            bad:{status:"failed", info:"Resource copying failed"},
                            progress:{status:"progress", info:"Copying resources to server"}}


const APP_CLEANUP_STATUS = {ok:{status:"cleanup_success", info:"Cleanup succed"},
                            bad:{status:"cleanup_failed", info:"Cleanup failed"},
                            progress:{status:"progress", info:"Cleanup is in progress"}}

module.exports = {
    setupApp: async (app) => {
        return strapi.services.app.runScript(app, "setup");

    },

    cleanupApp: async (app) => {
        return strapi.services.app.runScript(app, "cleanup");
    },

    runScript: async (app, name) => {
        await strapi.services.app.moveScriptsToServer(app);
        let server = app.server;

        const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`

        //create dir on remove machine
        let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
        command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
        command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
        command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${subscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;

        let script = scriptsPathOnServer + `/` + app.service.service_name + `_` + name;
        command += `${ssh} "${script}"`;

        let status = strapi.services.console.runAppScript(app, command, APP_SETUP_STATUS);
        // strapi.services.app.deleteFolderRecursive(subscriptsPath);
        return status;
    },

    async moveScriptsToServer(app) {
        //prepare all scripts for copying
        await strapi.services.app.generateSubScripts(app);
        let server = app.server;

    
        if (server && server.ssh_key && server.ssh_key.url && server.ssh_username && server.ssh_ip) {
          const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`
    
          //create dir on remove machine
          let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
          command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
          command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
          command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${subscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;
    
          await strapi.services.console.runServerScript(server, command, SERVER_COPYING_STATUS);
        }
    },

    async generateSubScripts(app) {
        return new Promise((rs, rj) => {
          strapi.services.app.deleteFolderRecursive(subscriptsPath);
    
          if (!fs.existsSync(subscriptsPath)){
            fs.mkdirSync(subscriptsPath);
          }
        
          let setup_script = subscriptsPath + `/${app.service.service_name}_setup`;
          let cleanup_script = subscriptsPath + `/${app.service.service_name}_cleanup`;

          let script = "#!/bin/bash\n";
          for (let key in app) {
              if (key !== "createdAt" && key !== "updatedAt") {
                  if (app[key] !== null && typeof app[key] !== 'object') {
                    script += key.toUpperCase() + `=` + `"${app[key]}"` + "\n";
                  }
              }
          }
          script += `project_name=`.toUpperCase() + `"${app.project.project_name}"` + "\n";

          //generating server dependency script files
          if (app.service.setup_script) {
            script += app.service.setup_script;
            fs.writeFile(setup_script, script, (err) => {
              if (err) rs({"status":"bad", "data":err});
                exec(`chmod a+x ${setup_script}`);
                rs();
            });               
          }
          
          if (app.service.cleanup_script) {
            script += app.service.cleanup_script;
            fs.writeFile(cleanup_script, app.service.cleanup_script, (err) => {
              if (err) rs({"status":"bad", "data":err});
                exec(`chmod a+x ${cleanup_script}`);
                rs();
            });   
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
    },
};

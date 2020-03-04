'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const publicPath = path.resolve() + "/public";
const resourcesPath = publicPath + "/uploads/" 
const subscriptsPath = resourcesPath + `scripts/subscripts`;
const scriptsPathOnServer = `/tmp/indeema_ci`;

const SETUP = "setup";
const CLEANUP = "cleanup";

const APP_SETUP_STATUS = {ok:{status:"success", info:"Setup succed"},
                            bad:{status:"failed", info:"Setup failed"},
                            progress:{status:"progress", info:"Setup is in progress"}}

const APP_COPYING_STATUS = {ok:{status:"success", info:"Resource copied to server"},
                            bad:{status:"failed", info:"Resource copying failed"},
                            progress:{status:"progress", info:"Copying resources to server"}}


const APP_CLEANUP_STATUS = {ok:{status:"cleanup_success", info:"Cleanup succed"},
                            bad:{status:"cleanup_failed", info:"Cleanup failed"},
                            progress:{status:"progress", info:"Cleanup is in progress"}}

module.exports = {
    setupApp: async (app) => {
      return await strapi.services.app.runScript(app, SETUP);
    },

    cleanupApp: async (app) => {
      return await strapi.services.app.runScript(app, CLEANUP);
    },

    runScript: async (app, name) => {
      await strapi.services.app.generateSubScripts(app);
      let server = app.server;
      let appSubscriptsPath = subscriptsPath + `/${app.id}`;

      const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`

      //create dir on remove machine
      let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
      // command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
      command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
      command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${appSubscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;

      let script = scriptsPathOnServer + `/` + app.service.service_name + `_` + name;
      command += `${ssh} "${script}"`;

      let status = await strapi.services.console.runAppScript(app, command, APP_SETUP_STATUS);
      // strapi.services.app.deleteFolderRecursive(appSubscriptsPath);
      return status;
    },

    generateSubScripts: async (app) => {
      return new Promise((rs, rj) => {
        let appSubscriptsPath = subscriptsPath + `/${app.id}`;
        strapi.services.app.deleteFolderRecursive(appSubscriptsPath);
  
        if (!fs.existsSync(appSubscriptsPath)){
          fs.mkdirSync(appSubscriptsPath);
        }

        let setup_script = appSubscriptsPath + `/${app.service.service_name}_setup`;
        let cleanup_script = appSubscriptsPath + `/${app.service.service_name}_cleanup`;
        let maintenance_file_path = appSubscriptsPath + `/maintenance.html`;

        let script = "#!/bin/bash\n";

        if (app.maintenance) {
          script += `MAINTENANCE=${scriptsPathOnServer}/maintenance.html` + "\n";
          fs.writeFile(maintenance_file_path, app.maintenance.html_code, (err) => {
            if (err) rs({"status":"bad", "data":err});
              exec(`chmod a+x ${maintenance_file_path}`);
          });               
        }

        if (Object.keys(app.service.variables).length > 0) {
          for (let key of app.service.variables) {
            script += key.name.toUpperCase() + `=` + `"${key.value}"` + "\n";
          }
        }

        for (let key in app) {
            if (key !== "createdAt" && key !== "updatedAt" && key !== "id") {
              if (key === "ci_template") {
                let ci_path = appSubscriptsPath + "/" + app.ci_template.name;
                fs.writeFile(ci_path, app.ci_template.yml_code, (err) => {
                });  
                script += key.toUpperCase() + `=${scriptsPathOnServer}/${app.ci_template.name}\n`;                
              } 
               if (app[key] !== null && typeof app[key] !== 'object') {
                script += key.toUpperCase() + `=` + `"${app[key]}"` + "\n";
              }
            }
        }
        script += `project_name=`.toUpperCase() + `"${app.project.project_name}"` + "\n";
        if (app.project.environments &&  Object.keys(app.project.environments).length) {
          script += "ENVIRONMENTS=(";
          for (let env of app.project.environments) {
            script += env + " ";
          }  
          script += ")\n";
        }

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

    async downloadCiScript(app) {
      return new Promise((rs, rj) => {
        let server = app.server;
        let ciPath = path.resolve() + `/public/uploads/builds/${app.project.project_name}/${app.app_name}/`;
        exec(`mkdir -p ${ciPath}`);
        let command = `scp -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/${app.ci_template} ${ciPath}/gitlab-ci.yml; `;
        rs(strapi.services.console.runAppScript(app, command, APP_SETUP_STATUS));
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

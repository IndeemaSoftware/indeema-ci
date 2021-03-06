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
const scriptsPath = resourcesPath + `scripts`;
const subscriptsPath = scriptsPath + `/subscripts`;
const scriptsPathOnServer = `/tmp/indeema_ci`;

const SETUP = "setup";
const CLEANUP = "cleanup";

const APP_SETUP_STATUS = {ok:{status:"success", info:"Setup success"},
                            bad:{status:"failed", info:"Setup failed"},
                            progress:{status:"progress", info:"Setup is in progress"}}

const APP_COPYING_STATUS = {ok:{status:"success", info:"Resource copied to server"},
                            bad:{status:"failed", info:"Resource copying failed"},
                            progress:{status:"progress", info:"Copying resources to server"}}


const APP_CLEANUP_STATUS = {ok:{status:"cleanup_success", info:"Cleanup success"},
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
      // var ci_path = `${path.resolve()}/public/uploads/builds/${app.project.project_name}/${app.app_name}`;

      // if (!fs.existsSync(ci_path)){
      //   fs.mkdirSync(ci_path);
      // }

      const ssh = `ssh -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip} -tt`

      //create dir on remove machine
      let command = `chmod 400 ${publicPath}${server.ssh_key.url}; `;
      // command += `${ssh} "rm -fr ${scriptsPathOnServer}"; `;
      command += ` echo "-->Checking credentials to server";`;
      command += `${ssh} "mkdir -p ${scriptsPathOnServer}"; `;
      command += ` echo "-->Copying all the scripts to server...";`;
      command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${appSubscriptsPath}/* ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/; `;
      command += ` echo "-->Successfully copied all the scripts to server";`;

      let script = scriptsPathOnServer + `/` + app.service.service_name + `_` + name;
      command += `${ssh} "${script}"; `;
      // command += `scp -r -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/${app.ci_template.name} ${ci_path}/gitlab-ci.yml;`;

      // console.log(command);

      let status = await strapi.services.console.runAppScript(app, command, name===SETUP?APP_SETUP_STATUS:APP_CLEANUP_STATUS);
      // strapi.services.app.deleteFolderRecursive(appSubscriptsPath);
      return status;
    },

    generateSubScripts: async (app) => {
      return new Promise((rs, rj) => {
        let appSubscriptsPath = subscriptsPath + `/${app.id}`;
        strapi.services.app.deleteFolderRecursive(appSubscriptsPath);

        if (!fs.existsSync(scriptsPath)){
          fs.mkdirSync(scriptsPath);
        }

        if (!fs.existsSync(subscriptsPath)){
          fs.mkdirSync(subscriptsPath);
        }

        if (!fs.existsSync(appSubscriptsPath)){
          fs.mkdirSync(appSubscriptsPath);
        }

        let setup_script = appSubscriptsPath + `/${app.service.service_name}_setup`;
        let cleanup_script = appSubscriptsPath + `/${app.service.service_name}_cleanup`;
        let maintenance_file_path = appSubscriptsPath + `/maintenance.html`;

        let script = "#!/bin/bash\n";
        script += `PWD=${scriptsPathOnServer}\n`

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
              } else if ((key === 'custom_ssl_key'
                      || key === 'custom_ssl_crt'
                      || key === 'custom_ssl_pem')
                      && app[key]) {
                script += key.toUpperCase() + `=` + `"${app[key].name}"` + "\n";
                exec(`cp ${publicPath}/${app[key].url} ${appSubscriptsPath}/${app[key].name}`);
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
          var install_script_tmp = script + app.service.setup_script;
          fs.writeFile(setup_script, install_script_tmp, (err) => {
            if (err) rs({"status":"bad", "data":err});
              exec(`chmod a+x ${setup_script}`);
              rs();
          });
        }

        if (app.service.cleanup_script) {
          var cleanup_script_tmp = script + app.service.cleanup_script;
          fs.writeFile(cleanup_script, cleanup_script_tmp, (err) => {
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
        var build_path = `${path.resolve()}/public/uploads/builds`;
        var project_path = `${build_path}/${app.project.project_name}`;
        var ci_path = `${project_path}/${app.app_name}`;

        if (!fs.existsSync(build_path)){
          fs.mkdirSync(build_path);
        }

        if (!fs.existsSync(project_path)){
          fs.mkdirSync(project_path);
        }

        if (!fs.existsSync(ci_path)){
          fs.mkdirSync(ci_path);
        }

        let command = `scp -o StrictHostKeyChecking=no -i ${publicPath}${server.ssh_key.url} ${server.ssh_username}@${server.ssh_ip}:${scriptsPathOnServer}/${app.ci_template.name} ${ci_path}/gitlab-ci.yml; `;
        strapi.services.console.runAppScript(app, command, APP_SETUP_STATUS).then(() => {
          rs();
        });
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

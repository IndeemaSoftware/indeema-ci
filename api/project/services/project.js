'use strict';

const fs = require('fs');

//Exec for shell command`s
const exec = require('child_process').exec;

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  /**
   * Make cleanup project
   *
   * @param ctx
   * @returns {Promise<void>}
   */
  cleanupProject: async (project) => {
    const PROJECT_ID = project._id.toString();

    //Remove console output
    const output = await strapi.services.console.find({
      project: PROJECT_ID
    });

    //Clean output
    for(let item of output){
      await strapi.services.console.delete({
        id: item._id.toString()
      });
    }

    //Setup command
    var command = '~/scripts/cleanup_server ';

    //Get path of file
    const path = require('path');
    const filePath = path.resolve() + '/public' + project.ssh_pem.url;

    //Setup pem chmod
    fs.chmodSync(filePath, 400);

    //Add project details
    command += '-n "' + project.project_name + '" ';
    command += '-a "' + project.app_name + '" ';
    command += '-u ' + project.ssh_username + ' ';
    command += '-d ' + project.ssh_host + ' ';
    command += '-s ' + filePath + ' ';

    if(project.domain_name)
      command += '-b ' + project.domain_name + ' ';
    else
      command += '-b ' + project.ssh_host + ' ';

    //Start cleanup program
    return new Promise((rs, rj) => {

      const commandExec = exec(command);
      commandExec.stdout.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'message',
            project: PROJECT_ID
          });

          //Set status project
          await strapi.services.project.update({
            id: PROJECT_ID
          }, {
            project_status: 'cleanup'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${PROJECT_ID}/message`,
            data: consoleItem.message
          });
        }
      });
      commandExec.stderr.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'error',
            project: PROJECT_ID
          });

          //Set status project
          await strapi.services.project.update({
            id: PROJECT_ID
          }, {
            project_status: 'cleanup_failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${PROJECT_ID}/error`,
            data: consoleItem.message
          });
        }
      });
      commandExec.on('close', async (code) => {
        const consoleItem = await strapi.services.console.create({
          message: `Child process exited with code ${code}`,
          type: 'end',
          project: PROJECT_ID
        });
        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${PROJECT_ID}/end`,
          data: consoleItem.message
        });

        if(code !== 0){
          await strapi.services.console.create({
            message: `Cleanup failed`,
            type: 'build_error',
            project: PROJECT_ID
          });

          //Set status project
          await strapi.services.project.update({
            id: PROJECT_ID
          }, {
            project_status: 'cleanup_failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${PROJECT_ID}/build_error`,
            data: `Cleanup failed failed`
          });

          rs(false);
        }else{
          const consoleItem = await strapi.services.console.create({
            message: `Cleanup success!`,
            type: 'build_success',
            project: PROJECT_ID
          });

          //Set status project
          await strapi.services.project.update({
            id: PROJECT_ID
          }, {
            project_status: 'cleanup_success'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${PROJECT_ID}/build_success`,
            data: consoleItem.message
          });

          rs(true);
        }
      });

    });
  }
};

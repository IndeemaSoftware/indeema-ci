'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');

//Exec for shell command`s
const exec = require('child_process').exec;

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
   * Get project output console
   *
   * @param ctx
   * @returns {Promise<void>}
   */
  getProjectConsole: async (ctx) => {
    const user = ctx.state.user;

    const entity = await strapi.services.project.findOne(ctx.params);

    //For non admin roles
    if(user.role.type !== 'administrator' && (!entity.user || entity.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    const output = await strapi.services.console.find({
      project: entity._id.toString()
    });

    return sanitizeEntity(output, { model: strapi.models.console });
  },

  /**
   * Get project output console
   *
   * @param ctx
   * @returns {Promise<void>}
   */
  getAppConsole: async (ctx) => {
    const user = ctx.state.user;

    const entity = await strapi.services.app.findOne(ctx.params);
    if(!entity.project)
      return ctx.notFound();

    const project = await strapi.services.project.findOne({
      _id: entity.project._id.toString()
    });

    //For non admin roles
    if(user.role.type !== 'administrator' && (!project.user || project.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    //For non admin roles
    if(user.role.type !== 'administrator' && (!entity.user || entity.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    const output = await strapi.services.console.find({
      app: entity._id.toString(),
      _limit: 9999999999
    });

    return sanitizeEntity(output, { model: strapi.models.console });
  },

  /**
   * Start setup app
   * @param ctx
   * @returns {Promise<void>}
   */
  setupApp: async (ctx) => {
    const user = ctx.state.user;

    const entity = await strapi.services.app.findOne({
      id: ctx.params.app_id
    });
    if(!entity.project || (entity.project._id.toString() !== ctx.params.id))
      return ctx.notFound();

    const project = await strapi.services.project.findOne({
      _id: entity.project._id.toString()
    });

    //For non admin roles
    if(user.role.type !== 'administrator' && (!project.user || project.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    const output = await strapi.services.console.find({
      app: entity._id.toString()
    });

    //Clean output
    for(let item of output){
      await strapi.services.console.delete({
        id: item._id.toString()
      });
    }

    //Setup command
    var command = '~/scripts/setup_server ';

    //One line command for setup repos
    if(entity.server_dependencies && entity.server_dependencies.length){

      //Also prepare list for packages names
      const packagesNames = [];

      //Prepare string
      command += '-r "';
      for(let item of entity.server_dependencies){
        if(item.repo !== '')
          command += item.repo + '; ';

        packagesNames.push(item.package);
      }
      command += '" ';

      if(packagesNames.length){
        command += '-i "';
        for(let name of packagesNames){
          command += name + ' ';
        }
        command +='" ';
      }
    }

    //Node packages
    if(entity.nodejs_dependencies && entity.nodejs_dependencies.length){
      command += '-j "';
      for(let pack of entity.nodejs_dependencies){
        command += pack.name + ' ';
      }
      command +='" ';
    }

    //Get path of file
    const path = require('path');
    const filePath = (entity.ssh_pem && entity.ssh_pem.url)? path.resolve() + '/public' + entity.ssh_pem.url : null;

    //Setup pem chmod
    if(filePath)
      fs.chmodSync(filePath, 400);

    //Add project details
    command += '-n "' + project.project_name + '" ';
    command += '-a "' + entity.app_name + '" ';
    command += '-f ' + entity.project_type.value + ' ';
    command += '-p ' + entity.app_port + ' ';
    if(entity.avaliable_ports)
      command += '-w "' + entity.avaliable_ports + '" ';
    if(entity.ssh_username)
      command += '-u ' + entity.ssh_username + ' ';
    if(filePath)
      command += '-s ' + filePath + ' ';
    if(entity.ssh_host)
      command += '-d ' + entity.ssh_host + ' ';

    if(entity.environment){
      if(entity.environment === 'development')
        command += '-z 0 ';

      if(entity.environment === 'staging')
        command += '-z 1 ';

      if(entity.environment === 'production')
        command += '-z 3 ';
    }

    //SSL params
    if(entity.domain_name)
      command += '-b ' + entity.domain_name + ' ';

    if(entity.lets_encrypt)
      command += '-e 1 ';
    else
      command += '-e 0 ';

    if(entity.custom_ssl_key && entity.custom_ssl_crt && entity.custom_ssl_pem)
      command += `-c "${path.resolve() + '/public' + entity.custom_ssl_key.url} ${path.resolve() + '/public' + entity.custom_ssl_crt.url} ${path.resolve() + '/public' + entity.custom_ssl_pem.url}" `

    const APP_ID = entity._id.toString();


    //Prepare CI command
    let ciCommand = '~/scripts/generate_gitlab_ci_config ';
    if(entity.ssh_username)
      ciCommand += '-u ' + entity.ssh_username + ' ';
    if(entity.ssh_host)
      ciCommand += '-d ' + entity.ssh_host + ' ';

    ciCommand += '-n "' + project.project_name + '" ';
    ciCommand += '-a "' + entity.app_name + '" ';
    ciCommand += '-f ' + entity.project_type.value + ' ';
    if(entity.app_port)
      ciCommand += '-p ' + entity.app_port + ' ';

    if(entity.environment){
      if(entity.environment === 'development')
        ciCommand += '-z 0 ';

      if(entity.environment === 'staging')
        ciCommand += '-z 1 ';

      if(entity.environment === 'production')
        ciCommand += '-z 3 ';
    }

    if(entity.os === 'aws_s3' && entity.s3_bucket_name)
      ciCommand += '-s "' + entity.s3_bucket_name + '" ';

    //Exec command
    if(entity.os !== 'aws_s3'){

      const commandConnect = exec(`~/scripts/connect_runner ${filePath} ~/.ssh/gitlab-runner-shared-id-rsa.pub ${entity.ssh_username}@${entity.ssh_host}`);
      commandConnect.stdout.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'message',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'progress'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/message`,
            data: consoleItem.message
          });
        }
      });
      commandConnect.stderr.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'error',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/error`,
            data: consoleItem.message
          });
        }
      });
      commandConnect.on('close', async function(code){
        const consoleItem = await strapi.services.console.create({
          message: `Child process exited with code ${code}`,
          type: 'end',
          app: APP_ID
        });
        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${APP_ID}/end`,
          data: consoleItem.message
        });

        if(code !== 0) {
          const consoleItem = await strapi.services.console.create({
            message: `Setup failed`,
            type: 'build_error',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/build_error`,
            data: consoleItem.message
          });
        }else{
          const consoleItem = await strapi.services.console.create({
            message: `Server was connected to runner successfully!`,
            type: 'build_success',
            app: APP_ID
          });
          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/build_success`,
            data: consoleItem.message
          });

          //Start main program
          const commandExec = exec(command);
          await strapi.services.console.create({
            message: `Start server setup script: ${command}`,
            type: 'message',
            app: APP_ID
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/message`,
            data: `Start server setup script: ${ciCommand}`
          });
          commandExec.stdout.on('data', async function(data){
            if(data !== ''){
              const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'message',
                app: APP_ID
              });

              //Set status project
              await strapi.services.app.update({
                id: APP_ID
              }, {
                app_status: 'progress'
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/message`,
                data: consoleItem.message
              });
            }
          });
          commandExec.stderr.on('data', async function(data){
            if(data !== ''){
              const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'error',
                app: APP_ID
              });

              //Set status project
              await strapi.services.app.update({
                id: APP_ID
              }, {
                app_status: 'failed'
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/error`,
                data: consoleItem.message
              });
            }
          });
          commandExec.on('close', async (code) => {
            const consoleItem = await strapi.services.console.create({
              message: `Child process exited with code ${code}`,
              type: 'end',
              app: APP_ID
            });
            //Send message
            strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${APP_ID}/end`,
              data: consoleItem.message
            });

            if(code !== 0){
              await strapi.services.console.create({
                message: `Setup failed`,
                type: 'build_error',
                app: APP_ID
              });

              //Set status project
              await strapi.services.app.update({
                id: APP_ID
              }, {
                app_status: 'failed'
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/build_error`,
                data: `Setup failed`
              });
            }else{

              //Generate CI template file
              const commandExec = exec(ciCommand);
              const consoleItem = await strapi.services.console.create({
                message: `Generate CI Template Command: ${ciCommand}`,
                type: 'message',
                app: APP_ID
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/message`,
                data: `Generate CI Template Command: ${ciCommand}`
              });
              commandExec.stdout.on('data', async function(data){
                if(data !== ''){
                  const consoleItem = await strapi.services.console.create({
                    message: data,
                    type: 'message',
                    app: APP_ID
                  });

                  //Set status project
                  await strapi.services.app.update({
                    id: APP_ID
                  }, {
                    app_status: 'progress'
                  });

                  //Send message
                  strapi.eventEmitter.emit('system::notify', {
                    topic: `/console/setup/${APP_ID}/message`,
                    data: consoleItem.message
                  });
                }
              });
              commandExec.stderr.on('data', async function(data){
                if(data !== ''){
                  const consoleItem = await strapi.services.console.create({
                    message: data,
                    type: 'error',
                    app: APP_ID
                  });

                  //Set status project
                  await strapi.services.app.update({
                    id: APP_ID
                  }, {
                    app_status: 'failed'
                  });

                  //Send message
                  strapi.eventEmitter.emit('system::notify', {
                    topic: `/console/setup/${APP_ID}/error`,
                    data: consoleItem.message
                  });
                }
              });
              commandExec.on('close', async (code) => {
                const consoleItem = await strapi.services.console.create({
                  message: `Child process exited with code ${code}`,
                  type: 'end',
                  app: APP_ID
                });
                //Send message
                strapi.eventEmitter.emit('system::notify', {
                  topic: `/console/setup/${APP_ID}/end`,
                  data: consoleItem.message
                });

                if(code !== 0){
                  await strapi.services.console.create({
                    message: `Setup failed`,
                    type: 'build_error',
                    app: APP_ID
                  });

                  //Set status project
                  await strapi.services.app.update({
                    id: APP_ID
                  }, {
                    app_status: 'failed'
                  });

                  //Send message
                  strapi.eventEmitter.emit('system::notify', {
                    topic: `/console/setup/${APP_ID}/build_error`,
                    data: `Setup failed`
                  });
                }else{
                  const consoleItem = await strapi.services.console.create({
                    message: `Setup success!`,
                    type: 'build_success',
                    app: APP_ID
                  });

                  //Set status project
                  await strapi.services.app.update({
                    id: APP_ID
                  }, {
                    app_status: 'success'
                  });

                  //Send message
                  strapi.eventEmitter.emit('system::notify', {
                    topic: `/console/setup/${APP_ID}/build_success`,
                    data: consoleItem.message
                  });
                }
              });
            }
          });
        }
      });
    }else{
      let s3Command = `~/scripts/setup_s3 -s ${entity.s3_bucket_name} -k ${entity.aws_secret_access_key} -i ${entity.aws_access_key_id} `;
      if(entity.domain_name)
        s3Command += `-b ${entity.domain_name} `;

      s3Command += (entity.s3_https)? '-p https ' : '-p http ';

      if(entity.s3_region)
        s3Command += `-r ${entity.s3_region} `;

      //Generate CI template file
      const commandExec = exec(s3Command);
      const consoleItem = await strapi.services.console.create({
        message: `AWS S3 Configuration: ${ciCommand}`,
        type: 'message',
        app: APP_ID
      });

      //Send message
      strapi.eventEmitter.emit('system::notify', {
        topic: `/console/setup/${APP_ID}/message`,
        data: `Generate CI Template Command: ${ciCommand}`
      });
      commandExec.stdout.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'message',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'progress'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/message`,
            data: consoleItem.message
          });
        }
      });
      commandExec.stderr.on('data', async function(data){
        if(data !== ''){
          const consoleItem = await strapi.services.console.create({
            message: data,
            type: 'error',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/error`,
            data: consoleItem.message
          });
        }
      });
      commandExec.on('close', async (code) => {
        const consoleItem = await strapi.services.console.create({
          message: `Child process exited with code ${code}`,
          type: 'end',
          app: APP_ID
        });
        //Send message
        strapi.eventEmitter.emit('system::notify', {
          topic: `/console/setup/${APP_ID}/end`,
          data: consoleItem.message
        });

        if(code !== 0){
          await strapi.services.console.create({
            message: `Setup failed`,
            type: 'build_error',
            app: APP_ID
          });

          //Set status project
          await strapi.services.app.update({
            id: APP_ID
          }, {
            app_status: 'failed'
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/build_error`,
            data: `Setup failed`
          });
        }else{
          //Generate CI template file
          const commandExec = exec(ciCommand);
          const consoleItem = await strapi.services.console.create({
            message: `Generate CI Template Command: ${ciCommand}`,
            type: 'message',
            app: APP_ID
          });

          //Send message
          strapi.eventEmitter.emit('system::notify', {
            topic: `/console/setup/${APP_ID}/message`,
            data: `Generate CI Template Command: ${ciCommand}`
          });
          commandExec.stdout.on('data', async function(data){
            if(data !== ''){
              const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'message',
                app: APP_ID
              });

              //Set status project
              await strapi.services.app.update({
                id: APP_ID
              }, {
                app_status: 'progress'
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/message`,
                data: consoleItem.message
              });
            }
          });
          commandExec.stderr.on('data', async function(data){
            if(data !== ''){
              const consoleItem = await strapi.services.console.create({
                message: data,
                type: 'error',
                app: APP_ID
              });

              //Set status project
              await strapi.services.app.update({
                id: APP_ID
              }, {
                app_status: 'failed'
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/error`,
                data: consoleItem.message
              });
            }
          });
          commandExec.on('close', async (code) => {
            const consoleItem = await strapi.services.console.create({
              message: `Child process exited with code ${code}`,
              type: 'end',
              app: APP_ID
            });
            //Send message
            strapi.eventEmitter.emit('system::notify', {
              topic: `/console/setup/${APP_ID}/end`,
              data: consoleItem.message
            });

            if(code !== 0){
              await strapi.services.console.create({
                message: `Setup failed`,
                type: 'build_error',
                app: APP_ID
              });

              //Set status project
              await strapi.services.app.update({
                id: APP_ID
              }, {
                app_status: 'failed'
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/build_error`,
                data: `Setup failed`
              });
            }else{
              const consoleItem = await strapi.services.console.create({
                message: `Setup success!`,
                type: 'build_success',
                app: APP_ID
              });

              //Set status project
              await strapi.services.app.update({
                id: APP_ID
              }, {
                app_status: 'success'
              });

              //Send message
              strapi.eventEmitter.emit('system::notify', {
                topic: `/console/setup/${APP_ID}/build_success`,
                data: consoleItem.message
              });
            }
          });
        }
      });
    }

    return {ok: true};
  }
};

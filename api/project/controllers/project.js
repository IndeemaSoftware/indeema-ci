'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');
const _ = require('lodash');

/**
 * default bookshelf controller
 *
 */
module.exports = {
  /**
   * Download yml file of project
   * @param ctx
   * @returns {Promise<void>}
   */
  async downloadYmlProject(ctx){
    const entity = await strapi.services.project.findOne(ctx.params);

    //Get path of file
    const path = require('path');
    const filePath = path.resolve() + `/public/uploads/builds/${entity.project_name}/${entity.app_name}/.gitlab-ci.yml`;
    if(!fs.existsSync(filePath))
      return ctx.notFound();

    ctx.body = fs.createReadStream(filePath);
    ctx.attachment(filePath);
  },


  /**
   * Find projects records.
   *
   * @return {Object|Array}
   */

  async findProjects(ctx) {
    const user = ctx.state.user;
    const query = ctx.query;

    //For non admin roles
    if(user.role.type !== 'administrator')
      query.users = [user._id.toString()];

    let entities;
    if (query._q) {
      entities = await strapi.services.project.search(query);
    } else {
      entities = await strapi.services.project.find(query);
    }

    for (var e = 0; e < entities.length; e++) {
      if(entities[e].apps && entities[e].apps.length){
        for(var i = 0; i < entities[e].apps.length; i++){
          const app = await strapi.services.app.findOne({
            id: entities[e].apps[i]._id.toString()
          });
          entities[e].apps[i] = sanitizeEntity(app, { model: strapi.models.app });
        }
      }
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.project }));
  },

  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  async findProject(ctx) {
    const user = ctx.state.user;
    var isPermited = false;

    const entity = await strapi.services.project.findOne({id:ctx.params.id});
    if (entity.users.length) {
      for (let u of entity.users) {
        if (u._id.toString() === user._id.toString()) {
          isPermited = true;
        }
      }
    }
    //For non admin roles
    if(user.role.type !== 'administrator' && !isPermited)
      return ctx.notFound();

    if(entity.apps && entity.apps.length){
      for(var i = 0; i < entity.apps.length; i++){
        const app = await strapi.services.app.findOne({
          id: entity.apps[i]._id.toString()
        });
        entity.apps[i] = sanitizeEntity(app, { model: strapi.models.app });
      }
    }

    return sanitizeEntity(entity, { model: strapi.models.project });
  },

  /**
   * Create new project entity.
   *
   * @return {Object}
   */

  async newProject(ctx) {
    const user = ctx.state.user;

    ctx.request.body.user = user._id;

    if(!ctx.request.body.apps || (ctx.request.body.apps && !ctx.request.body.apps.length))
      return ctx.badRequest(null, 'Apps is required');

    //Prepare project model and create
    const projectModel = _.pick(ctx.request.body, ['users','project_name', 'desc', 'environments', 'user']);
    projectModel.apps = [];
    const project = await strapi.services.project.create(projectModel);

    //Prepare apps model and create
    for (let app of ctx.request.body.apps) {
      const appModelFields = ['app_name', 'app_port', 'desc', 'avaliable_ports', 'environment', 'custom_ssl_key', 'custom_ssl_crt', 'custom_ssl_pem', 'domain_name', 'custom_cert', 'ci_template', 'ci_script', 'server', 'service', 'maintenance', 'automatic_cert','isSecure'];
      const appModel = _.pick(app, appModelFields);
      appModel.project = project._id.toString();

      //Cleanup empty fields
      for (let field of appModelFields) {
        if (!appModel[field] && typeof appModel[field] !== typeof true)
          delete appModel[field];
      }

      //Create new app
      await strapi.services.app.create(appModel);
    }

    return sanitizeEntity(project, { model: strapi.models.project });
  },

  /**
   * Update project record.
   *
   * @return {Object}
   */

  async updateProject(ctx) {
    let entity;
    const user = ctx.state.user;

    //Check project owner
    const project = await strapi.services.project.findOne(ctx.params);

    // //For non admin roles
    // if(user.role.type !== 'administrator' && (!project.user || project.user._id.toString() !== user._id.toString()))
    //   return ctx.notFound();

    //First let`s update project model
    ctx.request.body.user = user._id;
    const projectModel = _.pick(ctx.request.body, ['users', 'project_name', 'desc', 'environments', 'user']);
    entity = await strapi.services.project.update(ctx.params, projectModel);

    //Find all apps and remove not needed apps
    const deletedApps = [];
    for(let projectApp of project.apps){
      let appFound = false;
      for(let apps of ctx.request.body.apps){
        if(apps.id && apps.id === projectApp._id.toString()){
          appFound = true;
          break
        }
      }
      if(!appFound){
        deletedApps.push(projectApp._id.toString());
      }
    }

    //Remove all deleted apps
    for(let id of deletedApps){
      await strapi.services.app.delete({
        id: id
      });
    }

    //Update all apps from body
    for(let app of ctx.request.body.apps){
      const appModelFields = ['app_name', 'app_port', 'desc', 'avaliable_ports', 'environment', 'custom_ssl_key', 'custom_ssl_crt', 'custom_ssl_pem', 'domain_name', 'custom_cert', 'ci_template', 'ci_script', 'server', 'service', 'maintenance', 'automatic_cert', 'isSecure'];
      const appModel = _.pick(app, appModelFields);
      appModel.project = project._id.toString();

      //Cleanup empty fields
      for(let field of appModelFields){
        if(!appModel[field] && typeof appModel[field] !== typeof true){
          if(field === 'ssh_pem' || field === 'custom_ssl_key' ||  field === 'custom_ssl_crt' || field === 'custom_ssl_pem')
            delete appModel[field];
        }
      }

      //Create new app
      if(app.id){
        await strapi.services.app.update({
          id: app.id
        }, appModel);
      }else{
        await strapi.services.app.create(appModel);
      }
    }

    return sanitizeEntity(entity, { model: strapi.models.project });
  },
  /**
   * Destroy app record of project.
   *
   * @return {Object}
   */

  async deleteApp(ctx) {
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
    if(user.role.type !== 'administrator'){
      let isOwner = false;

      for(let user of project.users){
        if(!project.user || project.user._id.toString() !== user._id.toString()){
          isOwner = true;
          break;
        }
      }

      if(!isOwner)
        return ctx.notFound();
    }

    const deletedApp = await strapi.services.app.delete({
      id: entity._id.toString()
    });
    return sanitizeEntity(deletedApp, { model: strapi.models.app });
  },

  /**
   * Destroy project record.
   *
   * @return {Object}
   */

  async deleteProject(ctx) {
    const user = ctx.state.user;

    //Check project owner
    const project = await strapi.services.project.findOne(ctx.params);

    //For non admin roles
    if(user.role.type !== 'administrator'){
      let isOwner = false;

      for(let user of project.users){
        if(!project.user || project.user._id.toString() !== user._id.toString()){
          isOwner = true;
          break;
        }
      }

      if(!isOwner)
        return ctx.notFound();
    }

    //Make cleanup
    for(let appProject of project.apps){
      await strapi.services.app.delete({
        id: appProject._id.toString()
      });
    }

    const entity = await strapi.services.project.delete({
      id: project._id.toString()
    });
    return sanitizeEntity(project, { model: strapi.models.project });
  },

};

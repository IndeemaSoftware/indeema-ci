'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');

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
    const filePath = path.resolve() + `/public/uploads/builds/${entity.project_name}/${entity.app_name}/gitlab-ci.yml`;
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
      query.user = user._id.toString();

    let entities;
    if (query._q) {
      entities = await strapi.services.project.search(query);
    } else {
      entities = await strapi.services.project.find(query);
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

    const entity = await strapi.services.project.findOne(ctx.params);

    //For non admin roles
    if(user.role.type !== 'administrator' && (!entity.user || entity.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    return sanitizeEntity(entity, { model: strapi.models.project });
  },

  /**
   * Create new project entity.
   *
   * @return {Object}
   */

  async newProject(ctx) {
    const user = ctx.state.user;

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      data.user = user._id;
      entity = await strapi.services.project.create(data, { files });
    } else {

      if(typeof ctx.request.body.server_dependencies !== typeof [])
        ctx.request.body.server_dependencies = [];

      if(typeof ctx.request.body.nodejs_dependencies !== typeof [])
        ctx.request.body.nodejs_dependencies = [];

      ctx.request.body.user = user._id;
      entity = await strapi.services.project.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.project });
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

    //For non admin roles
    if(user.role.type !== 'administrator' && (!project.user || project.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.project.update(ctx.params, data, { files });
    } else {
      entity = await strapi.services.project.update(ctx.params, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models.project });
  },

  /**
   * Cleanup project
   * @param ctx
   * @returns {Promise<void>}
   */
  async cleanupProject(ctx){
    const user = ctx.state.user;

    //Check project owner
    const project = await strapi.services.project.findOne(ctx.params);

    //For non admin roles
    if(user.role.type !== 'administrator' && (!project.user || project.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    //Start cleanup
    await strapi.services.project.update({
      id: project._id.toString()
    }, {
      project_status: 'cleanup'
    });
    strapi.services.project.cleanupProject(project);

    ctx.send({ok: true});
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
    if(user.role.type !== 'administrator' && (!project.user || project.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    //Start cleanup
    await strapi.services.project.update({
      id: project._id.toString()
    }, {
      project_status: 'cleanup'
    });
    const isCleanup = await strapi.services.project.cleanupProject(project);

    if(isCleanup){
      const entity = await strapi.services.project.delete(ctx.params);
      return sanitizeEntity(entity, { model: strapi.models.project });
    }else{
      return ctx.send({ok: false});
    }
  },

};

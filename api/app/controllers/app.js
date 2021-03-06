'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async findAll(ctx) {
    const user = ctx.state.user;
    const query = ctx.query;

    //For non admin roles
    if(user.role.type !== 'administrator')
      query.users = [user._id.toString()];

    let entities;
    if (query._q) {
      entities = await strapi.services.apps.search(query);
    } else {
      entities = await strapi.services.app.find(query);
    }
  
    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.app }));
  },

  /**
   * Download yml file of app
   * @param ctx
   * @returns {Promise<void>}
   */
  async downloadYmlApp(ctx){
    const entity = await strapi.services.app.findOne({id:ctx.params.id});
    if(!entity.project)
      return ctx.notFound(entity);

    await strapi.services.app.downloadCiScript(entity);

    const project = await strapi.services.project.findOne({
      id: entity.project._id.toString()
    });

    //Get path of file
    const path = require('path');
    const filePath = path.resolve() + `/public/uploads/builds/${project.project_name}/${entity.app_name}/gitlab-ci.yml`;
    if(!fs.existsSync(filePath))
      return ctx.notFound();

    ctx.body = fs.createReadStream(filePath);
    ctx.attachment(filePath);
  },


  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  async findApp(ctx) {
    const user = ctx.state.user;

    const entity = await strapi.services.app.findOne(ctx.params);
    if(!entity.project)
      return ctx.notFound();

    const project = await strapi.services.project.findOne({
      _id: entity.project._id.toString()
    });

    return sanitizeEntity(entity, { model: strapi.models.app });
  },

  setup: async (ctx) => {
    const app = await strapi.services.app.findOne({"id":ctx.params.id});
    if(!app || !app.service)
      return ctx.notFound();

    const output = await strapi.services.console.find({
      app: app._id.toString(),
      _limit: 9999999999
    });

    //Clean output
    for(let item of output){
      await strapi.services.console.delete({
        id: item._id.toString()
      });
    }

    return strapi.services.app.setupApp(app);
  },
  cleanup: async (ctx) => {
    const app = await strapi.services.app.findOne({"id":ctx.params.id});
    if(!app || !app.service)
      return ctx.notFound();

    const output = await strapi.services.console.find({
      app: app._id.toString(),
      _limit: 9999999999
    });

    //Clean output
    for(let item of output){
      await strapi.services.console.delete({
        id: item._id.toString()
      });
    }

    return strapi.services.app.cleanupApp(app);
  },
};

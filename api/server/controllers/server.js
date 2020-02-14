'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const fs = require('fs');
const _ = require('lodash');

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
      query.user = user._id.toString();

    let entities;
    if (query._q) {
      entities = await strapi.services.server.search(query);
    } else {
      entities = await strapi.services.server.find(query);
    }
  
    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.server }));
  },

  async findServer(ctx) {
    const user = ctx.state.user;

    const entity = await strapi.services.server.findOne({id:ctx.params.id});
    if(!entity.platform)
    return ctx.notFound();

    //For non admin roles
    if(user.role.type !== 'administrator' && (!entity.user || entity.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    return sanitizeEntity(entity, { model: strapi.models.server });
  },

  setup: async (ctx) => {
    const server = await strapi.services.server.findOne({"id":ctx.params.id});
    if(!server.platform)
      return ctx.notFound();

    const output = await strapi.services.console.find({
      app: server._id.toString(),
      _limit: 9999999999
    });

    //Clean output
    for(let item of output){
      await strapi.services.console.delete({
        id: item._id.toString()
      });
    }

    return strapi.services.server.setupServer(server);
  },

  async cleanup(ctx) {
    const user = ctx.state.user;

    const server = await strapi.services.server.findOne({id:ctx.params.id});
    if(!server.platform)
    return ctx.notFound();

    //For non admin roles
    if(user.role.type !== 'administrator' && (!server.user || server.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    return strapi.services.server.cleanupServer(server);
  }
};

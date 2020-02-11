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

    const entity = await strapi.services.server.findOne(ctx.params);

    //For non admin roles
    if(user.role.type !== 'administrator' && (!entity.user || entity.user._id.toString() !== user._id.toString()))
      return ctx.notFound();

    return sanitizeEntity(entity, { model: strapi.models.server });
  }
};

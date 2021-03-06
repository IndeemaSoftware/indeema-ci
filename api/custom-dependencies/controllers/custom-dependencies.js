'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

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
            entities = await strapi.query('custom-dependencies').search(query);
            // entities = await strapi.services.server-dependencies.search(query);
        } else {
            entities = await strapi.query('custom-dependencies').find(query);
            // entities = await strapi.services.server-dependencies.find(query);
        }
      
        // return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.server-dependencies }));
        return entities.map(entity => sanitizeEntity(entity, { model: strapi.query('custom-dependencies').model }));
      },
};

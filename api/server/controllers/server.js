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
    
        for(var e = 0; e < entities.length; e++){
          if(entities[e].apps && entities[e].apps.length){
            for(var i = 0; i < entities[e].apps.length; i++){
              const app = await strapi.services.app.findOne({
                id: entities[e].apps[i]._id.toString()
              });
              entities[e].apps[i] = sanitizeEntity(app, { model: strapi.models.app });
            }
          }
        }
    
        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.server }));
    }
};

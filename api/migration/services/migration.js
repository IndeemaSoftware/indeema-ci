'use strict';

const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const publicPath = path.resolve() + "/public";
const resourcesPath = publicPath + "/uploads/scripts/"
const subscriptsPath = resourcesPath + "migration";

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async prepareCiTemplates(ctx) {
        const user = ctx.state.user;
        const query = ctx.query;

        //For non admin roles
        if(user.role.type !== 'administrator')
          query.users = [user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('ci-templates').search(query);
        } else {
            entities = await strapi.query('ci-templates').find(query);
        }

        var script = `${subscriptsPath}/${user._id.toString()}` + `/ci-templates`;
        var data = [];

        for (let v of entities) {
            data.push(
                {
                    name:v.name,
                    yml_code: v.yml_code
                }
            );
        }

        //generating server dependency script files
        if (data) {
          fs.writeFile(script, JSON.stringify(data), (err) => {
          });
        }
    },

    async importCiTemplates(ctx, id, moduleId) {
        var fileName = `${subscriptsPath}/${id}/ci-templates`;
        fs.readFile(fileName, function read(err, data) {
            if (err) {
                console.log(err);
            } else {
                const content = JSON.parse(data);
                for (var t of content) {
                    t.users = [ctx.state.user.id];
                    t.module = moduleId;
                    strapi.query('ci-templates').create(t);
                }
            }
        });
    },

    async isUsedCiTemplates(ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        var apps = [];

        let entities;
        if (query._q) {
            entities = await strapi.query('ci-templates').search(query);
        } else {
            entities = await strapi.query('ci-templates').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                Array.prototype.push.apply(apps, t.apps);
            }
        }

        return apps;
    },

    async uninstallCiTemplates(ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('ci-templates').search(query);
        } else {
            entities = await strapi.query('ci-templates').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                strapi.query('ci-templates').delete({id:t.id});
            }
        }
    },

    async prepareCustomDependencies(ctx) {
        const user = ctx.state.user;
        const query = ctx.query;

        //For non admin roles
        if(user.role.type !== 'administrator')
          query.users = [user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('custom-dependencies').search(query);
        } else {
            entities = await strapi.query('custom-dependencies').find(query);
        }

        var script = `${subscriptsPath}/${user._id.toString()}` + `/custom-dependencies`;
        var data = [];

        for (let v of entities) {
            data.push(
                {
                    name:v.name,
                    label: v.label,
                    install_script: v.install_script
                }
            );
        }

        //generating server dependency script files
        if (data) {
          fs.writeFile(script, JSON.stringify(data), (err) => {
          });
        }
    },

    async importCustomDependencies (ctx, id, moduleId) {
        var fileName = `${subscriptsPath}/${id}/custom-dependencies`;
        fs.readFile(fileName, function read(err, data) {
            if (err) {
                console.log(err);
            } else {
                const content = JSON.parse(data);
                for (var t of content) {
                    t.users = [ctx.state.user.id];
                    t.module = moduleId;
                    strapi.query('custom-dependencies').create(t);
                }
            }
        });
    },

    async isUsedCustomDependencies(ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];
        var servers = [];

        let entities;
        if (query._q) {
            entities = await strapi.query('custom-dependencies').search(query);
        } else {
            entities = await strapi.query('custom-dependencies').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                Array.prototype.push.apply(servers, t.servers)
            }
        }

        return servers;
    },

    async uninstallCustomDependencies (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('custom-dependencies').search(query);
        } else {
            entities = await strapi.query('custom-dependencies').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                strapi.query('custom-dependencies').delete({id:t.id});
            }
        }
    },

    async prepareMaintenance (ctx) {
        const user = ctx.state.user;
        const query = ctx.query;

        //For non admin roles
        if(user.role.type !== 'administrator')
          query.users = [user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('maintenance').search(query);
        } else {
            entities = await strapi.query('maintenance').find(query);
        }

        var script = `${subscriptsPath}/${user._id.toString()}` + `/maintenance`;
        var data = [];

        for (let v of entities) {
            data.push(
                {
                    name: v.name,
                    html_code: v.html_code
                }
            );
        }

        //generating server dependency script files
        if (data) {
          fs.writeFile(script, JSON.stringify(data), (err) => {
          });
        }
    },

    async importMaintenance (ctx, id, moduleId) {
        var fileName = `${subscriptsPath}/${id}/maintenance`;
        fs.readFile(fileName, function read(err, data) {
            if (err) {
                console.log(err);
            } else {
                const content = JSON.parse(data);
                for (var t of content) {
                    t.users = [ctx.state.user.id];
                    t.module = moduleId;
                    strapi.query('maintenance').create(t);
                }
            }
        });
    },

    async isUsedMaintenance (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        var apps = [];

        let entities;
        if (query._q) {
            entities = await strapi.query('maintenance').search(query);
        } else {
            entities = await strapi.query('maintenance').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                Array.prototype.push.apply(apps, t.apps);
            }
        }

        return apps;
    },

    async uninstallMaintenance (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('maintenance').search(query);
        } else {
            entities = await strapi.query('maintenance').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                strapi.query('maintenance').delete({id:t.id});
            }
        }
    },

    async preparePlatform (ctx) {
        const user = ctx.state.user;
        const query = ctx.query;

        //For non admin roles
        if(user.role.type !== 'administrator')
          query.users = [user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('platform').search(query);
        } else {
            entities = await strapi.query('platform').find(query);
        }

        var script = `${subscriptsPath}/${user._id.toString()}` + `/platform`;
        var data = [];

        for (let v of entities) {
            data.push(
                {
                    platform_name: v.platform_name,
                    setup_script: v.setup_script,
                    cleanup_script: v.cleanup_script,
                    doc: v.doc,
                    variables: v.variables
                }
            );
        }

        //generating server dependency script files
        if (data) {
          fs.writeFile(script, JSON.stringify(data), (err) => {
          });
        }
    },

    async importPlatform (ctx, id, moduleId) {
        var fileName = `${subscriptsPath}/${id}/platform`;
        fs.readFile(fileName, function read(err, data) {
            if (err) {
                console.log(err);
            } else {
                const content = JSON.parse(data);
                for (var t of content) {
                    t.users = [ctx.state.user.id];
                    t.module = moduleId;
                    strapi.query('platform').create(t);
                }
            }
        });
    },

    async isUsedPlatform (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        var servers = [];

        let entities;
        if (query._q) {
            entities = await strapi.query('platform').search(query);
        } else {
            entities = await strapi.query('platform').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                Array.prototype.push.apply(servers, t.servers);
            }
        }

        console.log(servers);

        return servers;
    },

    async uninstallPlatform (ctx, id, moduleId) {
      const query = ctx.query;
      query.users = [ctx.state.user._id.toString()];

      let entities;
      if (query._q) {
          entities = await strapi.query('platform').search(query);
      } else {
          entities = await strapi.query('platform').find(query);
      }

      for (var t of entities) {
          if (t.module === moduleId) {
              strapi.query('platform').delete({id:t.id});
          }
      }
    },

    async prepareServerDependencies (ctx) {
        const user = ctx.state.user;
        const query = ctx.query;

        //For non admin roles
        if(user.role.type !== 'administrator')
          query.users = [user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('server-dependencies').search(query);
        } else {
            entities = await strapi.query('server-dependencies').find(query);
        }

        var script = `${subscriptsPath}/${user._id.toString()}` + `/server-dependencies`;
        var data = [];

        for (let v of entities) {
            data.push(
                {
                    pre_install_script: v.pre_install_script,
                    post_install_script: v.post_install_script,
                    name: v.name,
                    label: v.label,
                    package: v.package
                }
            );
        }

        //generating server dependency script files
        if (data) {
          fs.writeFile(script, JSON.stringify(data), (err) => {
          });
        }
    },

    async importServerDependencies (ctx, id, moduleId) {
        var fileName = `${subscriptsPath}/${id}/server-dependencies`;
        fs.readFile(fileName, function read(err, data) {
            if (err) {
                console.log(err);
            } else {
                const content = JSON.parse(data);
                for (var t of content) {
                    t.users = [ctx.state.user.id];
                    t.module = moduleId;
                    strapi.query('server-dependencies').create(t);
                }
            }
        });
    },

    async isUsedServerDependencies (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        var servers = [];

        let entities;
        if (query._q) {
            entities = await strapi.query('server-dependencies').search(query);
        } else {
            entities = await strapi.query('server-dependencies').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                Array.prototype.push.apply(servers, t.servers);
            }
        }

        return servers;
    },

    async uninstallServerDependencies (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('server-dependencies').search(query);
        } else {
            entities = await strapi.query('server-dependencies').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                strapi.query('server-dependencies').delete({id:t.id});
            }
        }
    },

    async prepareService (ctx) {
        const user = ctx.state.user;
        const query = ctx.query;

        //For non admin roles
        if(user.role.type !== 'administrator')
          query.users = [user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('service').search(query);
        } else {
            entities = await strapi.query('service').find(query);
        }

        var script = `${subscriptsPath}/${user._id.toString()}` + `/service`;
        var data = [];

        for (let v of entities) {
            data.push(
                {
                    doc: v.doc,
                    service_name: v.service_name,
                    variables: v.variables,
                    setup_script: v.setup_script,
                    cleanup_script: v.cleanup_script
                }
            );
        }

        //generating server dependency script files
        if (data) {
          fs.writeFile(script, JSON.stringify(data), (err) => {
          });
        }
    },

    async importService (ctx, id, moduleId) {
        var fileName = `${subscriptsPath}/${id}/service`;
        fs.readFile(fileName, function read(err, data) {
            if (err) {
                console.log(err);
            } else {
                const content = JSON.parse(data);
                for (var t of content) {
                    t.users = [ctx.state.user.id];
                    t.module = moduleId;
                    strapi.query('service').create(t);
                }
            }
        });
    },

    async isUsedService (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        var apps = [];

        let entities;
        if (query._q) {
            entities = await strapi.query('service').search(query);
        } else {
            entities = await strapi.query('service').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                Array.prototype.push.apply(apps, t.apps);
            }
        }

        return apps;
    },

    async uninstallService (ctx, id, moduleId) {
        const query = ctx.query;
        query.users = [ctx.state.user._id.toString()];

        let entities;
        if (query._q) {
            entities = await strapi.query('service').search(query);
        } else {
            entities = await strapi.query('service').find(query);
        }

        for (var t of entities) {
            if (t.module === moduleId) {
                strapi.query('service').delete({id:t.id});
            }
        }
    },

    async prepareFolders(id) {
        exec(`mkdir -p ${publicPath}`);
        exec(`mkdir -p ${resourcesPath}`);
        exec(`mkdir -p ${subscriptsPath}`);
        exec(`mkdir -p ${subscriptsPath}/${id}`);
    },

    async compressAllFiles(ctx) {
        const user = ctx.state.user;

        var fileName = path.resolve() + `/public/uploads/${user._id.toString()}.tar.gz`;

        exec(`cd ${subscriptsPath}/${user._id.toString()} && tar zcvf ${fileName} .`);
    },

    async decompressAllFiles(id) {
        var fileName = path.resolve() + `/public/uploads/${id}.gz`;

        return new Promise((rs, rj) => {
            exec(`tar -C ${subscriptsPath}/${id} -xvf ${fileName}`).on('close', rs);
        });
    }
};

'use strict';

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

/* eslint-disable no-useless-escape */
const crypto = require('crypto');
const _ = require('lodash');
const grant = require('grant-koa');
const { sanitizeEntity } = require('strapi-utils');

const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  async callback(ctx) {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;

    const store = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    if (provider === 'local') {
      if (!_.get(await store.get({ key: 'grant' }), 'email.enabled')) {
        return ctx.badRequest(null, 'This provider is disabled.');
      }

      // The identifier is required.
      if (!params.identifier) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.form.error.email.provide',
            message: 'Please provide your username or your e-mail.',
          })
        );
      }

      // The password is required.
      if (!params.password) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.form.error.password.provide',
            message: 'Please provide your password.',
          })
        );
      }

      const query = {};

      // Check if the provided identifier is an email or not.
      const isEmail = emailRegExp.test(params.identifier);

      // Set the identifier to the appropriate query field.
      if (isEmail) {
        query.email = params.identifier.toLowerCase();
      } else {
        query.username = params.identifier;
      }

      if (strapi.config.LDAP_AUTH_ENABLE) {

        //LDAP Search
        const ldapUser = await strapi.plugins['users-permissions'].services.user.ldapFindUser(query.email || query.username, params.password);

        //If user not found
        if (!ldapUser) {
          return ctx.badRequest(null, 'User not found.');
        }

        if (typeof ldapUser === typeof 'str') {
          return ctx.badRequest(null, ldapUser);
        }

        // Check if the user exists.
        let user = await strapi
          .query('user', 'users-permissions')
          .findOne(query);

        if (!user) {
          //Get role of user - only Admin permitted
          const role = await strapi
            .query('role', 'users-permissions')
            .findOne({ type: 'administrator' }, []);

          if (!role) {
            return ctx.badRequest(null, 'Role administrator not found. Please ask root to create this role.');
          }

          //Create new user
          user = await strapi
            .query('user', 'users-permissions')
            .create({
              role: role.id,
              username: query.username || ldapUser.mail.split('@')[0],
              email: ldapUser.mail,
              password: params.password,
              confirmed: true,
              blocked: false,
            });
        }

        //Send user
        ctx.send({
          jwt: strapi.plugins['users-permissions'].services.jwt.issue({
            id: user.id,
          }),
          user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
            model: strapi.query('user', 'users-permissions').model,
          }),
        });
      } else {
        // Check if the user exists.
        const user = await strapi
          .query('user', 'users-permissions')
          .findOne(query);

        if (!user) {
          return ctx.badRequest(
            null,
            formatError({
              id: 'Auth.form.error.invalid',
              message: 'Identifier or password invalid.',
            })
          );
        }

        if (
          _.get(await store.get({ key: 'advanced' }), 'email_confirmation') &&
          user.confirmed !== true
        ) {
          return ctx.badRequest(
            null,
            formatError({
              id: 'Auth.form.error.confirmed',
              message: 'Your account email is not confirmed',
            })
          );
        }

        if (user.blocked === true) {
          return ctx.badRequest(
            null,
            formatError({
              id: 'Auth.form.error.blocked',
              message: 'Your account has been blocked by an administrator',
            })
          );
        }

        // The user never authenticated with the `local` provider.
        if (!user.password) {
          return ctx.badRequest(
            null,
            formatError({
              id: 'Auth.form.error.password.local',
              message:
                'This user never set a local password, please login with the provider used during account creation.',
            })
          );
        }

        const validPassword = strapi.plugins[
          'users-permissions'
          ].services.user.validatePassword(params.password, user.password);

        if (!validPassword) {
          return ctx.badRequest(
            null,
            formatError({
              id: 'Auth.form.error.invalid',
              message: 'Identifier or password invalid.',
            })
          );
        } else {
          ctx.send({
            jwt: strapi.plugins['users-permissions'].services.jwt.issue({
              id: user.id,
            }),
            user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
              model: strapi.query('user', 'users-permissions').model,
            }),
          });
        }
      }
    } else {
      if (!_.get(await store.get({ key: 'grant' }), [provider, 'enabled'])) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'provider.disabled',
            message: 'This provider is disabled.',
          })
        );
      }

      // Connect the user thanks to the third-party provider.
      let user, error;
      try {
        [user, error] = await strapi.plugins[
          'users-permissions'
          ].services.providers.connect(provider, ctx.query);
      } catch ([user, error]) {
        return ctx.badRequest(null, error === 'array' ? error[0] : error);
      }

      if (!user) {
        return ctx.badRequest(null, error === 'array' ? error[0] : error);
      }

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue({
          id: user.id,
        }),
        user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
          model: strapi.query('user', 'users-permissions').model,
        }),
      });
    }
  },



  async forgotPassword(ctx) {
    let { email } = ctx.request.body;

    // Check if the provided email is valid or not.
    const isEmail = emailRegExp.test(email);

    if (isEmail) {
      email = email.toLowerCase();
    } else {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.email.format',
          message: 'Please provide valid email address.',
        })
      );
    }

    const pluginStore = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    // Find the user by email.
    const user = await strapi
      .query('user', 'users-permissions')
      .findOne({ email });

    // User not found.
    if (!user) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.user.not-exist',
          message: 'This email does not exist.',
        })
      );
    }

    // Generate random token.
    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    // Set the property code.
    user.resetPasswordToken = resetPasswordToken;

    const settings = await pluginStore
      .get({ key: 'email' })
      .then(storeEmail => {
        try {
          return storeEmail['reset_password'].options;
        } catch (error) {
          return {};
        }
      });

    const advanced = await pluginStore.get({
      key: 'advanced',
    });

    settings.message = await strapi.plugins[
      'users-permissions'
      ].services.userspermissions.template(settings.message, {
      URL: advanced.email_reset_password,
      USER: _.omit(user.toJSON ? user.toJSON() : user, [
        'password',
        'resetPasswordToken',
        'role',
        'provider',
      ]),
      TOKEN: resetPasswordToken,
    });

    settings.object = await strapi.plugins[
      'users-permissions'
      ].services.userspermissions.template(settings.object, {
      USER: _.omit(user.toJSON ? user.toJSON() : user, [
        'password',
        'resetPasswordToken',
        'role',
        'provider',
      ]),
    });

    try {
      // Send an email to the user.
      await strapi.plugins['email'].services.email.send({
        to: user.email,
        from:
          settings.from.email || settings.from.name
            ? `${settings.from.name} <${settings.from.email}>`
            : undefined,
        replyTo: settings.response_email,
        subject: settings.object,
        text: settings.message,
        html: settings.message,
      });
    } catch (err) {
      console.log('err', err);
      return ctx.badRequest(null, err);
    }

    // Update the user.
    await strapi
      .query('user', 'users-permissions')
      .update({ id: user.id }, user);

    ctx.send({ ok: true });
  },
};

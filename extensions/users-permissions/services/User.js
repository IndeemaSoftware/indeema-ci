'use strict';

/**
 * User.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

//this global variable is needed to ignor warning for unsigned certificate used on LDAP server
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

//LDAP
const LDAPConfig = require('../config/ldap');
const ldap = require('ldapjs');
const LDAPClient = ldap.createClient({
  url: LDAPConfig.LDAP_URL
});

module.exports = {
  /**
   * Find user in LDAP
   * @param username
   * @param password
   * @returns {Promise<void>}
   */
  ldapFindUser: async(username, password = null) => {
    //User raw data from LDAP
    let ldapUser = null
    let userId = null;

    //this is Indeema LDAP server setup configuration
    const userOpts = {
      filter: '(uid='+ username +')',
      scope: 'sub',
      attributes: []
    }
    const groupOpts = {
      filter: '(cn=Admin)',//looking only in a list of Admin group
      scope: 'sub',
      attributes: ['memberUid']
    }

    return new Promise((rs, rj) => {
      //First check if user exists
      LDAPClient.search(LDAPConfig.LDAP_USER_DN, userOpts, function (err, result) {

        //Search users
        result.on('searchEntry', function (entry) {
          ldapUser = entry.object;
          userId = entry.object.uidNumber; //save user id
        })

        //Search is end
        result.on('end', function (result) {
          if(!ldapUser){
            rs(null);
            return;
          }

          //Try to verify user
          if(!password){

            //check if authed user is in list of Admins
            LDAPClient.search(LDAPConfig.LDAP_GROUP_DN, groupOpts, function (err, result) {

              result.on('searchEntry', function (entry) {
                let isPermited = false;

                for(let memberUid of entry.object.memberUid) {
                  if (memberUid == userId) {
                    isPermited = true;
                    break;
                  }
                }

                if (!isPermited) {
                  rs('You are not permitted to login to this service');
                  return;
                }

                rs(ldapUser);
              });
            });

          }else{

            LDAPClient.bind(ldapUser.dn, password, function (err) {
              if (err){
                rs('Wrong username or password');
                return;
              }

              //check if authed user is in list of Admins
              LDAPClient.search(LDAPConfig.LDAP_GROUP_DN, groupOpts, function (err, result) {

                result.on('searchEntry', function (entry) {
                  let isPermited = false;

                  for(let memberUid of entry.object.memberUid) {
                    if (memberUid == userId) {
                      isPermited = true;
                      break;
                    }
                  }

                  if (!isPermited) {
                    rs('You are not permitted to login to this service');
                    return;
                  }

                  rs(ldapUser);
                });
              });
            });
          }
        });
      });
    });
  }
}

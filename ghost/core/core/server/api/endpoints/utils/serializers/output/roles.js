const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:roles');
const canThis = require('../../../../../services/permissions').canThis;

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        const roles = models.toJSON(frame.options);

        if (frame.options.permissions !== 'assign') {
            frame.response = {
                roles: roles
            };
            return Promise.resolve(frame.response);
        } else {
            const filteredRolesPromises = roles.map((role) => {
                return canThis(frame.options.context)
                    .assign
                    .role(role)
                    .then((canAssign) => {
                        if (canAssign && role.name !== 'Owner') {
                            return role;
                        }
                    })
                    .catch(() => {});
            });

            return Promise.all(filteredRolesPromises)
                .then((filteredRoles) => {
                    filteredRoles = filteredRoles.filter(Boolean);
                    frame.response = {
                        roles: filteredRoles
                    };
                    return frame.response;
                });
        }
    }
};

const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:roles');
const canThis = require('../../../../../services/permissions').canThis;

module.exports = {
    async browse(models, apiConfig, frame) {
        debug('browse');

        const roles = models.toJSON(frame.options);

        if (frame.options.permissions !== 'assign') {
            frame.response = {
                roles: roles
            };
        } else {
            const filteredRoles = roles.filter(async (role) => {
                try {
                    const assignedRole = await canThis(frame.options.context).assign.role(role);
                    return assignedRole && assignedRole.name !== 'Owner';
                } catch (error) {
                    return false;
                }
            });

            frame.response = {
                roles: filteredRoles
            };
        }

        return frame.response;
    }
};


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
            const filteredRoles = [];
            for (let role of roles) {
                try {
                    const canAssign = await canThis(frame.options.context).assign.role(role);
                    if (canAssign && role.name !== 'Owner') {
                        filteredRoles.push(role);
                    }
                } catch (error) {
                    // Ignore errors
                }
            }

            frame.response = {
                roles: filteredRoles
            };
        }
    }
};

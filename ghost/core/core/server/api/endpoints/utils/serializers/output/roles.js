const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:roles');
const canThis = require('../../../../../services/permissions').canThis;

module.exports = {
    async browse(models, apiConfig, frame) {
        debug('browse');

        const roles = models.toJSON(frame.options);

        if (!frame.options.permissions || frame.options.permissions === 'all') {
            return {
                roles: roles
            };
        } else if (frame.options.permissions === 'assign') {
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

            return {
                roles: filteredRoles
            };
        } else {
            // Handle other permission options if needed
            // Add appropriate code here
            return {
                roles: roles
            };
        }
    }
};

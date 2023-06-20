const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:roles');
const canThis = require('../../../../../services/permissions').canThis;

module.exports = {
    async browse(models, apiConfig, frame) {
        debug('browse');

        const roles = models.toJSON(frame.options);

        if (frame.options.permissions !== 'assign') {
            return {
                roles: roles
            };
        } else {
            const filteredRoles = [];

            for (const role of roles) {
                try {
                    const assignedRole = await canThis(frame.options.context).assign.role(role);
                    if (assignedRole && assignedRole.name !== 'Owner') {
                        filteredRoles.push(assignedRole);
                    }
                } catch (error) {}
            }
            return {
                roles: filteredRoles
            };
        }
    }
};

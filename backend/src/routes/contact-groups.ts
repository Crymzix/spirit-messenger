import { FastifyPluginAsync } from 'fastify';
import {
    createContactGroup,
    getUserContactGroups,
    updateContactGroup,
    deleteContactGroup,
    addContactToGroup,
    removeContactFromGroup,
    reorderContactGroups,
    ContactGroupServiceError,
    type CreateContactGroupData,
    type UpdateContactGroupData,
    type ReorderGroupData,
} from '../services/contact-group-service.js';
import type { ApiResponse } from '../types/index.js';
import type { SelectContactGroup, SelectContactGroupMembership } from '../db/schema.js';

interface CreateGroupBody {
    name: string;
    displayOrder?: number;
}

interface UpdateGroupBody {
    name?: string;
    displayOrder?: number;
}

interface AddContactToGroupBody {
    contactId: string;
}

interface ReorderGroupsBody {
    groupOrders: ReorderGroupData[];
}

interface GroupsResponse {
    groups: SelectContactGroup[];
}

interface GroupResponse {
    group: SelectContactGroup;
}

interface MembershipResponse {
    membership: SelectContactGroupMembership;
}

const contactGroupsRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/contact-groups - Create a new contact group
    fastify.post<{
        Body: CreateGroupBody;
        Reply: ApiResponse<GroupResponse>;
    }>(
        '/',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 50
                        },
                        displayOrder: {
                            type: 'number',
                            minimum: 0
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const groupData: CreateContactGroupData = {
                    name: request.body.name,
                    displayOrder: request.body.displayOrder
                };

                const group = await createContactGroup(userId, groupData);

                return reply.status(201).send({
                    success: true,
                    data: {
                        group
                    }
                });
            } catch (error) {
                if (error instanceof ContactGroupServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // GET /api/contact-groups - Get all contact groups for the authenticated user
    fastify.get<{
        Querystring: { includeMemberships?: boolean };
        Reply: ApiResponse<GroupsResponse>;
    }>(
        '/',
        {
            preHandler: fastify.authenticate,
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        includeMemberships: {
                            type: 'boolean'
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const includeMemberships = request.query.includeMemberships ?? false;

                const groups = await getUserContactGroups(userId, includeMemberships);

                return reply.status(200).send({
                    success: true,
                    data: {
                        groups
                    }
                });
            } catch (error) {
                if (error instanceof ContactGroupServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // PUT /api/contact-groups/:groupId - Update a contact group
    fastify.put<{
        Params: { groupId: string };
        Body: UpdateGroupBody;
        Reply: ApiResponse<GroupResponse>;
    }>(
        '/:groupId',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['groupId'],
                    properties: {
                        groupId: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                },
                body: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 50
                        },
                        displayOrder: {
                            type: 'number',
                            minimum: 0
                        }
                    },
                    anyOf: [
                        { required: ['name'] },
                        { required: ['displayOrder'] }
                    ]
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { groupId } = request.params;
                const updateData: UpdateContactGroupData = {
                    name: request.body.name,
                    displayOrder: request.body.displayOrder
                };

                const group = await updateContactGroup(groupId, userId, updateData);

                return reply.status(200).send({
                    success: true,
                    data: {
                        group
                    }
                });
            } catch (error) {
                if (error instanceof ContactGroupServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // DELETE /api/contact-groups/:groupId - Delete a contact group
    fastify.delete<{
        Params: { groupId: string };
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/:groupId',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['groupId'],
                    properties: {
                        groupId: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { groupId } = request.params;

                await deleteContactGroup(groupId, userId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        success: true
                    }
                });
            } catch (error) {
                if (error instanceof ContactGroupServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/contact-groups/:groupId/contacts - Add a contact to a group
    fastify.post<{
        Params: { groupId: string };
        Body: AddContactToGroupBody;
        Reply: ApiResponse<MembershipResponse>;
    }>(
        '/:groupId/contacts',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['groupId'],
                    properties: {
                        groupId: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                },
                body: {
                    type: 'object',
                    required: ['contactId'],
                    properties: {
                        contactId: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { groupId } = request.params;
                const { contactId } = request.body;

                const membership = await addContactToGroup(groupId, contactId, userId);

                return reply.status(201).send({
                    success: true,
                    data: {
                        membership
                    }
                });
            } catch (error) {
                if (error instanceof ContactGroupServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // DELETE /api/contact-groups/:groupId/contacts/:contactId - Remove a contact from a group
    fastify.delete<{
        Params: { groupId: string; contactId: string };
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/:groupId/contacts/:contactId',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['groupId', 'contactId'],
                    properties: {
                        groupId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        contactId: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { groupId, contactId } = request.params;

                await removeContactFromGroup(groupId, contactId, userId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        success: true
                    }
                });
            } catch (error) {
                if (error instanceof ContactGroupServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // PUT /api/contact-groups/reorder - Reorder multiple contact groups
    fastify.put<{
        Body: ReorderGroupsBody;
        Reply: ApiResponse<GroupsResponse>;
    }>(
        '/reorder',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['groupOrders'],
                    properties: {
                        groupOrders: {
                            type: 'array',
                            minItems: 1,
                            items: {
                                type: 'object',
                                required: ['groupId', 'displayOrder'],
                                properties: {
                                    groupId: {
                                        type: 'string',
                                        format: 'uuid'
                                    },
                                    displayOrder: {
                                        type: 'number',
                                        minimum: 0
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { groupOrders } = request.body;

                const groups = await reorderContactGroups(userId, groupOrders);

                return reply.status(200).send({
                    success: true,
                    data: {
                        groups
                    }
                });
            } catch (error) {
                if (error instanceof ContactGroupServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );
};

export default contactGroupsRoutes;

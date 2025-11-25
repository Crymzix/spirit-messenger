import { FastifyPluginAsync } from 'fastify';
import {
    createContactRequest,
    acceptContactRequest,
    declineContactRequest,
    removeContact,
    getUserContacts,
    getPendingContactRequests,
    blockContact,
    unblockContact,
    ContactServiceError,
} from '../services/contact-service.js';
import type { ApiResponse } from '../types/index.js';
import type { SelectContact } from '../db/schema.js';

interface ContactRequestBody {
    contactEmail: string;
}

interface AcceptContactBody {
    requestId: string;
}

interface DeclineContactBody {
    requestId: string;
}

interface ContactsResponse {
    contacts: SelectContact[];
}

interface PendingRequestsResponse {
    requests: any[];
}

const contactsRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/contacts/request
    fastify.post<{
        Body: ContactRequestBody;
        Reply: ApiResponse<{ contactRequest: SelectContact }>;
    }>(
        '/request',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['contactEmail'],
                    properties: {
                        contactEmail: {
                            type: 'string',
                            format: 'email',
                            minLength: 3,
                            maxLength: 255
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
                const { contactEmail } = request.body;

                // Create contact request using service
                const contactRequest = await createContactRequest(userId, {
                    contactEmail
                });

                return reply.status(201).send({
                    success: true,
                    data: {
                        contactRequest
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

    // POST /api/contacts/accept
    fastify.post<{
        Body: AcceptContactBody;
        Reply: ApiResponse<{ contact: SelectContact }>;
    }>(
        '/accept',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['requestId'],
                    properties: {
                        requestId: {
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
                const { requestId } = request.body;

                // Accept contact request using service
                const contact = await acceptContactRequest(userId, requestId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        contact
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

    // POST /api/contacts/decline
    fastify.post<{
        Body: DeclineContactBody;
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/decline',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['requestId'],
                    properties: {
                        requestId: {
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
                const { requestId } = request.body;

                // Decline contact request using service
                await declineContactRequest(userId, requestId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        success: true
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

    // DELETE /api/contacts/:contactId
    fastify.delete<{
        Params: { contactId: string };
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/:contactId',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
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
                const { contactId } = request.params;

                // Remove contact using service
                await removeContact(userId, contactId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        success: true
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

    // GET /api/contacts - Get all contacts for the authenticated user
    fastify.get<{
        Querystring: { status?: 'pending' | 'accepted' | 'blocked' };
        Reply: ApiResponse<ContactsResponse>;
    }>(
        '/',
        {
            preHandler: fastify.authenticate,
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['pending', 'accepted', 'blocked']
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
                const { status } = request.query;

                // Get user contacts using service
                const contacts = await getUserContacts(userId, status);

                return reply.status(200).send({
                    success: true,
                    data: {
                        contacts
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

    // GET /api/contacts/pending - Get pending contact requests
    fastify.get<{
        Reply: ApiResponse<PendingRequestsResponse>;
    }>(
        '/pending',
        {
            preHandler: fastify.authenticate
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

                // Get pending contact requests using service
                const requests = await getPendingContactRequests(userId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        requests
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

    // POST /api/contacts/:contactId/block - Block a contact
    fastify.post<{
        Params: { contactId: string };
        Reply: ApiResponse<{ contact: SelectContact }>;
    }>(
        '/:contactId/block',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
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
                const { contactId } = request.params;

                // Block contact using service
                const contact = await blockContact(userId, contactId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        contact
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

    // POST /api/contacts/:contactId/unblock - Unblock a contact
    fastify.post<{
        Params: { contactId: string };
        Reply: ApiResponse<{ contact: SelectContact }>;
    }>(
        '/:contactId/unblock',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
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
                const { contactId } = request.params;

                // Unblock contact using service
                const contact = await unblockContact(userId, contactId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        contact
                    }
                });
            } catch (error) {
                if (error instanceof ContactServiceError) {
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

export default contactsRoutes;

/**
 * Calls Routes
 * 
 * Handles WebRTC call endpoints for voice and video calls.
 */

import { FastifyPluginAsync } from 'fastify';
import {
    initiateCall,
    answerCall,
    declineCall,
    endCall,
    missedCall,
    getActiveCall,
    handleSignal,
    CallServiceError,
    type InitiateCallData,
    type SignalData,
    type CallWithParticipants,
} from '../services/call-service.js';
import type { ApiResponse } from '../types/index.js';
import type { SelectCall } from '../db/schema.js';

interface InitiateCallBody {
    conversation_id: string;
    call_type: 'voice' | 'video';
}

interface CallParams {
    callId: string;
}

interface SignalBody {
    type: 'signal';
    data: any;
    targetUserId: string;
}

interface ActiveCallParams {
    conversationId: string;
}

const callsRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/calls/initiate - Initiate a new call
    fastify.post<{
        Body: InitiateCallBody;
        Reply: ApiResponse<{ call: SelectCall }>;
    }>(
        '/initiate',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['conversation_id', 'call_type'],
                    properties: {
                        conversation_id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        call_type: {
                            type: 'string',
                            enum: ['voice', 'video'],
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const userId = request.user.id;
                const { conversation_id, call_type } = request.body;

                const callData: InitiateCallData = {
                    conversationId: conversation_id,
                    callType: call_type,
                };

                // Initiate call using service
                const call = await initiateCall(userId, callData);

                return reply.status(201).send({
                    success: true,
                    data: {
                        call,
                    },
                });
            } catch (error) {
                if (error instanceof CallServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // POST /api/calls/:callId/answer - Answer a call
    fastify.post<{
        Params: CallParams;
        Reply: ApiResponse<{ call: SelectCall }>;
    }>(
        '/:callId/answer',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['callId'],
                    properties: {
                        callId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const userId = request.user.id;
                const { callId } = request.params;

                // Answer call using service
                const call = await answerCall(userId, callId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        call,
                    },
                });
            } catch (error) {
                if (error instanceof CallServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // POST /api/calls/:callId/decline - Decline a call
    fastify.post<{
        Params: CallParams;
        Reply: ApiResponse<{ call: SelectCall }>;
    }>(
        '/:callId/decline',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['callId'],
                    properties: {
                        callId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const userId = request.user.id;
                const { callId } = request.params;

                // Decline call using service
                const call = await declineCall(userId, callId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        call,
                    },
                });
            } catch (error) {
                if (error instanceof CallServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // POST /api/calls/:callId/end - End a call
    fastify.post<{
        Params: CallParams;
        Reply: ApiResponse<{ call: SelectCall }>;
    }>(
        '/:callId/end',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['callId'],
                    properties: {
                        callId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const userId = request.user.id;
                const { callId } = request.params;

                // End call using service
                const call = await endCall(userId, callId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        call,
                    },
                });
            } catch (error) {
                if (error instanceof CallServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // POST /api/calls/:callId/missed - Mark a call as missed (timeout)
    fastify.post<{
        Params: CallParams;
        Reply: ApiResponse<{ call: SelectCall }>;
    }>(
        '/:callId/missed',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['callId'],
                    properties: {
                        callId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const { callId } = request.params;

                // Mark call as missed using service
                const call = await missedCall(callId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        call,
                    },
                });
            } catch (error) {
                if (error instanceof CallServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // POST /api/calls/:callId/signal - Send signaling data
    fastify.post<{
        Params: CallParams;
        Body: SignalBody;
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/:callId/signal',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['callId'],
                    properties: {
                        callId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
                body: {
                    type: 'object',
                    required: ['type', 'data', 'targetUserId'],
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['signal'],
                        },
                        data: {
                            type: 'object',
                        },
                        targetUserId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const userId = request.user.id;
                const { callId } = request.params;
                const { type, data, targetUserId } = request.body;

                const signalData: SignalData = {
                    type,
                    data,
                    targetUserId: targetUserId,
                };

                // Handle signal using service
                await handleSignal(userId, callId, signalData);

                return reply.status(200).send({
                    success: true,
                    data: {
                        success: true,
                    },
                });
            } catch (error) {
                if (error instanceof CallServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // GET /api/calls/active/:conversationId - Get active call for a conversation
    fastify.get<{
        Params: ActiveCallParams;
        Reply: ApiResponse<{ call: CallWithParticipants | null }>;
    }>(
        '/active/:conversationId',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['conversationId'],
                    properties: {
                        conversationId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const userId = request.user.id;
                const { conversationId } = request.params;

                // Get active call using service
                const call = await getActiveCall(userId, conversationId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        call,
                    },
                });
            } catch (error) {
                if (error instanceof CallServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );
};

export default callsRoutes;

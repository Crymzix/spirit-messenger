import { User, CallType } from '@/types';
import { useIncomingCallHandler } from '@/lib/hooks/use-incoming-call-handler';
import { useCallEnd } from '@/lib/hooks/call-hooks';
import { useUser } from '@/lib';
import { simplePeerService } from '@/lib/services/simple-peer-service';
import { KeyboardEventHandler } from 'react';

interface IncomingCallMessageProps {
    callId: string;
    callType: CallType;
    caller: User;
    conversationId: string;
    initiatorId: string;
    callStatus?: 'ringing' | 'active' | 'declined' | 'missed' | 'ended';
}

export function IncomingCallMessage({
    callId,
    callType,
    caller,
    conversationId,
    initiatorId,
    callStatus = 'ringing',
}: IncomingCallMessageProps) {
    const { data: currentUser } = useUser()
    const endCallMutation = useCallEnd();
    const { handleAnswer, handleDecline, isAnswering, isDeclining } =
        useIncomingCallHandler({
            callId,
            callType,
            callerId: caller.id,
            conversationId,
        });

    const isReceiver = currentUser?.id !== initiatorId;
    const isRinging = callStatus === 'ringing';

    const handleInitiatorCancel = async () => {
        // Initiator can cancel the outgoing call only if it's still ringing
        if (isRinging) {
            await endCallMutation.mutateAsync(callId);
        }
    };

    const handleEnd = async () => {
        await endCallMutation.mutateAsync(callId);
        // Close peer connection and stop streams
        simplePeerService.destroy();
    };

    const ActionLink = ({
        onClick,
        label,
        shortcut,
        isLoading,
        onKeyDown
    }: {
        onClick?: () => void
        label: string
        shortcut: string
        isLoading?: boolean
        onKeyDown?: KeyboardEventHandler<HTMLDivElement>
    }) => (
        <div
            onClick={!isLoading ? onClick : undefined}
            onKeyDown={onKeyDown}
            className={`cursor-pointer flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {isLoading ? `${label}...` : label}
            <div className="text-gray-600 ml-1">({shortcut})</div>
        </div>
    );

    if (callStatus === 'active') {
        return (
            <div
                className={`flex flex-col gap-2 italic text-blue-600`}
            >
                <div className='h-[1px] bg-gray-400 w-16'></div>
                <span>{`${callType === 'voice' ? 'Voice' : 'Video'} call in progress...`}</span>
                <ActionLink
                    onKeyDown={e => {
                        if (e.altKey && e.key === 'q') {
                            handleEnd()
                        }
                    }}
                    onClick={handleEnd}
                    label="End Call"
                    shortcut="Alt+Q"
                    isLoading={endCallMutation.isPending}
                />
            </div >
        )
    }

    return (
        <div className="flex flex-col gap-0.5 py-2">
            {/* Call header with caller info */}
            <div
                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                className="flex-1 flex items-center gap-2"
            >
                <div className="!text-[11px]">
                    {isReceiver ? 'Incoming' : 'Calling...'} {callType === 'voice' ? 'voice' : 'video'} call from {caller.displayName}
                </div>
            </div>

            {/* Actions/Status based on role and call status */}
            {isRinging && (
                <div
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                    className="flex flex-col flex-wrap gap-2 !text-[11px] text-[#2F1AFF]"
                >
                    {isReceiver ? (
                        <>
                            <div className="flex gap-3">
                                <ActionLink
                                    onKeyDown={e => {
                                        if (e.altKey && e.key === 'w') {
                                            handleAnswer()
                                        }
                                    }}
                                    onClick={handleAnswer}
                                    label="Accept"
                                    shortcut="Alt+W"
                                    isLoading={isAnswering}
                                />
                                <ActionLink
                                    onKeyDown={e => {
                                        if (e.altKey && e.key === 'q') {
                                            handleDecline()
                                        }
                                    }}
                                    onClick={handleDecline}
                                    label="Decline"
                                    shortcut="Alt+Q"
                                    isLoading={isDeclining}
                                />
                            </div>
                        </>
                    ) : (
                        <ActionLink
                            onKeyDown={e => {
                                if (e.altKey && e.key === 'q') {
                                    handleInitiatorCancel()
                                }
                            }}
                            onClick={handleInitiatorCancel}
                            label="Cancel"
                            shortcut="Alt+Q"
                            isLoading={endCallMutation.isPending}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

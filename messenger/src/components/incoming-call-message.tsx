import { User, CallType } from '@/types';
import { useIncomingCallHandler } from '@/lib/hooks/use-incoming-call-handler';
import { useCallEnd } from '@/lib/hooks/call-hooks';
import { useUser } from '@/lib';

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
    const currentUser = useUser();
    const endCallMutation = useCallEnd();
    const { handleAnswer, handleDecline, isAnswering, isDeclining } =
        useIncomingCallHandler({
            callId,
            callType,
            callerId: caller.id,
            conversationId,
        });

    const isReceiver = currentUser?.id !== initiatorId;
    const isStillRinging = callStatus === 'ringing';

    const handleInitiatorCancel = async () => {
        // Initiator can cancel the outgoing call only if it's still ringing
        if (isStillRinging) {
            await endCallMutation.mutateAsync(callId);
        }
    };

    const ActionLink = ({
        onClick,
        label,
        shortcut,
        isLoading
    }: {
        onClick?: () => void
        label: string
        shortcut: string
        isLoading?: boolean
    }) => (
        <div
            onClick={!isLoading ? onClick : undefined}
            className={`cursor-pointer flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {isLoading ? `${label}...` : label}
            <div className="text-gray-600 ml-1">({shortcut})</div>
        </div>
    );

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
            {isStillRinging && (
                <div
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                    className="flex flex-col flex-wrap gap-2 !text-[11px] text-[#2F1AFF]"
                >
                    {isReceiver ? (
                        <>
                            <div className="flex gap-3">
                                <ActionLink
                                    onClick={handleAnswer}
                                    label="Accept"
                                    shortcut="Alt+W"
                                    isLoading={isAnswering}
                                />
                                <ActionLink
                                    onClick={handleDecline}
                                    label="Decline"
                                    shortcut="Alt+Q"
                                    isLoading={isDeclining}
                                />
                            </div>
                        </>
                    ) : (
                        <ActionLink
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

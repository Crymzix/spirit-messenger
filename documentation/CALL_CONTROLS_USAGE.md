# CallControls Component Usage

The `CallControls` component provides reusable call control buttons for voice and video calls in the MSN Messenger clone application.

## Features

- **Mute/Unmute Button**: Toggles audio on/off
- **Camera Toggle Button**: Toggles video on/off (video calls only)
- **Hang Up Button**: Ends the active call
- **Visual Feedback**: Icons change based on muted/camera state
- **Hover Effects**: Smooth scale and shadow transitions
- **Tooltips**: Accessible labels for each button
- **MSN Messenger Styling**: Classic aesthetic with two variants (light/dark)

## Props

```typescript
interface CallControlsProps {
    /** Whether this is a video call (shows camera toggle) */
    isVideoCall?: boolean;
    /** Optional custom styling for the container */
    className?: string;
    /** Variant for different visual styles */
    variant?: 'light' | 'dark';
}
```

## Usage Examples

### Audio Call (Light Variant)

```tsx
import { CallControls } from '@/components/call-controls';

export function AudioCallOverlay({ contact }: AudioCallOverlayProps) {
    return (
        <div className="call-overlay">
            {/* ... other UI elements ... */}
            
            <CallControls 
                isVideoCall={false}
                variant="light"
            />
        </div>
    );
}
```

### Video Call (Dark Variant)

```tsx
import { CallControls } from '@/components/call-controls';

export function VideoCallOverlay({ contact }: VideoCallOverlayProps) {
    return (
        <div className="video-overlay">
            {/* ... other UI elements ... */}
            
            <CallControls 
                isVideoCall={true}
                variant="dark"
            />
        </div>
    );
}
```

### Custom Styling

```tsx
<CallControls 
    isVideoCall={true}
    variant="light"
    className="mt-4 mb-2"
/>
```

## Integration with Call Store

The component automatically integrates with the Zustand call store:

- **State**: Reads `isMuted`, `isCameraOff`, and `activeCall` from the store
- **Actions**: Calls `toggleMute()`, `toggleCamera()`, and uses `useCallEnd()` hook
- **WebRTC Service**: Interacts with `webrtcService` to close connections

## Styling Variants

### Light Variant (Default)
- White buttons with MSN blue borders
- Larger buttons (20x20 / 80px)
- Text labels below icons
- Suitable for light backgrounds

### Dark Variant
- Semi-transparent white buttons
- Smaller buttons (16x16 / 64px)
- No text labels (icons only)
- Suitable for dark/video backgrounds

## Accessibility

- All buttons have `aria-label` attributes
- Tooltips via `title` attribute
- Visual state indicators (red for muted/camera off)
- Disabled state for hang-up during API call

## Requirements Satisfied

- ✅ 5.2: Mute button that calls call-store toggleMute action
- ✅ 5.3: Camera toggle button that calls call-store toggleCamera action
- ✅ 5.4: Hang-up button that calls useCallEnd hook
- ✅ 5.5: Display appropriate icons based on muted/camera state
- ✅ 5.6: Style buttons to match MSN Messenger call controls
- ✅ Hover effects and tooltips

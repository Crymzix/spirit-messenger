# Contact Group Reordering

This document describes the drag-and-drop functionality for reordering custom contact groups in the MSN Messenger application.

## Overview

Users can reorder their custom contact groups by dragging and dropping them in the contact list. The reordering is persisted to the backend and synchronized across all clients in real-time.

## Implementation

### Frontend Components

1. **SortableGroupItem** (`src/components/sortable-group-item.tsx`)
   - Wraps each custom contact group to make it draggable
   - Uses `@dnd-kit/sortable` for drag-and-drop functionality
   - Provides visual feedback during drag (opacity change, cursor change)
   - Maintains all group functionality (collapse/expand, context menu)

2. **ContactList** (`src/components/contact-list.tsx`)
   - Wraps custom groups with `DndContext` and `SortableContext`
   - Handles drag end events to calculate new group order
   - Sends reorder request to backend via React Query hook
   - Implements optimistic updates for instant UI feedback

### Drag-and-Drop Configuration

- **Activation Constraint**: Requires 8px of movement before drag starts (prevents accidental drags)
- **Collision Detection**: Uses `closestCenter` algorithm for smooth drag experience
- **Sorting Strategy**: Uses `verticalListSortingStrategy` for vertical list reordering
- **Sensors**: Supports both pointer (mouse/touch) and keyboard navigation

### Backend Integration

- **Endpoint**: `PUT /api/contact-groups/reorder`
- **Request Body**:
  ```json
  {
    "groupOrders": [
      { "groupId": "uuid", "displayOrder": 0 },
      { "groupId": "uuid", "displayOrder": 1 }
    ]
  }
  ```
- **Response**: Returns updated groups with new display orders

### React Query Integration

The `useReorderContactGroups` hook handles:
- Optimistic updates (immediate UI feedback)
- Automatic cache invalidation
- Error handling and rollback on failure
- Real-time synchronization via Supabase

## User Experience

1. User clicks and holds on a custom group header
2. After 8px of movement, the group becomes draggable
3. Visual feedback shows the group is being dragged (50% opacity, grabbing cursor)
4. User drags the group to desired position
5. On drop, the UI updates immediately (optimistic update)
6. Backend request is sent to persist the new order
7. Other clients receive real-time updates via Supabase

## Technical Details

### Dependencies

- `@dnd-kit/core`: Core drag-and-drop functionality
- `@dnd-kit/sortable`: Sortable list utilities
- `@dnd-kit/utilities`: Helper utilities for transforms

### Key Features

- **Optimistic Updates**: UI updates immediately before backend confirmation
- **Error Handling**: Automatic rollback if backend request fails
- **Real-time Sync**: Changes propagate to all clients via Supabase Realtime
- **Accessibility**: Supports keyboard navigation for reordering
- **Visual Feedback**: Clear indication of drag state

## Limitations

- Only custom groups can be reordered (Online, Offline, Blocked groups are fixed)
- Drag-and-drop only works within the custom groups section
- Requires at least 2 custom groups to be useful

## Future Enhancements

- Add drag handle icon for clearer affordance
- Support drag-and-drop for contacts between groups
- Add animation for smooth reordering transitions
- Support multi-select for batch reordering

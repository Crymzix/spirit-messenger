/**
 * Sortable Group Item Component
 * Wraps a contact group to make it draggable for reordering
 * 
 * Features:
 * - Drag-and-drop support using @dnd-kit
 * - Visual feedback during drag
 * - Maintains group functionality (collapse/expand, context menu)
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContactGroupHeader } from './contact-group-header';
import { ReactNode } from 'react';

interface SortableGroupItemProps {
    id: string;
    groupId: string;
    title: string;
    count: number;
    isCollapsed: boolean;
    onToggle: () => void;
    isCustomGroup: boolean;
    children?: ReactNode;
}

export function SortableGroupItem({
    id,
    groupId,
    title,
    count,
    isCollapsed,
    onToggle,
    isCustomGroup,
    children,
}: SortableGroupItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <ContactGroupHeader
                groupId={groupId}
                title={title}
                count={count}
                isCollapsed={isCollapsed}
                onToggle={onToggle}
                isCustomGroup={isCustomGroup}
            />
            {children}
        </div>
    );
}

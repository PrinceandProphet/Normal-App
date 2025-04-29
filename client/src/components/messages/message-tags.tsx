import React from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { parseTags, getAvailableTags } from "@/utils/message-tagging";

// Color mapping for different tags
const TAG_COLORS: Record<string, string> = {
  housing: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  insurance: "bg-green-100 text-green-800 hover:bg-green-200",
  documents: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  funding: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  medical: "bg-red-100 text-red-800 hover:bg-red-200",
  recovery: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  utilities: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  emergency: "bg-rose-100 text-rose-800 hover:bg-rose-200",
  default: "bg-gray-100 text-gray-800 hover:bg-gray-200"
};

export interface MessageTagsProps {
  tags: string | null | undefined;
  onTagClick?: (tag: string) => void;
  onTagRemove?: (tag: string) => void;
  selectable?: boolean;
  removable?: boolean;
  className?: string;
}

/**
 * Component for displaying message tags
 */
export function MessageTags({
  tags,
  onTagClick,
  onTagRemove,
  selectable = false,
  removable = false,
  className = ""
}: MessageTagsProps) {
  const tagArray = parseTags(tags);
  
  if (!tagArray || tagArray.length === 0) {
    return null;
  }
  
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tagArray.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className={`
            ${TAG_COLORS[tag] || TAG_COLORS.default}
            ${selectable ? 'cursor-pointer' : ''}
            transition-colors
          `}
          onClick={selectable ? () => onTagClick?.(tag) : undefined}
        >
          {tag}
          {removable && (
            <X
              size={14}
              className="ml-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onTagRemove?.(tag);
              }}
            />
          )}
        </Badge>
      ))}
    </div>
  );
}

export interface TagFilterProps {
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onTagRemove: (tag: string) => void;
}

/**
 * Tag filter component for message filtering
 */
export function TagFilter({
  selectedTags,
  onTagSelect,
  onTagRemove
}: TagFilterProps) {
  const availableTags = getAvailableTags().filter(
    (tag) => !selectedTags.includes(tag)
  );
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Filter by Tags</h3>
      
      {selectedTags.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Selected:</span>
          <MessageTags
            tags={selectedTags.join(',')}
            onTagRemove={onTagRemove}
            removable={true}
          />
        </div>
      )}
      
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Available Tags:</span>
        <div className="flex flex-wrap gap-1">
          {availableTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={`${TAG_COLORS[tag] || TAG_COLORS.default} cursor-pointer transition-colors`}
              onClick={() => onTagSelect(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
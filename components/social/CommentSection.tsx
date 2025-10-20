'use client';

import { useState, useEffect } from 'react';
import { Send, Trash2, Edit2 } from 'lucide-react';
import { getTripComments, addComment, updateComment, deleteComment } from '@/lib/social';
import type { Comment } from '@/lib/db/schema';
import { useAppStore } from '@/lib/store';

interface CommentSectionProps {
  tripId: string;
  tripOwnerId: string;
}

export default function CommentSection({ tripId, tripOwnerId }: CommentSectionProps) {
  const citibikeUser = useAppStore((state) => state.citibikeUser);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [tripId]);

  async function loadComments() {
    try {
      const tripComments = await getTripComments(tripId);
      setComments(tripComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!citibikeUser || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(
        tripId,
        tripOwnerId,
        citibikeUser.id,
        `${citibikeUser.firstName} ${citibikeUser.lastName}`,
        citibikeUser.userPhoto,
        newComment
      );
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateComment(commentId, editText);
      setEditingId(null);
      setEditText('');
      await loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!citibikeUser) {
    return (
      <div className="p-4 text-center text-gray-600 dark:text-gray-400">
        Please log in to view and post comments
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-3">
            {/* User Avatar */}
            <div className="flex-shrink-0">
              {comment.userPhoto ? (
                <img
                  src={comment.userPhoto}
                  alt={comment.userName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                  {comment.userName.charAt(0)}
                </div>
              )}
            </div>

            {/* Comment Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {comment.userName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded"
                      maxLength={500}
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdate(comment.id)}
                        disabled={isSubmitting}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                    {comment.updatedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">(edited)</p>
                    )}
                  </>
                )}
              </div>

              {/* Actions (only for own comments) */}
              {comment.userId === citibikeUser.id && editingId !== comment.id && (
                <div className="flex items-center space-x-3 mt-1 ml-3">
                  <button
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditText(comment.text);
                    }}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {citibikeUser.userPhoto ? (
            <img
              src={citibikeUser.userPhoto}
              alt={`${citibikeUser.firstName} ${citibikeUser.lastName}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
              {citibikeUser.firstName.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            maxLength={500}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

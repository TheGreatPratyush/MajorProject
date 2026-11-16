import React, { useState } from 'react';
import { MessageSquare, Plus, Heart, Send, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal, PageHeader, EmptyState } from '../components/UI';

export default function CommunityPage() {
  const { data, currentUser, updateCollection, notify } = useApp();
  const [creating, setCreating] = useState(false);
  const [commenting, setCommenting] = useState(null);
  const [detail, setDetail] = useState(null);

  const toggleLike = (postId) =>
    updateCollection(
      'posts',
      data.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedBy: post.likedBy.includes(currentUser.id)
                ? post.likedBy.filter((id) => id !== currentUser.id)
                : [...post.likedBy, currentUser.id],
            }
          : post
      )
    );

  const addComment = (postId, text) => {
    if (!text.trim()) return notify('Write a comment first.', 'error');
    updateCollection(
      'posts',
      data.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `c${Date.now()}`,
                  authorId: currentUser.id,
                  author: currentUser.name,
                  text: text.trim(),
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : post
      )
    );
    notify('Comment added.');
  };

  const deletePost = (postId) => {
    updateCollection(
      'posts',
      data.posts.filter((post) => post.id !== postId)
    );
    setDetail(null);
    notify('Post deleted.');
  };

  return (
    <>
      <PageHeader
        title="Community"
        subtitle="Share ideas with the AYUSH ecosystem"
        action={
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={17} /> Create post
          </button>
        }
      />
      {data.posts.length ? (
        <div className="community-layout">
          <div className="post-list">
            {data.posts.map((post) => (
              <article className="post-card" key={post.id}>
                <div className="post-author">
                  <span className="avatar">
                    {post.author
                      .split(' ')
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div>
                    <strong>{post.author}</strong>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
                <div className="post-actions">
                  <button
                    className={post.likedBy.includes(currentUser.id) ? 'liked' : ''}
                    onClick={() => toggleLike(post.id)}
                  >
                    <Heart
                      size={16}
                      fill={post.likedBy.includes(currentUser.id) ? 'currentColor' : 'none'}
                    />
                    {post.likedBy.length}
                  </button>
                  <button onClick={() => setDetail(post)}>
                    <MessageSquare size={16} />
                    {post.comments.length}
                  </button>
                  {post.authorId === currentUser.id && (
                    <button className="danger-text" onClick={() => deletePost(post.id)}>
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <aside className="community-aside">
            <h3>Community guidelines</h3>
            <p>
              Keep discussions respectful, evidence-focused and relevant to the AYUSH ecosystem.
            </p>
          </aside>
        </div>
      ) : (
        <EmptyState icon={MessageSquare} title="No posts yet" text="Start the conversation." />
      )}
      {creating && (
        <CreatePostModal
          onClose={() => setCreating(false)}
          onCreate={(post) => {
            updateCollection('posts', [
              {
                ...post,
                id: `p${Date.now()}`,
                authorId: currentUser.id,
                author: currentUser.name,
                createdAt: new Date().toISOString(),
                likedBy: [],
                comments: [],
              },
              ...data.posts,
            ]);
            setCreating(false);
            notify('Post published.');
          }}
        />
      )}
      {detail && (
        <Modal title="Post details" onClose={() => setDetail(null)}>
          <div className="post-detail">
            <h2>{detail.title}</h2>
            <p>{detail.body}</p>
            <div className="comments">
              <h3>Comments ({detail.comments.length})</h3>
              {detail.comments.map((comment) => (
                <div className="comment" key={comment.id}>
                  <span className="avatar small">
                    {comment.author
                      .split(' ')
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div>
                    <strong>{comment.author}</strong>
                    <p>{comment.text}</p>
                  </div>
                </div>
              ))}
              {!detail.comments.length && <p className="muted">No comments yet.</p>}
            </div>
            <CommentForm
              onSubmit={(text) => {
                addComment(detail.id, text);
                setDetail(null);
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

function CreatePostModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <Modal
      title="Create a post"
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!title.trim() || !body.trim()}
            onClick={() => onCreate({ title: title.trim(), body: body.trim() })}
          >
            Publish post
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="full">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="full">
          Message
          <textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

function CommentForm({ onSubmit }) {
  const [text, setText] = useState('');
  return (
    <div className="comment-form">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
      />
      <button
        className="icon-btn primary-icon"
        onClick={() => {
          onSubmit(text);
          setText('');
        }}
        aria-label="Send comment"
      >
        <Send size={16} />
      </button>
    </div>
  );
}

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

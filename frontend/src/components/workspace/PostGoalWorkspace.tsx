import React, { useEffect, useMemo, useState } from 'react';

import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal,
  suggestPostGoalAutocomplete
} from '../../data/goalHierarchy';
import type { BusinessGoalOption, PostGoalFolder, PostGoalSuggestion } from '../../types/workspace';
import './PostGoalWorkspace.css';

interface Props {
  brandName: string;
  brandIdentity: string;
  businessGoals: BusinessGoalOption[];
  activeBusinessGoalId: string;
  postGoalFolders: PostGoalFolder[];
  onSelectBusinessGoal: (goalId: string) => void;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onEditGoals: () => void;
  onOpenPostGoal: (folder: PostGoalFolder) => void;
}

const PostGoalWorkspace: React.FC<Props> = ({
  brandName,
  brandIdentity,
  businessGoals,
  activeBusinessGoalId,
  postGoalFolders,
  onSelectBusinessGoal,
  onCreatePostGoal,
  onEditGoals,
  onOpenPostGoal
}) => {
  const activeBusinessGoal = useMemo(
    () => businessGoals.find(goal => goal.id === activeBusinessGoalId) ?? businessGoals[0] ?? null,
    [activeBusinessGoalId, businessGoals]
  );
  const [customPostGoalInput, setCustomPostGoalInput] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const suggestedPostGoals = useMemo(
    () => (activeBusinessGoal ? getPostGoalSuggestionsForBusinessGoal(activeBusinessGoal.id) : []),
    [activeBusinessGoal]
  );

  const autocompleteSuggestions = useMemo(
    () => suggestPostGoalAutocomplete(customPostGoalInput, activeBusinessGoal?.id ?? ''),
    [activeBusinessGoal?.id, customPostGoalInput]
  );

  const foldersForActiveGoal = useMemo(
    () => postGoalFolders.filter(folder => folder.businessGoalId === activeBusinessGoal?.id),
    [activeBusinessGoal?.id, postGoalFolders]
  );

  useEffect(() => {
    setCustomPostGoalInput('');
    setIsComposerOpen(false);
  }, [activeBusinessGoalId]);

  const handleCreateFromSuggestion = (goal: PostGoalSuggestion, source: PostGoalFolder['source']) => {
    if (!activeBusinessGoal) {
      return;
    }

    onCreatePostGoal(
      createPostGoalFolder(goal, activeBusinessGoal, source)
    );
    setCustomPostGoalInput('');
    setIsComposerOpen(false);
  };

  const handleCreateCustomGoal = () => {
    const trimmed = customPostGoalInput.trim();
    if (!trimmed || !activeBusinessGoal) {
      return;
    }

    handleCreateFromSuggestion(
      {
        id: `custom-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: trimmed,
        description: `Custom post goal for ${activeBusinessGoal.title.toLowerCase()} created from the workspace.`,
        taxonomyTags: ['Custom'],
        assistantPrompt: `Create post directions that support the business goal "${activeBusinessGoal.title}" while focusing on: ${trimmed}.`,
        previewTitle: trimmed,
        previewCaption: 'Custom post-goal direction created by the user.',
        previewBackground: 'linear-gradient(135deg, #35514d 0%, #8ca198 42%, #f1e5d5 100%)'
      },
      'custom'
    );
  };

  if (!activeBusinessGoal) {
    return null;
  }

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-brand-card">
          <div className="screen-eyebrow">Brand hierarchy</div>
          <h1>{brandName}</h1>
          <p>{brandIdentity}</p>
          <button type="button" className="ui-btn ui-btn--secondary workspace-edit-goals" onClick={onEditGoals}>
            Edit brand and goals
          </button>
        </div>

        <section className="workspace-sidebar-section">
          <div className="workspace-sidebar-label">Business goals</div>
          <div className="workspace-goal-list">
            {businessGoals.map(goal => (
              <button
                key={goal.id}
                type="button"
                className={`workspace-goal-item ${goal.id === activeBusinessGoal.id ? 'is-active' : ''}`}
                onClick={() => onSelectBusinessGoal(goal.id)}
              >
                <div className="workspace-goal-item-title">{goal.title}</div>
                <div className="workspace-goal-item-meta">
                  {goal.isRecommended ? `Top ${goal.rank}` : 'Selected'}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-sidebar-section">
          <div className="workspace-sidebar-label">Active folders</div>
          <div className="workspace-folder-list">
            {foldersForActiveGoal.length === 0 ? (
              <div className="workspace-empty-note">
                Add some post-goal folders below, then open one into the studio.
              </div>
            ) : (
              foldersForActiveGoal.map(folder => (
                <button
                  key={folder.id}
                  type="button"
                  className="workspace-folder-item"
                  onClick={() => onOpenPostGoal(folder)}
                >
                  <div className="workspace-folder-item-title">{folder.title}</div>
                  <div className="workspace-folder-item-meta">{folder.taxonomyTags.join(' · ')}</div>
                </button>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="workspace-main">
        <header className="workspace-header">
          <div>
            <div className="screen-eyebrow">Post-goal selection</div>
            <h2>{activeBusinessGoal.title}</h2>
            <p>{activeBusinessGoal.description}</p>
          </div>

          <div className="goal-hierarchy-card">
            <div className="goal-hierarchy-step">
              <span>Business goal</span>
              <strong>{activeBusinessGoal.title}</strong>
            </div>
            <div className="goal-hierarchy-step">
              <span>Post goals</span>
              <strong>Select or create folders that narrow this into concrete content directions.</strong>
            </div>
            <div className="goal-hierarchy-step">
              <span>Visual strategies</span>
              <strong>Open a folder to explore 2x2 generations, edits, and the traceboard.</strong>
            </div>
          </div>
        </header>

        <section className="workspace-chat-panel">
          <div className="workspace-panel-header">
            <div className="section-kicker">Goal guidance</div>
            <h3>Choose post-goal folders before entering the workspace loop.</h3>
          </div>

          <div className="assistant-thread">
            <article className="assistant-message">
              <div className="assistant-message-role">Why this goal</div>
              <p>{activeBusinessGoal.rationale}</p>
            </article>
            <article className="assistant-message">
              <div className="assistant-message-role">Selection rule</div>
              <p>
                Start with one or two folders that feel closest to what you want to communicate now.
                You can always return here to add more or edit the higher-level business goals.
              </p>
            </article>
          </div>
        </section>

        <section className="workspace-recommendation-panel">
          <div className="workspace-panel-header">
            <div className="section-kicker">Recommended post goals</div>
            <h3>Examples that interpret this goal in plain language</h3>
          </div>

          <div className="post-goal-card-grid">
            {suggestedPostGoals.map(goal => (
              <article key={goal.id} className="post-goal-card">
                <div
                  className="post-goal-visual"
                  style={{ background: goal.previewBackground }}
                >
                  <div className="post-goal-visual-eyebrow">{goal.taxonomyTags.join(' · ')}</div>
                  <div className="post-goal-visual-title">{goal.previewTitle || goal.title}</div>
                  <div className="post-goal-visual-caption">{goal.previewCaption || goal.description}</div>
                </div>

                <div className="post-goal-card-body">
                  <h4>{goal.title}</h4>
                  <p>{goal.description}</p>
                  <div className="post-goal-tags">
                    {goal.taxonomyTags.map(tag => (
                      <span key={tag} className="post-goal-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary"
                  onClick={() => handleCreateFromSuggestion(goal, 'recommended')}
                >
                  Add folder
                </button>
              </article>
            ))}

            <button
              type="button"
              className="post-goal-card post-goal-card--add"
              onClick={() => setIsComposerOpen(true)}
            >
              <div className="post-goal-add-icon">+</div>
              <div className="post-goal-card-body">
                <h4>Add your own post goal</h4>
                <p>
                  Create a custom folder if the recommended examples do not capture the direction you want.
                </p>
              </div>
            </button>
          </div>
        </section>

        <section className="workspace-folder-section">
          <div className="workspace-panel-header">
            <div className="section-kicker">Current workspace folders</div>
            <h3>Open any selected post goal into the image generation workspace.</h3>
          </div>

          <div className="workspace-folder-grid">
            {foldersForActiveGoal.length === 0 ? (
              <div className="workspace-empty-card">
                No folders selected yet. Add one from the recommendations above to start the visual exploration loop.
              </div>
            ) : (
              foldersForActiveGoal.map(folder => (
                <article key={folder.id} className="workspace-folder-card">
                  <div
                    className="workspace-folder-preview"
                    style={{ background: folder.previewBackground }}
                  >
                    <div className="workspace-folder-preview-title">{folder.previewTitle || folder.title}</div>
                    <div className="workspace-folder-preview-caption">{folder.previewCaption || folder.description}</div>
                  </div>
                  <div className="workspace-folder-card-topline">
                    <span>{folder.source === 'recommended' ? 'Recommended' : 'Custom'}</span>
                    <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4>{folder.title}</h4>
                  <p>{folder.description}</p>
                  <div className="post-goal-tags">
                    {folder.taxonomyTags.map(tag => (
                      <span key={tag} className="post-goal-tag">{tag}</span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary"
                    onClick={() => onOpenPostGoal(folder)}
                  >
                    Open 2x2 studio
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      {isComposerOpen && (
        <div className="goal-dialog-backdrop" onClick={() => setIsComposerOpen(false)}>
          <div className="goal-dialog" onClick={event => event.stopPropagation()}>
            <div className="section-kicker">Custom post goal</div>
            <h4>Add your own post goal</h4>
            <p>
              Write the folder in plain language. It should still belong under <strong>{activeBusinessGoal.title}</strong>.
            </p>

            <textarea
              value={customPostGoalInput}
              onChange={event => setCustomPostGoalInput(event.target.value)}
              placeholder={`e.g., "Explain why first-time customers should trust our ingredients"`}
              rows={4}
            />

            <div className="autocomplete-chip-row">
              {autocompleteSuggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="ui-btn ui-btn--choice"
                  onClick={() => setCustomPostGoalInput(suggestion.title)}
                >
                  {suggestion.title}
                </button>
              ))}
            </div>

            <div className="goal-dialog-actions">
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={() => setIsComposerOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={handleCreateCustomGoal}
                disabled={!customPostGoalInput.trim()}
              >
                Add folder
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default PostGoalWorkspace;

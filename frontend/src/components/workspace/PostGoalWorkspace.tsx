import React, { useEffect, useMemo, useState } from 'react';

import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal,
  suggestPostGoalAutocomplete
} from '../../data/goalHierarchy';
import type { BusinessGoalOption, PostGoalFolder } from '../../types/workspace';
import './PostGoalWorkspace.css';

interface Props {
  brandName: string;
  brandIdentity: string;
  businessGoals: BusinessGoalOption[];
  activeBusinessGoalId: string;
  postGoalFolders: PostGoalFolder[];
  onSelectBusinessGoal: (goalId: string) => void;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
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
  onOpenPostGoal
}) => {
  const activeBusinessGoal = useMemo(
    () => businessGoals.find(goal => goal.id === activeBusinessGoalId) ?? businessGoals[0] ?? null,
    [activeBusinessGoalId, businessGoals]
  );
  const [composerValue, setComposerValue] = useState('');

  const suggestedPostGoals = useMemo(
    () => (activeBusinessGoal ? getPostGoalSuggestionsForBusinessGoal(activeBusinessGoal.id) : []),
    [activeBusinessGoal]
  );

  const autocompleteSuggestions = useMemo(
    () => suggestPostGoalAutocomplete(composerValue, activeBusinessGoal?.id ?? ''),
    [activeBusinessGoal?.id, composerValue]
  );

  const foldersForActiveGoal = useMemo(
    () => postGoalFolders.filter(folder => folder.businessGoalId === activeBusinessGoal?.id),
    [activeBusinessGoal?.id, postGoalFolders]
  );

  useEffect(() => {
    setComposerValue('');
  }, [activeBusinessGoalId]);

  const handleCreateFromSuggestion = (title: string, description: string, taxonomyTags: string[], assistantPrompt: string, source: PostGoalFolder['source']) => {
    if (!activeBusinessGoal) {
      return;
    }

    onCreatePostGoal(createPostGoalFolder(
      { title, description, taxonomyTags, assistantPrompt },
      activeBusinessGoal,
      source
    ));
    setComposerValue('');
  };

  const handleCreateCustomGoal = () => {
    const trimmed = composerValue.trim();
    if (!trimmed || !activeBusinessGoal) {
      return;
    }

    handleCreateFromSuggestion(
      trimmed,
      `Custom post goal for ${activeBusinessGoal.title.toLowerCase()} created from the workspace composer.`,
      ['Custom'],
      `Create post directions that support the business goal "${activeBusinessGoal.title}" while focusing on: ${trimmed}.`,
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
          <div className="workspace-sidebar-label">Post-goal folders</div>
          <div className="workspace-folder-list">
            {foldersForActiveGoal.length === 0 ? (
              <div className="workspace-empty-note">
                Create the first post-goal folder for this business goal.
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
            <div className="screen-eyebrow">Goal workspace</div>
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
              <strong>Folders that refine this goal into concrete content directions</strong>
            </div>
            <div className="goal-hierarchy-step">
              <span>Visual strategies</span>
              <strong>Explored later inside the 2x2 studio and traceboard</strong>
            </div>
          </div>
        </header>

        <div className="workspace-main-grid">
          <section className="workspace-chat-panel">
            <div className="workspace-panel-header">
              <div className="section-kicker">AI post-goal assistant</div>
              <h3>Turn this business goal into post-goal folders.</h3>
            </div>

            <div className="assistant-thread">
              <article className="assistant-message">
                <div className="assistant-message-role">System</div>
                <p>
                  For <strong>{activeBusinessGoal.title}</strong>, start with plain-language post goals.
                  The taxonomy stays in the background as supporting tags.
                </p>
              </article>
              <article className="assistant-message">
                <div className="assistant-message-role">Why this goal</div>
                <p>{activeBusinessGoal.rationale}</p>
              </article>
            </div>

            <div className="workspace-composer">
              <textarea
                value={composerValue}
                onChange={event => setComposerValue(event.target.value)}
                placeholder={`Describe a post goal for "${activeBusinessGoal.title}" in plain language...`}
                rows={4}
              />

              <div className="autocomplete-chip-row">
                {autocompleteSuggestions.map(suggestion => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="ui-btn ui-btn--choice"
                    onClick={() => setComposerValue(suggestion.title)}
                  >
                    {suggestion.title}
                  </button>
                ))}
              </div>

              <div className="workspace-composer-actions">
                <button
                  type="button"
                  className="ui-btn ui-btn--primary"
                  onClick={handleCreateCustomGoal}
                  disabled={!composerValue.trim()}
                >
                  Create post-goal folder
                </button>
              </div>
            </div>
          </section>

          <section className="workspace-recommendation-panel">
            <div className="workspace-panel-header">
              <div className="section-kicker">Recommended post goals</div>
              <h3>Suggested starting points</h3>
            </div>

            <div className="post-goal-card-grid">
              {suggestedPostGoals.map(goal => (
                <article key={goal.id} className="post-goal-card">
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
                    onClick={() => handleCreateFromSuggestion(goal.title, goal.description, goal.taxonomyTags, goal.assistantPrompt, 'recommended')}
                  >
                    Add folder
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="workspace-folder-section">
          <div className="workspace-panel-header">
            <div className="section-kicker">Existing folders</div>
            <h3>Open a post goal and continue inside the image studio.</h3>
          </div>

          <div className="workspace-folder-grid">
            {foldersForActiveGoal.length === 0 ? (
              <div className="workspace-empty-card">
                No post-goal folders yet. Add one from the recommendations or type your own.
              </div>
            ) : (
              foldersForActiveGoal.map(folder => (
                <article key={folder.id} className="workspace-folder-card">
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
    </main>
  );
};

export default PostGoalWorkspace;

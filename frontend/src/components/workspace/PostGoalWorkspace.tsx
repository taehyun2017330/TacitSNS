import React, { useEffect, useMemo, useState } from 'react';

import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal,
  suggestPostGoalAutocomplete
} from '../../data/goalHierarchy';
import type { BusinessGoalOption, PostGoalFolder, PostGoalSuggestion } from '../../types/workspace';
import './PostGoalWorkspace.css';

interface Props {
  mode?: 'setup' | 'workspace';
  brandName: string;
  brandIdentity: string;
  businessGoals: BusinessGoalOption[];
  activeBusinessGoalId: string;
  postGoalFolders: PostGoalFolder[];
  onSelectBusinessGoal: (goalId: string) => void;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onEditGoals: () => void;
  onContinueToWorkspace?: () => void;
  onOpenPostGoal: (folder: PostGoalFolder) => void;
}

const PostGoalWorkspace: React.FC<Props> = ({
  mode = 'workspace',
  brandName,
  brandIdentity,
  businessGoals,
  activeBusinessGoalId,
  postGoalFolders,
  onSelectBusinessGoal,
  onCreatePostGoal,
  onEditGoals,
  onContinueToWorkspace,
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
  const selectedFolderTitles = useMemo(
    () => new Set(foldersForActiveGoal.map(folder => folder.title)),
    [foldersForActiveGoal]
  );
  const totalSelectedFolderCount = postGoalFolders.length;
  const isSetupMode = mode === 'setup';

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
          <div className="screen-eyebrow">{isSetupMode ? 'Post-goal setup' : 'Brand hierarchy'}</div>
          <h1>{brandName}</h1>
          <p>{brandIdentity}</p>
          <button type="button" className="ui-btn ui-btn--secondary workspace-edit-goals" onClick={onEditGoals}>
            {isSetupMode ? 'Back to brand and business goals' : 'Edit brand and goals'}
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
            <div className="screen-eyebrow">{isSetupMode ? 'Onboarding' : 'Post-goal selection'}</div>
            <h2>{activeBusinessGoal.title}</h2>
            <p>
              {isSetupMode
                ? 'Choose a few specific image-post directions before entering the main workspace. These become the folders you can explore later.'
                : activeBusinessGoal.description}
            </p>
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

        <section className="workspace-guidance-note">
          <strong>{isSetupMode ? 'Pick one or two folders to start.' : 'Pick one or two folders to start.'}</strong>{' '}
          {isSetupMode
            ? 'Then continue into the main directory where you can browse and open them.'
            : 'You can always come back and add more.'}
        </section>

        {isSetupMode && (
          <section className="workspace-setup-banner">
            <div>
              <div className="section-kicker">Step 3</div>
              <h3>Choose post goals before entering the workspace.</h3>
              <p>
                If you do not know exactly what to make yet, start with the suggested folders below. You can refine them later.
              </p>
            </div>

            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={onContinueToWorkspace}
              disabled={totalSelectedFolderCount === 0}
            >
              Continue to main workspace
            </button>
          </section>
        )}

        <section className="workspace-folder-section workspace-folder-section--selected">
          <div className="workspace-panel-header workspace-panel-header--row">
            <div>
              <div className="section-kicker">Selected folders</div>
              <h3>Your current working set</h3>
            </div>
            <div className="workspace-count-chip">
              {foldersForActiveGoal.length} {foldersForActiveGoal.length === 1 ? 'folder' : 'folders'}
            </div>
          </div>

          <div className="workspace-folder-grid">
            {foldersForActiveGoal.length === 0 ? (
              <div className="workspace-empty-card">
                Nothing selected yet. Add a folder from the recommendations below to start the visual exploration loop.
              </div>
            ) : (
              foldersForActiveGoal.map(folder => (
                <article key={folder.id} className="workspace-folder-card workspace-folder-card--selected">
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
                    onClick={() => (isSetupMode ? onContinueToWorkspace?.() : onOpenPostGoal(folder))}
                  >
                    {isSetupMode ? 'Keep for workspace' : 'Open 2x2 studio'}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="workspace-recommendation-panel">
          <div className="workspace-panel-header">
            <div className="section-kicker">Recommended post goals</div>
            <h3>Choose a direction to add</h3>
            <p>{activeBusinessGoal.rationale}</p>
          </div>

          <div className="post-goal-card-grid">
            {suggestedPostGoals.map(goal => {
              const isAdded = selectedFolderTitles.has(goal.title);

              return (
              <article key={goal.id} className={`post-goal-card ${isAdded ? 'is-added' : ''}`}>
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
                  disabled={isAdded}
                  onClick={() => handleCreateFromSuggestion(goal, 'recommended')}
                >
                  {isAdded ? 'Added' : 'Add folder'}
                </button>
              </article>
            )})}

            <button
              type="button"
              className="post-goal-card post-goal-card--add"
              onClick={() => setIsComposerOpen(true)}
            >
              <div className="post-goal-add-icon">+</div>
              <div className="post-goal-card-body">
                <h4>Add your own post goal</h4>
                <p>
                  Add a custom folder if none of these directions fit.
                </p>
              </div>
            </button>
          </div>
        </section>
      </section>

      {isComposerOpen && (
        <div className="goal-dialog-backdrop" onClick={() => setIsComposerOpen(false)}>
          <div className="goal-dialog" onClick={event => event.stopPropagation()}>
            <div className="section-kicker">Custom post goal</div>
            <h4>Add your own post goal</h4>
            <p>
              Write it in plain language under <strong>{activeBusinessGoal.title}</strong>.
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

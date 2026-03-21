import React, { useEffect, useMemo, useState } from 'react';

import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal
} from '../../data/goalHierarchy';
import type { BusinessGoalOption, PostGoalFolder, PostGoalSuggestion } from '../../types/workspace';
import '../workspace/PostGoalWorkspace.css';

interface Props {
  businessGoal: BusinessGoalOption;
  postGoalFolders: PostGoalFolder[];
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (title: string) => void;
}

type ComposerState = {
  mode: 'custom' | 'edit';
  seed?: PostGoalSuggestion;
  title: string;
  description: string;
  rationale: string;
};

function buildExampleLabels(goal: PostGoalSuggestion) {
  const joinedTags = goal.taxonomyTags.join(' ').toLowerCase();

  if (joinedTags.includes('functional')) {
    return ['Hero product', 'Process close-up', 'Feature explainer', 'Proof layout'];
  }
  if (joinedTags.includes('educational')) {
    return ['Step-by-step', 'Myth vs fact', 'Ingredient focus', 'How it works'];
  }
  if (joinedTags.includes('employee')) {
    return ['Founder portrait', 'Desk vignette', 'Quote frame', 'Team detail'];
  }
  if (joinedTags.includes('customer relationship')) {
    return ['Testimonial card', 'Customer quote', 'Before / after', 'Result snapshot'];
  }
  if (joinedTags.includes('sales promotion')) {
    return ['Offer highlight', 'Price frame', 'CTA variant', 'Promo detail'];
  }
  if (joinedTags.includes('current event')) {
    return ['Seasonal version', 'Timely hook', 'Event visual', 'Trend angle'];
  }
  if (joinedTags.includes('experiential')) {
    return ['Lifestyle scene', 'In-use moment', 'Atmosphere shot', 'Detail crop'];
  }

  return ['Editorial hero', 'Close crop', 'Text-led variant', 'Context frame'];
}

const PostGoalSetupStep: React.FC<Props> = ({
  businessGoal,
  postGoalFolders,
  onCreatePostGoal,
  onRemovePostGoal
}) => {
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const businessGoalSourceId = businessGoal.mappedGoalId ?? businessGoal.id;
  const suggestedPostGoals = useMemo(
    () => getPostGoalSuggestionsForBusinessGoal(businessGoalSourceId),
    [businessGoalSourceId]
  );
  const selectedFolderTitles = useMemo(
    () => new Set(postGoalFolders.map(folder => folder.title)),
    [postGoalFolders]
  );

  useEffect(() => {
    setComposer(null);
  }, [businessGoal.id]);

  const openCustomComposer = () => {
    setComposer({
      mode: 'custom',
      title: '',
      description: '',
      rationale: ''
    });
  };

  const openEditComposer = (goal: PostGoalSuggestion) => {
    setComposer({
      mode: 'edit',
      seed: goal,
      title: goal.title,
      description: goal.description,
      rationale: `This post goal supports "${businessGoal.title}" for this brand.`
    });
  };

  const closeComposer = () => {
    setComposer(null);
  };

  const handleCreateGoal = (goal: PostGoalSuggestion, source: PostGoalFolder['source']) => {
    onCreatePostGoal(createPostGoalFolder(goal, businessGoal, source));
  };

  const handleSaveComposer = () => {
    if (!composer || !composer.title.trim()) {
      return;
    }

    const baseGoal = composer.seed;
    const title = composer.title.trim();
    const description = composer.description.trim() || `A post direction focused on ${title.toLowerCase()}.`;
    const rationale = composer.rationale.trim();

    handleCreateGoal(
      {
        id: baseGoal?.id ?? `custom-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title,
        description,
        taxonomyTags: baseGoal?.taxonomyTags ?? ['Custom'],
        assistantPrompt:
          rationale
            ? `${baseGoal?.assistantPrompt ?? `Create a post direction for ${title}.`} Context: ${rationale}`
            : baseGoal?.assistantPrompt ?? `Create a post direction for ${title}.`,
        previewTitle: title,
        previewCaption: description,
        previewBackground:
          baseGoal?.previewBackground ??
          'linear-gradient(135deg, #35514d 0%, #8ca198 42%, #f1e5d5 100%)'
      },
      composer.mode === 'edit' ? 'recommended' : 'custom'
    );

    closeComposer();
  };

  return (
    <div className="goal-selector">
      <div className="goal-selector-header">
        <div className="section-kicker">Post goals</div>
        <h3>What kinds of image posts should support {businessGoal.title.toLowerCase()}?</h3>
        <p>
          These are specific image directions, not final deliverables. Pick the post goals you want to explore first, and they will become folders in the workspace.
        </p>
      </div>

      <section className="post-goal-context-card">
        <div className="post-goal-context-block">
          <div className="section-kicker">Business goal</div>
          <strong>{businessGoal.title}</strong>
          <p>{businessGoal.description}</p>
        </div>
        <div className="post-goal-context-block post-goal-context-block--guide">
          <div className="section-kicker">How to choose</div>
          <p>Think about what these images should help the brand do. Each post goal is one kind of image exploration under this broader goal.</p>
        </div>
      </section>

      <section className="goal-selector-section goal-selector-section--selected">
        <div className="goal-selector-section-header goal-selector-section-header--row">
          <div>
            <div className="section-kicker">Chosen post goals</div>
            <p>These will become the first folders in the workspace.</p>
          </div>
          <div className="workspace-count-chip">
            {postGoalFolders.length} {postGoalFolders.length === 1 ? 'goal' : 'goals'}
          </div>
        </div>

        {postGoalFolders.length === 0 ? (
          <div className="goal-selector-empty-note">
            Nothing selected yet. Start by choosing one or two post goals that feel like the right image directions for this business goal.
          </div>
        ) : (
          <div className="workspace-folder-grid">
            {postGoalFolders.map(folder => (
              <article key={folder.id} className="workspace-folder-card workspace-folder-card--selected">
                <div
                  className="workspace-folder-preview"
                  style={{ background: folder.previewBackground }}
                >
                  <div className="workspace-folder-preview-title">{folder.previewTitle || folder.title}</div>
                  <div className="workspace-folder-preview-caption">{folder.previewCaption || folder.description}</div>
                </div>
                <div className="workspace-folder-card-topline">
                  <span>{folder.source === 'recommended' ? 'Suggested' : 'Custom'}</span>
                  <span>{folder.businessGoalTitle}</span>
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
                  className="ui-btn ui-btn--secondary"
                  onClick={() => onRemovePostGoal(folder.title)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header">
          <div className="section-kicker">Suggested post goals</div>
          <p>Based on the brand narrative and business goal, these are possible image directions to start with.</p>
        </div>

        <div className="post-goal-card-grid post-goal-card-grid--onboarding">
          {suggestedPostGoals.map(goal => {
            const isAdded = selectedFolderTitles.has(goal.title);
            const exampleLabels = buildExampleLabels(goal);

            return (
              <article key={goal.id} className={`post-goal-card ${isAdded ? 'is-added' : ''}`}>
                <div className="goal-card-topline">
                  <span className="goal-card-corner-note">Suggested</span>
                  {isAdded && <span className="goal-card-selection-note">Added</span>}
                </div>

                <div className="post-goal-visual-grid">
                  {exampleLabels.map((label, index) => (
                    <div
                      key={`${goal.id}-${label}`}
                      className={`post-goal-example post-goal-example--${(index % 4) + 1}`}
                      style={{ background: goal.previewBackground }}
                    >
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="post-goal-card-body">
                  <h4>{goal.title}</h4>
                  <p>{goal.description}</p>
                  <div className="post-goal-card-meta">This kind of post can support {businessGoal.title.toLowerCase()} through a more specific image exploration.</div>
                  <div className="post-goal-tags">
                    {goal.taxonomyTags.map(tag => (
                      <span key={tag} className="post-goal-tag">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="post-goal-card-actions">
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary"
                    onClick={() => openEditComposer(goal)}
                  >
                    Adjust details
                  </button>
                  <button
                    type="button"
                    className={isAdded ? 'ui-btn ui-btn--secondary' : 'ui-btn ui-btn--primary'}
                    onClick={() => {
                      if (isAdded) {
                        onRemovePostGoal(goal.title);
                        return;
                      }

                      handleCreateGoal(goal, 'recommended');
                    }}
                  >
                    {isAdded ? 'Remove from selection' : 'Choose this post goal'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header goal-selector-section-header--row">
          <div>
            <div className="section-kicker">Create your own</div>
            <p>If you have a more specific post direction in mind, create one and bring it into the workspace.</p>
          </div>
          <button
            type="button"
            className="goal-pill goal-pill--add"
            onClick={openCustomComposer}
          >
            <span className="goal-pill-add-icon">+</span>
            <span>Add your own post goal</span>
          </button>
        </div>
      </section>

      {composer && (
        <div className="goal-dialog-backdrop" onClick={closeComposer}>
          <div className="goal-dialog" onClick={event => event.stopPropagation()}>
            <div className="section-kicker">{composer.mode === 'edit' ? 'Adjust post goal' : 'Custom post goal'}</div>
            <h4>{composer.mode === 'edit' ? 'Adjust this post goal' : 'Add your own post goal'}</h4>
            <p>
              Keep the post goal concrete enough to imagine a post, but broad enough that it can become a folder with multiple 2x2 explorations.
            </p>

            <label className="goal-dialog-field">
              <span>Post goal</span>
              <input
                type="text"
                value={composer.title}
                onChange={event => setComposer(prev => (prev ? { ...prev, title: event.target.value } : prev))}
                placeholder='e.g., "Show our founder expertise"'
              />
            </label>

            <label className="goal-dialog-field">
              <span>What this post explores</span>
              <textarea
                value={composer.description}
                onChange={event => setComposer(prev => (prev ? { ...prev, description: event.target.value } : prev))}
                rows={3}
                placeholder="Describe what kind of post direction this should become."
              />
            </label>

            <label className="goal-dialog-field">
              <span>Why this fits</span>
              <textarea
                value={composer.rationale}
                onChange={event => setComposer(prev => (prev ? { ...prev, rationale: event.target.value } : prev))}
                rows={3}
                placeholder="Optional note about why this direction fits the business goal."
              />
            </label>

            <div className="goal-dialog-actions">
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={closeComposer}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={handleSaveComposer}
                disabled={!composer.title.trim()}
              >
                Save post goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostGoalSetupStep;

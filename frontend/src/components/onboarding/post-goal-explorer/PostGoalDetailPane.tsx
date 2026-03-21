import React from 'react';

import type {
  BusinessGoalOption,
  PostGoalSuggestion
} from '../../../types/workspace';
import { buildExampleLabels } from './postGoalExplorer.utils';

type TaxonomyDefinition = {
  label: string;
  definition: string;
  themes: string[];
};

interface Props {
  businessGoal: BusinessGoalOption;
  goal: PostGoalSuggestion;
  isSelected: boolean;
  taxonomyDefinitions: TaxonomyDefinition[];
  onEditGoal: (goal: PostGoalSuggestion) => void;
  onChooseGoal: (goal: PostGoalSuggestion) => void;
  onRemoveGoal: (title: string) => void;
}

const PostGoalDetailPane: React.FC<Props> = ({
  businessGoal,
  goal,
  isSelected,
  taxonomyDefinitions,
  onEditGoal,
  onChooseGoal,
  onRemoveGoal
}) => {
  const exampleLabels = buildExampleLabels(goal);

  return (
    <article className="post-goal-detail-card">
      <div className="goal-card-topline">
        <span className="goal-card-corner-note">{goal.sourceLabel === 'ai' ? 'AI suggested direction' : 'Suggested direction'}</span>
        {isSelected && <span className="goal-card-selection-note">Chosen</span>}
      </div>

      <div className="post-goal-detail-header">
        <div>
          <h4>{goal.title}</h4>
          <p>{goal.description}</p>
        </div>
        <div className="post-goal-tags">
          {goal.taxonomyTags.map(tag => (
            <span key={tag} className="post-goal-tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="post-goal-visual-grid post-goal-visual-grid--detail">
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

      <div className="post-goal-detail-note">
        These placeholders stand in for example image directions. Later this can show your curated example references for the chosen post type.
      </div>

      <div className="post-goal-taxonomy-grid">
        {taxonomyDefinitions.map(item => (
          <article key={item.label} className="post-goal-taxonomy-card">
            <div className="section-kicker">{item.label}</div>
            <p>{item.definition}</p>
            <div className="post-goal-taxonomy-themes">
              {item.themes.map(theme => (
                <span key={theme} className="post-goal-taxonomy-theme">{theme}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="post-goal-card-meta">
        This post goal gives the image generation step a more concrete direction under the business goal of {businessGoal.title.toLowerCase()}.
      </div>

      <div className="post-goal-card-actions">
        <button
          type="button"
          className="ui-btn ui-btn--secondary"
          onClick={() => onEditGoal(goal)}
        >
          Adjust details
        </button>
        <button
          type="button"
          className={isSelected ? 'ui-btn ui-btn--secondary' : 'ui-btn ui-btn--primary'}
          onClick={() => {
            if (isSelected) {
              onRemoveGoal(goal.title);
              return;
            }

            onChooseGoal(goal);
          }}
        >
          {isSelected ? 'Remove from selection' : 'Choose this post goal'}
        </button>
      </div>
    </article>
  );
};

export default PostGoalDetailPane;

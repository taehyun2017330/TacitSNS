import React from 'react';

import type {
  BusinessGoalOption,
  PostGoalSuggestion
} from '../../../types/workspace';
import PostGoalExampleGallery from './PostGoalExampleGallery';

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
  const themeSummary = Array.from(
    new Set(taxonomyDefinitions.flatMap(item => item.themes))
  ).slice(0, 4);

  return (
    <article className="post-goal-detail-card">
      <div className="goal-card-topline">
        <span className="goal-card-corner-note">
          {goal.sourceLabel === 'ai' ? 'AI suggested direction' : 'Suggested direction'}
        </span>
        {isSelected ? <span className="goal-card-selection-note">In your starting set</span> : null}
      </div>

      <div className="post-goal-detail-layout">
        <div className="post-goal-detail-visual-column">
          <div className="post-goal-detail-header">
            <div>
              <h4>{goal.title}</h4>
              <p>{goal.description}</p>
            </div>
          </div>

          <PostGoalExampleGallery goal={goal} />

          <div className="post-goal-detail-note">
            Browse these placeholder SNS post directions to decide whether this is a good folder to start exploring.
          </div>
        </div>

        <aside className="post-goal-detail-aside">
          <section className="post-goal-detail-panel">
            <div className="section-kicker">What this direction helps you explore</div>
            <p className="post-goal-detail-panel-copy">
              This turns the business goal of {businessGoal.title.toLowerCase()} into a more specific family of image posts you can explore in the workspace.
            </p>

            {themeSummary.length > 0 ? (
              <ul className="post-goal-theme-list">
                {themeSummary.map(theme => (
                  <li key={theme}>{theme}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="post-goal-detail-panel">
            <div className="section-kicker">Why the system suggested it</div>
            <div className="post-goal-tags">
              {goal.taxonomyTags.map(tag => (
                <span key={tag} className="post-goal-tag">{tag}</span>
              ))}
            </div>

            <div className="post-goal-taxonomy-list">
              {taxonomyDefinitions.map(item => (
                <article key={item.label} className="post-goal-taxonomy-list-item">
                  <strong>{item.label}</strong>
                  <p>{item.definition}</p>
                </article>
              ))}
            </div>
          </section>

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
              {isSelected ? 'Remove from starting set' : 'Start with this post goal'}
            </button>
          </div>
        </aside>
      </div>
    </article>
  );
};

export default PostGoalDetailPane;

import React, { useEffect, useState } from 'react';

import type { BrandData } from '../../types/brand';
import type { AppStage, PrototypeUser, WorkspaceSnapshot } from '../../types/workspace';

interface Props {
  currentStage: AppStage;
  user: PrototypeUser | null;
  workspace: WorkspaceSnapshot | null;
  selectedFolderTitle?: string | null;
  onJumpToAuth: () => void;
  onJumpToOnboarding: () => void;
  onJumpToWorkspace: () => void;
  onJumpToStudio: () => void;
  onLoadSampleWorkspace: (brandData: BrandData) => void;
  onResetPrototype: () => void;
}

const SAMPLE_BRANDS: Array<{ label: string; description: string; brand: BrandData }> = [
  {
    label: 'Cafe Sample',
    description: 'Warm neighborhood cafe with crafted drinks and a calm editorial voice.',
    brand: {
      name: 'Morrow House',
      category: 'food',
      identity: 'A warm neighborhood cafe with crafted drinks, slower rituals, and an editorial but welcoming feel.',
      description:
        'Morrow House is a neighborhood cafe for people who want a slower, more intentional coffee experience with crafted drinks, seasonal pastries, and a calm editorial atmosphere.',
      style: 'modern',
      colors: [],
      keywords: []
    }
  },
  {
    label: 'Skincare Sample',
    description: 'Minimal skincare brand with credible, premium product storytelling.',
    brand: {
      name: 'Aster Vale',
      category: 'beauty',
      identity: 'Premium skincare for sensitive skin that should feel safe, science-backed, and calm.',
      description:
        'Aster Vale creates high-performance skincare for busy professionals who want clinically credible products that still feel elegant, calm, and easy to trust.',
      style: 'modern',
      colors: [],
      keywords: []
    }
  }
];

function getStageLabel(stage: AppStage) {
  switch (stage) {
    case 'auth':
      return 'Login';
    case 'onboarding':
      return 'Onboarding';
    case 'workspace':
      return 'Goal Workspace';
    case 'studio':
      return '2x2 Studio';
    default:
      return 'Prototype';
  }
}

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function formatList(value: unknown, fallback = '—') {
  if (Array.isArray(value)) {
    const cleaned = value.map(cleanText).filter(Boolean);
    return cleaned.length > 0 ? cleaned.join(', ') : fallback;
  }

  const text = cleanText(value);
  return text || fallback;
}

function formatKeyValueRows(
  rows: Array<{ label: string; value: unknown }>
) {
  return rows.filter(row => cleanText(row.value));
}

function getDirectionAngles(payload: any): string[] {
  const value =
    payload?.resolvedDirectionAngles ??
    payload?.requestDirectionAngles ??
    payload?.directionAngles ??
    [];
  return Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
}

function getGenerationRows(payload: any) {
  const brief = payload?.generationBrief ?? null;
  const goalExplores = cleanText(brief?.postGoalDescription);
  const directionAnchor = cleanText(brief?.directionAnchor ?? payload?.resolvedDirection ?? payload?.direction);
  const shouldShowDirectionAnchor = Boolean(directionAnchor) && directionAnchor !== goalExplores;
  return formatKeyValueRows([
    {
      label: 'Brand',
      value: brief ? `${cleanText(brief.brandName)} (${cleanText(brief.brandCategory)})` : ''
    },
    {
      label: 'Brand identity',
      value: brief?.brandIdentity
    },
    {
      label: 'Brand narrative',
      value: brief?.brandNarrative
    },
    {
      label: 'Business goal',
      value: brief?.businessGoalTitle
    },
    {
      label: 'Business goal detail',
      value: brief?.businessGoalDescription
    },
    {
      label: 'Post goal',
      value: brief?.postGoalTitle
    },
    {
      label: 'What this post explores',
      value: brief?.postGoalDescription
    },
    {
      label: 'Why this direction fits',
      value: brief?.postGoalWhyThisDirectionFits
    },
    {
      label: 'Direction anchor',
      value: shouldShowDirectionAnchor ? directionAnchor : ''
    }
  ]);
}

function getDebugSnapshot() {
  if (typeof window === 'undefined') {
    return {};
  }

  return (window.__postStudioDebug ?? {}) as Record<string, any>;
}

const PrototypeDebugDrawer: React.FC<Props> = ({
  currentStage,
  user,
  workspace,
  selectedFolderTitle,
  onJumpToAuth,
  onJumpToOnboarding,
  onJumpToWorkspace,
  onJumpToStudio,
  onLoadSampleWorkspace,
  onResetPrototype
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugSnapshot, setDebugSnapshot] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const syncDebugState = () => {
      setDebugSnapshot(getDebugSnapshot());
    };

    syncDebugState();
    const intervalId = window.setInterval(syncDebugState, 350);
    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  const clarificationStatus = debugSnapshot['clarification:status'] ?? null;
  const triggerCheck = debugSnapshot['clarification:triggerCheck'] ?? null;
  const openedQuestion = debugSnapshot['clarification:questionOpened'] ?? null;
  const lastAnswer = debugSnapshot['clarification:answerSubmitted'] ?? null;
  const lastGenerationInputs = debugSnapshot['generatePosts:derivedInputs'] ?? debugSnapshot['requestPostGeneration'] ?? null;

  const monitorState = clarificationStatus?.pendingQuestion
    ? 'Question open'
    : currentStage === 'studio'
      ? 'Monitoring'
      : 'Idle';
  const alignment = clarificationStatus?.diagnostics?.alignment ?? triggerCheck?.diagnostics?.alignment ?? null;
  const goalProfile = clarificationStatus?.diagnostics?.goalProfile ?? triggerCheck?.diagnostics?.goalProfile ?? null;
  const feedbackSignals = clarificationStatus?.diagnostics?.signals ?? triggerCheck?.feedbackSnapshot ?? [];
  const currentBatchPosts = clarificationStatus?.currentBatchPosts ?? [];
  const previewDecision = clarificationStatus?.previewDecision ?? null;
  const latestEvaluation = clarificationStatus?.latestEvaluation ?? null;
  const recentCycles = clarificationStatus?.recentCycles ?? [];
  const generationRows = getGenerationRows(lastGenerationInputs);
  const generationDirectionAngles = getDirectionAngles(lastGenerationInputs);

  return (
    <>
      <button
        type="button"
        className={`ui-btn ui-btn--secondary debug-drawer-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(open => !open)}
      >
        Debug
      </button>

      <aside className={`debug-drawer ${isOpen ? 'open' : ''}`}>
        <div className="debug-drawer-header">
          <div>
            <div className="debug-drawer-eyebrow">Prototype Tools</div>
            <div className="debug-drawer-title">Jump between states</div>
          </div>
          <button type="button" className="ui-btn ui-btn--choice debug-drawer-close" onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Current state</div>
          <div className="debug-pill-row">
            <span className="debug-pill">{getStageLabel(currentStage)}</span>
            {user?.name && <span className="debug-pill subtle">{user.name}</span>}
            {workspace?.brand.name && <span className="debug-pill subtle">{workspace.brand.name}</span>}
            {selectedFolderTitle && <span className="debug-pill subtle">{selectedFolderTitle}</span>}
          </div>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Studio intelligence</div>

          <div className="debug-metric-grid">
            <div className="debug-metric-card">
              <div className="debug-metric-title">Passive interruption</div>
              <div className="debug-metric-value">{monitorState}</div>
              <div className="debug-metric-detail">
                {previewDecision?.move ? `${previewDecision.move} ready` : 'No question armed'}
              </div>
            </div>

            <div className="debug-metric-card">
              <div className="debug-metric-title">Goal alignment</div>
              <div className="debug-metric-value">
                {alignment ? `${alignment.driftScore}% ${alignment.shouldReframe ? 'drifting' : 'stable'}` : 'No read yet'}
              </div>
              <div className="debug-metric-detail">
                {alignment?.rationale?.[0] ?? 'Waiting for comparative feedback'}
              </div>
            </div>
          </div>

          <div className="debug-keyval-list">
            <div className="debug-keyval-row">
              <span>Current goal</span>
              <strong>{goalProfile?.summary ?? 'No studio goal loaded'}</strong>
            </div>
            <div className="debug-keyval-row">
              <span>Goal tags</span>
              <strong>{formatList(goalProfile?.tags)}</strong>
            </div>
            <div className="debug-keyval-row">
              <span>Preferred tags</span>
              <strong>{formatList(alignment?.preferredTags)}</strong>
            </div>
            <div className="debug-keyval-row">
              <span>Opposing tags</span>
              <strong>{formatList(alignment?.opposingGoalTags)}</strong>
            </div>
            <div className="debug-keyval-row">
              <span>Active move</span>
              <strong>{previewDecision?.move ?? 'None'}</strong>
            </div>
            <div className="debug-keyval-row">
              <span>Latest evaluation</span>
              <strong>
                {latestEvaluation
                  ? `${latestEvaluation.status} / ${latestEvaluation.move ?? latestEvaluation.family ?? 'idle'}`
                  : 'None'}
              </strong>
            </div>
          </div>

          {clarificationStatus?.currentSummaries?.length ? (
            <div className="debug-subsection">
              <div className="debug-subsection-title">Current understanding</div>
              <div className="debug-token-list">
                {clarificationStatus.currentSummaries.map((summary: string, index: number) => (
                  <span key={`${summary}-${index}`} className="debug-token">
                    {summary}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <details className="debug-detail-block" open>
            <summary>Signals ({feedbackSignals.length})</summary>
            <div className="debug-detail-body">
	              {feedbackSignals.length === 0 ? (
                <div className="debug-empty-copy">No feedback has been captured for interruption analysis yet.</div>
              ) : (
                <div className="debug-signal-list">
	                  {feedbackSignals.map((signal: any, index: number) => (
	                    <article key={signal.nodeId ?? index} className="debug-signal-card">
	                      <div className="debug-signal-header">
	                        <strong>{signal.nodeId ?? `image-${index + 1}`}</strong>
                        <span className={`debug-signal-type is-${signal.feedbackType ?? 'none'}`}>
                          {signal.feedbackType ?? 'none'}
                        </span>
	                      </div>
	                      <div className="debug-signal-copy">{formatList(signal.texts ?? signal.reasons)}</div>
	                      <div className="debug-signal-meta">Planned angle: {formatList(signal.directionAngle)}</div>
	                      <div className="debug-signal-meta">Signal tags (engine): {formatList(signal.tags)}</div>
	                      <div className="debug-signal-meta">Analysis keywords (GPT): {formatList(signal.analysisKeywords)}</div>
	                    </article>
	                  ))}
	                </div>
	              )}
	            </div>
	          </details>

	          <details className="debug-detail-block" open>
	            <summary>Current batch map ({currentBatchPosts.length})</summary>
	            <div className="debug-detail-body">
	              {currentBatchPosts.length === 0 ? (
	                <div className="debug-empty-copy">No studio images are active yet.</div>
	              ) : (
	                <div className="debug-batch-map">
	                  {currentBatchPosts.map((post: any) => (
	                    <article key={post.id} className="debug-batch-card">
	                      <div className="debug-batch-card-header">
	                        <strong>{post.id}</strong>
	                        {post.feedbackType ? (
	                          <span className={`debug-signal-type is-${post.feedbackType}`}>
	                            {post.feedbackType}
	                          </span>
	                        ) : null}
	                      </div>
	                      <div className="debug-batch-label">Planned angle</div>
	                      <div className="debug-batch-value">{formatList(post.directionAngle)}</div>
	                      <div className="debug-batch-label">Analysis title</div>
	                      <div className="debug-batch-value">{formatList(post.analysisTitle)}</div>
	                      <div className="debug-batch-label">GPT keywords</div>
	                      <div className="debug-batch-value debug-batch-value--soft">{formatList(post.analysisKeywords)}</div>
	                    </article>
	                  ))}
	                </div>
	              )}
	            </div>
	          </details>

          <details className="debug-detail-block">
            <summary>Clarification cycles ({recentCycles.length})</summary>
            <div className="debug-detail-body">
              {recentCycles.length === 0 ? (
                <div className="debug-empty-copy">No clarification cycles recorded yet.</div>
              ) : (
                <pre className="debug-json-block">
                  {JSON.stringify(recentCycles, null, 2)}
                </pre>
              )}
            </div>
          </details>

          <details className="debug-detail-block">
            <summary>Last trigger check</summary>
            <div className="debug-detail-body">
              {triggerCheck ? (
                <>
                  <div className="debug-keyval-list">
                    <div className="debug-keyval-row">
                      <span>Triggered move</span>
                      <strong>{triggerCheck.decision?.question?.move ?? 'None'}</strong>
                    </div>
                    <div className="debug-keyval-row">
                      <span>Reason</span>
                      <strong>{triggerCheck.decision?.reason ?? 'No trigger'}</strong>
                    </div>
                    <div className="debug-keyval-row">
                      <span>Direction</span>
                      <strong>{formatList(triggerCheck.request?.direction)}</strong>
                    </div>
                  </div>
                  {triggerCheck.decision?.question?.prompt ? (
                    <div className="debug-quote-block">“{triggerCheck.decision.question.prompt}”</div>
                  ) : null}
                </>
              ) : (
                <div className="debug-empty-copy">No generation boundary has been evaluated yet.</div>
              )}
            </div>
          </details>

	          <details className="debug-detail-block">
	            <summary>Generation inputs</summary>
	            <div className="debug-detail-body">
	              {lastGenerationInputs ? (
	                <>
	                  <div className="debug-keyval-list">
	                    <div className="debug-keyval-row">
	                      <span>Action</span>
	                      <strong>{lastGenerationInputs.actionType ?? 'Unknown'}</strong>
	                    </div>
	                    <div className="debug-keyval-row">
	                      <span>Variation</span>
	                      <strong>{String(lastGenerationInputs.similarity ?? lastGenerationInputs.resolvedSimilarity ?? '—')}</strong>
	                    </div>
	                    <div className="debug-keyval-row">
	                      <span>Parent node</span>
	                      <strong>{formatList(lastGenerationInputs.parentNodeId)}</strong>
	                    </div>
	                  </div>
	                  {generationRows.length ? (
	                    <div className="debug-subsection">
	                      <div className="debug-subsection-title">Structured brief</div>
	                      <div className="debug-structured-list">
	                        {generationRows.map(row => (
	                          <div key={row.label} className="debug-structured-row">
	                            <span>{row.label}</span>
	                            <strong>{formatList(row.value)}</strong>
	                          </div>
	                        ))}
	                      </div>
	                    </div>
	                  ) : null}
	                  {generationDirectionAngles.length ? (
	                    <div className="debug-subsection">
	                      <div className="debug-subsection-title">Direction angles</div>
	                      <div className="debug-angle-list">
	                        {generationDirectionAngles.map((angle, index) => (
	                          <div key={`${angle}-${index}`} className="debug-angle-row">
	                            <span className="debug-angle-index">#{index + 1}</span>
	                            <strong>{angle}</strong>
	                          </div>
	                        ))}
	                      </div>
	                    </div>
	                  ) : null}
	                  <div className="debug-subsection">
	                    <div className="debug-subsection-title">Prompt steering payload</div>
	                    <pre className="debug-json-block">
	                      {JSON.stringify(
	                        {
	                          clarificationContext: lastGenerationInputs.clarificationContext,
	                          imagesFeedback: lastGenerationInputs.imagesFeedback
	                        },
	                        null,
	                        2
	                      )}
	                    </pre>
	                  </div>
	                </>
	              ) : (
	                <div className="debug-empty-copy">No generation request has been sent yet.</div>
              )}
            </div>
          </details>

          {(openedQuestion || lastAnswer) ? (
            <details className="debug-detail-block">
              <summary>Latest clarification exchange</summary>
              <div className="debug-detail-body">
                {openedQuestion?.question?.prompt ? (
                  <div className="debug-quote-block">Asked: “{openedQuestion.question.prompt}”</div>
                ) : null}
                {lastAnswer ? (
                  <pre className="debug-json-block">
                    {JSON.stringify(
                      {
                        answer: lastAnswer.answer,
                        activeInsights: lastAnswer.result?.clarificationContext?.activeInsights,
                        summaries: lastAnswer.result?.clarificationSummaries
                      },
                      null,
                      2
                    )}
                  </pre>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Navigation</div>
          <div className="debug-action-list">
            <button type="button" className="ui-btn ui-btn--secondary debug-action" onClick={onJumpToAuth}>
              Open login
            </button>
            <button type="button" className="ui-btn ui-btn--secondary debug-action" onClick={onJumpToOnboarding}>
              Open onboarding
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary debug-action"
              onClick={onJumpToWorkspace}
              disabled={!workspace}
            >
              Open goal workspace
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary debug-action"
              onClick={onJumpToStudio}
              disabled={!workspace?.postGoalFolders.length}
            >
              Open first studio folder
            </button>
          </div>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Sample entry points</div>
          <div className="debug-sample-list">
            {SAMPLE_BRANDS.map(sample => (
              <button
                key={sample.label}
                type="button"
                className="ui-btn ui-btn--secondary debug-sample-card"
                onClick={() => onLoadSampleWorkspace(sample.brand)}
              >
                <div className="debug-sample-title">{sample.label}</div>
                <div className="debug-sample-description">{sample.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Reset</div>
          <div className="debug-action-list">
            <button type="button" className="ui-btn ui-btn--secondary debug-action" onClick={onResetPrototype}>
              Clear local prototype state
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default PrototypeDebugDrawer;

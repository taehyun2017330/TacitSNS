import { useState } from 'react';
import TraceBoard from './TraceBoard';
import { getActionColor } from './historyUtils';
import { Gen, PostNode } from './types';

interface HistoryBoardModalProps {
  isOpen: boolean;
  history: Map<string, Gen>;
  onClose: () => void;
  onSelectGeneration: (gen: Gen) => void;
  onSelectNode: (node: PostNode) => void;
}

function HistoryBoardModal({
  isOpen,
  history,
  onClose,
  onSelectGeneration,
  onSelectNode
}: HistoryBoardModalProps) {
  const [viewTab, setViewTab] = useState<'tree' | 'all'>('tree');

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="historyBoardBackdrop" onClick={onClose} />
      <div className="historyBoardWrap">
        <div className="historyBoardHeader">
          <div className="historyBoardTopBar">
            <div className="title">Creativity Exploration History</div>
            <button className="closeBtn" onClick={onClose}>×</button>
          </div>

          <div className="historyBoardTabs">
            <button
              className={`historyTab ${viewTab === 'tree' ? 'active' : ''}`}
              onClick={() => setViewTab('tree')}
            >
              Tree View
            </button>
            <button
              className={`historyTab ${viewTab === 'all' ? 'active' : ''}`}
              onClick={() => setViewTab('all')}
            >
              All Posts
            </button>
          </div>

          <div className="history-legend">
            <span><span style={{ color: getActionColor('initial') }}>●</span> Initial</span>
            <span><span style={{ color: getActionColor('explore') }}>●</span> Explore</span>
            <span><span style={{ color: getActionColor('selection') }}>●</span> Selection</span>
            <span><span style={{ color: getActionColor('edit') }}>●</span> Edit</span>
            <span><span style={{ color: getActionColor('regenerate') }}>●</span> Regenerate</span>
            <span className="separator">|</span>
            <span><span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid rgb(16, 185, 129)',
              borderRadius: '2px',
              marginRight: '4px',
              verticalAlign: 'middle'
            }}></span> Liked</span>
            <span><span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid rgb(239, 68, 68)',
              borderRadius: '2px',
              marginRight: '4px',
              verticalAlign: 'middle'
            }}></span> Disliked</span>
            <span><span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid rgb(245, 158, 11)',
              borderRadius: '2px',
              marginRight: '4px',
              verticalAlign: 'middle'
            }}></span> Unsure</span>
          </div>
        </div>

        <div className="historyBoard">
          {viewTab === 'tree' ? (
            history.size > 0 ? (
              <TraceBoard history={history} onGenerationClick={onSelectGeneration} />
            ) : (
              <div className="empty-state">
                No history yet. Start by generating some post ideas!
              </div>
            )
          ) : (
            <div className="allPostsGrid">
              {Array.from(history.values())
                .flatMap(gen => gen.nodes)
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(node => (
                  <div
                    key={node.id}
                    className="allPostsItem"
                    onClick={e => {
                      e.stopPropagation();
                      onSelectNode(node);
                      onClose();
                    }}
                  >
                    <img src={node.imageUrl} alt={`${node.actionType} post`} />
                    {node.feedback && (
                      <span className="post-feedback-badge">
                        {node.feedback.type === 'yes' ? '✅' : node.feedback.type === 'no' ? '❌' : '❓'}
                      </span>
                    )}
                    {node.keywords && node.keywords.length > 0 && (
                      <div className="post-keywords-overlay">
                        {node.keywords.slice(0, 2).map((keyword, index) => (
                          <span key={index}>{keyword}</span>
                        ))}
                      </div>
                    )}
                    <div className="post-vibe">{node.vibe}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default HistoryBoardModal;

import { useState } from 'react'
import TraceBoard from './TraceBoard'
import { PostNode, Gen } from './types'
import './App.css'

// Creativity trace data using actual images
const initialNodes: PostNode[] = [
  // First exploration generation (4 images)
  {
    id: 'explore1_1',
    imageUrl: '/images/explore1_1_like.png',
    keywords: ['creative', 'innovative', 'fresh'],
    vibe: 'Dynamic and engaging',
    parentId: null,
    actionType: 'initial',
    timestamp: Date.now() - 600000,
    feedback: { type: 'yes', reasons: ['Great composition', 'Strong concept'] },
    metadata: {
      batchId: 'explore1',
      parentBatchId: null,
    }
  },
  {
    id: 'explore1_2',
    imageUrl: '/images/explore1_2_unsure.png',
    keywords: ['experimental', 'abstract', 'unique'],
    vibe: 'Experimental approach',
    parentId: null,
    actionType: 'initial',
    timestamp: Date.now() - 600000,
    feedback: { type: 'unsure', reasons: ['Interesting but needs refinement'] },
    metadata: {
      batchId: 'explore1',
      parentBatchId: null,
    }
  },
  {
    id: 'explore1_3',
    imageUrl: '/images/explore1_3_unsure.png',
    keywords: ['minimalist', 'clean', 'subtle'],
    vibe: 'Minimalist aesthetic',
    parentId: null,
    actionType: 'initial',
    timestamp: Date.now() - 600000,
    feedback: { type: 'unsure', reasons: ['Has potential'] },
    metadata: {
      batchId: 'explore1',
      parentBatchId: null,
    }
  },
  {
    id: 'explore1_4',
    imageUrl: '/images/explore1_4_dislike.png',
    keywords: ['bold', 'contrasting', 'dramatic'],
    vibe: 'High contrast drama',
    parentId: null,
    actionType: 'initial',
    timestamp: Date.now() - 600000,
    feedback: { type: 'no', reasons: ['Too intense', 'Off-brand'] },
    metadata: {
      batchId: 'explore1',
      parentBatchId: null,
    }
  },

  // Second exploration generation (branching from explore1_1_like)
  {
    id: 'explore2_1',
    imageUrl: '/images/explore2_1_like.png',
    keywords: ['refined', 'polished', 'professional'],
    vibe: 'Refined creativity',
    parentId: 'explore1_1',
    actionType: 'explore',
    timestamp: Date.now() - 480000,
    deltaFromParent: 'Δ: Explore with more urban backgrounds and running action',
    feedback: { type: 'yes', reasons: ['Good direction'] },
    metadata: {
      batchId: 'explore2',
      parentBatchId: 'explore1',
      selectedFromParent: {
        parentBatchId: 'explore1',
        selectedNodeId: 'explore1_1',
        indexInGrid: 0
      },
      similarity: 70,
      direction: 'More refined and polished'
    }
  },
  {
    id: 'explore2_2',
    imageUrl: '/images/explore2_2_like.png',
    keywords: ['balanced', 'harmonious', 'flowing'],
    vibe: 'Harmonious flow',
    parentId: 'explore1_1',
    actionType: 'explore',
    timestamp: Date.now() - 480000,
    deltaFromParent: 'Δ: Explore with more urban backgrounds and running action',
    feedback: { type: 'yes', reasons: ['Perfect balance', 'Ready for editing'] },
    metadata: {
      batchId: 'explore2',
      parentBatchId: 'explore1',
      selectedFromParent: {
        parentBatchId: 'explore1',
        selectedNodeId: 'explore1_1',
        indexInGrid: 0
      },
      similarity: 70,
      direction: 'More refined and polished'
    }
  },
  {
    id: 'explore2_3',
    imageUrl: '/images/explore2_3_unsure.png',
    keywords: ['alternative', 'creative', 'different'],
    vibe: 'Alternative approach',
    parentId: 'explore1_1',
    actionType: 'explore',
    timestamp: Date.now() - 480000,
    deltaFromParent: 'Δ: Explore with more urban backgrounds and running action',
    feedback: { type: 'unsure', reasons: ['Interesting but uncertain'] },
    metadata: {
      batchId: 'explore2',
      parentBatchId: 'explore1',
      selectedFromParent: {
        parentBatchId: 'explore1',
        selectedNodeId: 'explore1_1',
        indexInGrid: 0
      },
      similarity: 70,
      direction: 'More refined and polished'
    }
  },
  {
    id: 'explore2_4',
    imageUrl: '/images/explore2_4_like.png',
    keywords: ['elegant', 'sophisticated', 'mature'],
    vibe: 'Sophisticated elegance',
    parentId: 'explore1_1',
    actionType: 'explore',
    timestamp: Date.now() - 480000,
    deltaFromParent: 'Δ: Explore with more urban backgrounds and running action',
    feedback: { type: 'yes', reasons: ['Elegant solution'] },
    metadata: {
      batchId: 'explore2',
      parentBatchId: 'explore1',
      selectedFromParent: {
        parentBatchId: 'explore1',
        selectedNodeId: 'explore1_1',
        indexInGrid: 0
      },
      similarity: 70,
      direction: 'More refined and polished'
    }
  },

  // Selection node showing which image from explore2 was chosen
  {
    id: 'select1',
    imageUrl: '/images/explore2_2_like.png',
    keywords: [],
    vibe: '',
    parentId: 'explore2_2',
    actionType: 'selection',
    timestamp: Date.now() - 370000,
    feedback: { type: 'yes', reasons: ['Chosen for editing'] },
    metadata: {
      batchId: 'select1',
      parentBatchId: 'explore2',
      selectedFromParent: {
        parentBatchId: 'explore2',
        selectedNodeId: 'explore2_2',
        indexInGrid: 1
      }
    }
  },

  // Edit from selected image
  {
    id: 'edit1',
    imageUrl: '/images/edit1.png',
    keywords: ['enhanced', 'optimized', 'final'],
    vibe: 'Enhanced and optimized',
    parentId: 'select1',
    actionType: 'edit',
    timestamp: Date.now() - 360000,
    deltaFromParent: 'Δ: Enhanced colors and typography',
    metadata: {
      batchId: 'edit1',
      parentBatchId: 'select1',
      editAction: 'Enhanced colors and typography'
    }
  },

  // Alternative branch: Selection from explore1 grid
  {
    id: 'select2',
    imageUrl: '/images/explore1_3_unsure.png',
    keywords: [],
    vibe: '',
    parentId: 'explore1_3',
    actionType: 'selection',
    timestamp: Date.now() - 430000,
    feedback: { type: 'unsure', reasons: ['Has potential'] },
    metadata: {
      batchId: 'select2',
      parentBatchId: 'explore1',
      selectedFromParent: {
        parentBatchId: 'explore1',
        selectedNodeId: 'explore1_3',
        indexInGrid: 2
      }
    }
  },

  // Edit from selected image
  {
    id: 'edit2',
    imageUrl: '/images/edit2.png',
    keywords: ['adjusted', 'refined', 'cleaner'],
    vibe: 'Refined minimalism',
    parentId: 'select2',
    actionType: 'edit',
    timestamp: Date.now() - 420000,
    deltaFromParent: 'Δ: Remove people from the image and edit caption',
    metadata: {
      batchId: 'edit2',
      parentBatchId: 'select2',
      editAction: 'Added subtle details'
    }
  },

  // Edit3 from edit2
  {
    id: 'edit3',
    imageUrl: '/images/edit3.png',
    keywords: ['finalized', 'perfected', 'complete'],
    vibe: 'Final iteration',
    parentId: 'edit2',
    actionType: 'edit',
    timestamp: Date.now() - 300000,
    deltaFromParent: 'Δ: Reduce overall brightness and shift the lighting to a darker tone',
    metadata: {
      batchId: 'edit3',
      parentBatchId: 'edit2',
      selectedFromParent: {
        parentBatchId: 'edit2',
        selectedNodeId: 'edit2',
        indexInGrid: 0
      },
      editAction: 'Fine-tuned balance and contrast'
    }
  },

  // Edit4 also from select2 (same selection as edit2)
  {
    id: 'edit4',
    imageUrl: '/images/edit4.png',
    keywords: ['alternative', 'variant', 'different'],
    vibe: 'Alternative approach',
    parentId: 'select2',
    actionType: 'edit',
    timestamp: Date.now() - 410000,
    deltaFromParent: 'Δ: Background to a sundown, add symbol accross the image',
    metadata: {
      batchId: 'edit4',
      parentBatchId: 'select2',
      editAction: 'Alternative edit'
    }
  }
]

function getActionColor(actionType: string) {
  switch (actionType) {
    case 'initial': return '#3B82F6'
    case 'explore': return '#8B5CF6'  // Purple
    case 'edit': return '#EC4899'     // Pink
    case 'selection': return '#06B6D4'  // Cyan
    case 'regenerate': return '#F59E0B'
    default: return '#6B7280'
  }
}

function App() {
  const [nodes, setNodes] = useState<PostNode[]>(initialNodes)
  const [selectedNode, setSelectedNode] = useState<PostNode | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [viewTab, setViewTab] = useState<'tree' | 'all'>('tree')

  // Group nodes into generations
  const history = new Map<string, Gen>()
  const batchMap = new Map<string, PostNode[]>()

  nodes.forEach(node => {
    const batchId = node.metadata?.batchId || node.id
    if (!batchMap.has(batchId)) {
      batchMap.set(batchId, [])
    }
    batchMap.get(batchId)!.push(node)
  })

  batchMap.forEach((batchNodes, batchId) => {
    const firstNode = batchNodes[0]

    // Calculate aggregate feedback
    const aggregateFeedback = {
      likes: batchNodes.filter(n => n.feedback?.type === 'yes').length,
      dislikes: batchNodes.filter(n => n.feedback?.type === 'no').length,
      unsure: batchNodes.filter(n => n.feedback?.type === 'unsure').length
    }

    history.set(batchId, {
      id: batchId,
      actionType: firstNode.actionType,
      timestamp: firstNode.timestamp,
      nodes: batchNodes,
      parentBatchId: firstNode.metadata?.parentBatchId || null,
      selectedFromParent: firstNode.metadata?.selectedFromParent,
      deltaFromParent: firstNode.deltaFromParent,
      aggregateFeedback
    })
  })

  const handleAddNode = () => {
    const newNode: PostNode = {
      id: `node${nodes.length + 1}`,
      imageUrl: `https://via.placeholder.com/300x300/3b82f6/ffffff?text=New+${nodes.length + 1}`,
      keywords: ['new', 'keyword'],
      vibe: 'New node',
      parentId: selectedNode?.id || null,
      actionType: 'explore',
      timestamp: Date.now(),
      metadata: {
        batchId: `batch${history.size + 1}`,
        parentBatchId: selectedNode?.metadata?.batchId || null
      }
    }
    setNodes([...nodes, newNode])
  }

  const handleUpdateNode = (updatedNode: PostNode) => {
    setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n))
    setSelectedNode(updatedNode)
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Creativity Trace Board</h1>
          <p className="subtitle">Visualizing the creative exploration process</p>
        </div>

        <div className="controls">
          <button className="btn-primary" onClick={handleAddNode}>
            + Add Node
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowHistoryModal(true)}
          >
            📊 View History Board
          </button>

          <button
            className="btn-secondary"
            onClick={() => window.print()}
          >
            📄 Export/Print
          </button>
        </div>

        {selectedNode && (
          <div className="node-editor">
            <h3>Node Details</h3>

            <div className="node-info">
              <strong>ID:</strong> {selectedNode.id}
            </div>
            <div className="node-info">
              <strong>Type:</strong> {selectedNode.actionType}
            </div>
            <div className="node-info">
              <strong>Feedback:</strong> {
                selectedNode.feedback?.type === 'yes' ? '✅ Liked' :
                  selectedNode.feedback?.type === 'no' ? '❌ Disliked' :
                    selectedNode.feedback?.type === 'unsure' ? '❓ Unsure' :
                      'No feedback'
              }
            </div>

            <label>
              Keywords (comma-separated):
              <input
                type="text"
                value={selectedNode.keywords.join(', ')}
                onChange={(e) => handleUpdateNode({
                  ...selectedNode,
                  keywords: e.target.value.split(',').map(k => k.trim())
                })}
              />
            </label>

            <label>
              Vibe:
              <input
                type="text"
                value={selectedNode.vibe}
                onChange={(e) => handleUpdateNode({
                  ...selectedNode,
                  vibe: e.target.value
                })}
              />
            </label>

            {selectedNode.deltaFromParent && (
              <label>
                Delta from Parent:
                <input
                  type="text"
                  value={selectedNode.deltaFromParent}
                  onChange={(e) => handleUpdateNode({
                    ...selectedNode,
                    deltaFromParent: e.target.value
                  })}
                />
              </label>
            )}

            <button
              className="btn-danger"
              onClick={() => handleDeleteNode(selectedNode.id)}
            >
              Delete Node
            </button>
          </div>
        )}

        <div className="info">
          <h4>Trace Summary:</h4>
          <ul>
            <li><strong>Initial Exploration:</strong> 4 concepts (1 liked, 2 unsure, 1 disliked)</li>
            <li><strong>Branch 1:</strong> Explored from liked → 4 more variations → Edited best one</li>
            <li><strong>Branch 2:</strong> Edited unsure concept → Further refined with another edit</li>
            <li>Total iterations: {nodes.length} nodes across {history.size} generations</li>
          </ul>
        </div>
      </div>

      <div className="main-content">
        <div className="main-welcome">
          <h2>Creativity Exploration Trace</h2>
          <p>Click "View History Board" to see the complete creative journey</p>
          <div className="node-stats">
            <div className="stat-card">
              <span className="stat-number">{nodes.length}</span>
              <span className="stat-label">Total Iterations</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{history.size}</span>
              <span className="stat-label">Generations</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {nodes.filter(n => n.feedback?.type === 'yes').length}
              </span>
              <span className="stat-label">Liked Concepts</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">2</span>
              <span className="stat-label">Exploration Branches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal History Board - EXACTLY like PostHistoryBoard */}
      {showHistoryModal && (
        <>
          <div className="historyBoardBackdrop" onClick={() => setShowHistoryModal(false)} />
          <div className="historyBoardWrap">
            <div className="historyBoardHeader">
              <div className="historyBoardTopBar">
                <div className="title">Creativity Exploration History</div>
                <button className="closeBtn" onClick={() => setShowHistoryModal(false)}>×</button>
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

              {/* Legend */}
              <div className="history-legend">
                <span><span style={{ color: getActionColor('initial') }}>●</span> Initial</span>
                <span><span style={{ color: getActionColor('explore') }}>●</span> Explore</span>
                <span><span style={{ color: getActionColor('selection') }}>●</span> Selection</span>
                <span><span style={{ color: getActionColor('edit') }}>●</span> Edit</span>
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
                  <TraceBoard
                    history={history}
                    onNodeClick={setSelectedNode}
                  />
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
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedNode(node)
                          setShowHistoryModal(false)
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
                            {node.keywords.slice(0, 2).map((k, i) => (
                              <span key={i}>{k}</span>
                            ))}
                          </div>
                        )}
                        <div className="post-vibe">{node.vibe}</div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default App
import React, { useEffect, useMemo, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  MarkerType,
} from 'reactflow'
import ELK from 'elkjs/lib/elk.bundled.js'
import { Gen, PostNode } from './types'
import 'reactflow/dist/style.css'
import './TraceBoard.css'

interface TraceBoardProps {
  history: Map<string, Gen>
  onNodeClick?: (node: PostNode) => void
}

const TILE = 126  // Increased by 80% from 70
const GAP = 8
const PAD = 12
const HEADER_HEIGHT = 50  // Space for badge and time

function genSize(gen: Gen) {
  const isGrid = gen.nodes.length === 4
  if (isGrid) {
    const width = PAD * 2 + TILE * 2 + GAP
    const height = PAD * 2 + TILE * 2 + GAP + HEADER_HEIGHT
    return { width, height }
  }
  // Single node - ensure enough height for 126px image + header + padding
  return { width: PAD * 2 + TILE, height: PAD * 2 + TILE + HEADER_HEIGHT + 10 }
}

function getActionColor(actionType: string) {
  switch (actionType) {
    case 'initial': return '#3B82F6'
    case 'explore': return '#8B5CF6'  // Purple to avoid collision with green feedback
    case 'edit': return '#EC4899'     // Pink to avoid collision with orange feedback
    case 'selection': return '#06B6D4'  // Cyan for selection step
    case 'regenerate': return '#F59E0B'
    default: return '#6B7280'
  }
}

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const GridGenNode = ({ data }: any) => {
  const { gen, onClick } = data as { gen: Gen; onClick: () => void }
  const color = getActionColor(gen.actionType)
  const [isHovered, setIsHovered] = React.useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div
      className="genNode"
      style={{ borderColor: color, cursor: 'grab' }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />

      {isHovered && (
        <div className="node-hover-overlay">
          <div className="hover-instruction">
            Click to view
          </div>
        </div>
      )}

      <div className="genHeader">
        <span className="badge" style={{ background: color }}>{gen.actionType}</span>
        <span className="time">{formatDateTime(gen.timestamp)}</span>
      </div>

      <div className="grid">
        {gen.nodes.map((n, idx) => {
          let feedbackClass = ''
          if (n.feedback?.type === 'yes') feedbackClass = 'feedback-yes'
          else if (n.feedback?.type === 'no') feedbackClass = 'feedback-no'
          else if (n.feedback?.type === 'unsure') feedbackClass = 'feedback-unsure'

          return (
            <div className={`cell ${feedbackClass}`} key={n.id}>
              <img src={n.imageUrl} alt={`post-${idx}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SingleGenNode = ({ data }: any) => {
  const { gen, onClick } = data as { gen: Gen; onClick: () => void }
  const color = getActionColor(gen.actionType)
  const node = gen.nodes[0]

  let feedbackClass = ''
  if (node.feedback?.type === 'yes') feedbackClass = 'feedback-yes'
  else if (node.feedback?.type === 'no') feedbackClass = 'feedback-no'
  else if (node.feedback?.type === 'unsure') feedbackClass = 'feedback-unsure'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div className="genNode single" style={{ borderColor: color, cursor: 'grab' }} onClick={handleClick}>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />

      <div className="genHeader">
        <span className="badge" style={{ background: color }}>{gen.actionType}</span>
        <span className="time">{formatDateTime(gen.timestamp)}</span>
      </div>

      <div className={`single ${feedbackClass}`}>
        <img src={node.imageUrl} alt="post" />
      </div>
    </div>
  )
}

const SelectionNode = ({ data }: any) => {
  const { gen, onClick } = data as { gen: Gen; onClick: () => void }
  const color = getActionColor(gen.actionType)
  const node = gen.nodes[0]

  let feedbackClass = ''
  if (node.feedback?.type === 'yes') feedbackClass = 'feedback-yes'
  else if (node.feedback?.type === 'no') feedbackClass = 'feedback-no'
  else if (node.feedback?.type === 'unsure') feedbackClass = 'feedback-unsure'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div className="genNode selection" style={{ borderColor: color, cursor: 'grab' }} onClick={handleClick}>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />

      <div className="genHeader">
        <span className="badge" style={{ background: color }}>Selected</span>
      </div>

      <div className={`single ${feedbackClass}`}>
        <img src={node.imageUrl} alt="selected" />
      </div>
    </div>
  )
}

import { getSmoothStepPath } from 'reactflow'

// Custom edge with adaptive label width based on edge length
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, markerEnd, style }: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  })

  // Calculate edge length (approximate)
  const edgeLength = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2))

  // Adaptive max-width: use 50% of edge length, min 60px, max 250px
  const maxWidth = Math.min(Math.max(edgeLength * 0.5, 60), 250)

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {!!label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 18}px)`,
              background: 'white',
              padding: '4px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 500,
              color: '#334155',
              maxWidth: `${maxWidth}px`,
              textAlign: 'center',
              lineHeight: '1.3',
              wordWrap: 'break-word',
              pointerEvents: 'all',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const nodeTypes = {
  gridGen: GridGenNode,
  singleGen: SingleGenNode,
  selection: SelectionNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

function TraceBoard({ history, onNodeClick }: TraceBoardProps) {
  const gens = useMemo(() => {
    return Array.from(history.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [history])

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([])

  const runLayout = useCallback(async () => {
    const elk = new ELK()

    const elkChildren: any[] = []
    const elkEdges: any[] = []

    const genById = new Map(gens.map(g => [g.id, g]))
    const baseNodes: Node[] = []

    // Add generation nodes
    for (const gen of gens) {
      const { width, height } = genSize(gen)
      elkChildren.push({ id: gen.id, width, height })

      let nodeType = 'singleGen'
      if (gen.nodes.length === 4) {
        nodeType = 'gridGen'
      } else if (gen.actionType === 'selection') {
        nodeType = 'selection'
      }

      baseNodes.push({
        id: gen.id,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: {
          gen,
          onClick: () => {
            if (onNodeClick) {
              onNodeClick(gen.nodes[0])
            }
          }
        }
      })

      if (gen.parentBatchId) {
        elkEdges.push({
          id: `e-${gen.parentBatchId}-${gen.id}`,
          sources: [gen.parentBatchId],
          targets: [gen.id]
        })
      }
    }

    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.layered.spacing.nodeNodeBetweenLayers': '200',
        'elk.spacing.nodeNode': '120',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.edgeRouting.default': 'ORTHOGONAL',
        'elk.spacing.edgeLabel': '15',
        'elk.spacing.edgeNode': '40',
        'elk.spacing.edgeEdge': '20'
      },
      children: elkChildren,
      edges: elkEdges
    }

    const laidOut = await elk.layout(elkGraph as any)

    const pos = new Map<string, { x: number; y: number }>()
      ; (laidOut.children ?? []).forEach((c: any) => pos.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 }))

    const nextNodes = baseNodes.map(n => ({
      ...n,
      position: pos.get(n.id) ?? { x: 0, y: 0 }
    }))

    const nextEdges: Edge[] = elkEdges.map((e: any) => {
      const targetGen = genById.get(e.targets[0])
      const label = targetGen?.deltaFromParent ?? ''

      return {
        id: e.id,
        source: e.sources[0],
        target: e.targets[0],
        type: 'custom',
        style: {
          strokeWidth: 2,
          strokeDasharray: '5, 5',
          stroke: '#94a3b8',
        },
        markerEnd: MarkerType.ArrowClosed,
        label,
      }
    })

    setRfNodes(nextNodes)
    setRfEdges(nextEdges)
  }, [gens, onNodeClick])

  useEffect(() => {
    runLayout()
  }, [runLayout])

  const hasHistory = gens.length > 0

  if (!hasHistory) {
    return (
      <div className="historyBoard">
        <div className="empty-state">
          No nodes to display. Add nodes to start building your trace board.
        </div>
      </div>
    )
  }

  return (
    <div className="historyBoard" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesFocusable={false}
        edgesUpdatable={false}
        elementsSelectable={true}
        panOnScroll={true}
        zoomOnScroll={true}
        preventScrolling={false}
      >
        <Background />
        <Controls position="bottom-left" />
        <MiniMap
          nodeColor={(node) => {
            const gen = node.data?.gen as Gen | undefined
            return gen ? getActionColor(gen.actionType) : '#e5e7eb'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-left"
          style={{
            bottom: 10,
            left: 40,
            width: 120,
            height: 80,
          }}
        />
      </ReactFlow>
    </div>
  )
}

export default TraceBoard

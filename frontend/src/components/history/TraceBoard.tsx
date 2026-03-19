import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  BaseEdge,
  Controls,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  Position,
  getSmoothStepPath,
  useEdgesState,
  useNodesState
} from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Gen } from './types';
import { getActionColor } from './historyUtils';
import 'reactflow/dist/style.css';
import './TraceBoard.css';

interface TraceBoardProps {
  history: Map<string, Gen>;
  onGenerationClick?: (gen: Gen) => void;
}

const TILE = 126;
const GAP = 8;
const PAD = 12;
const HEADER_HEIGHT = 50;

function genSize(gen: Gen) {
  const isGrid = gen.nodes.length === 4;
  if (isGrid) {
    const width = PAD * 2 + TILE * 2 + GAP;
    const height = PAD * 2 + TILE * 2 + GAP + HEADER_HEIGHT;
    return { width, height };
  }

  return { width: PAD * 2 + TILE, height: PAD * 2 + TILE + HEADER_HEIGHT + 10 };
}

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const GridGenNode = ({ data }: { data: { gen: Gen; onClick: () => void } }) => {
  const { gen, onClick } = data;
  const color = getActionColor(gen.actionType);
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

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
          <div className="hover-instruction">Click to view</div>
        </div>
      )}

      <div className="genHeader">
        <span className="badge" style={{ background: color }}>{gen.actionType}</span>
        <span className="time">{formatDateTime(gen.timestamp)}</span>
      </div>

      <div className="grid">
        {gen.nodes.map((node, index) => {
          let feedbackClass = '';
          if (node.feedback?.type === 'yes') feedbackClass = 'feedback-yes';
          else if (node.feedback?.type === 'no') feedbackClass = 'feedback-no';
          else if (node.feedback?.type === 'unsure') feedbackClass = 'feedback-unsure';

          return (
            <div className={`cell ${feedbackClass}`} key={node.id}>
              <img src={node.imageUrl} alt={`post-${index}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SingleGenNode = ({ data }: { data: { gen: Gen; onClick: () => void } }) => {
  const { gen, onClick } = data;
  const color = getActionColor(gen.actionType);
  const node = gen.nodes[0];

  let feedbackClass = '';
  if (node.feedback?.type === 'yes') feedbackClass = 'feedback-yes';
  else if (node.feedback?.type === 'no') feedbackClass = 'feedback-no';
  else if (node.feedback?.type === 'unsure') feedbackClass = 'feedback-unsure';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

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
  );
};

const SelectionNode = ({ data }: { data: { gen: Gen; onClick: () => void } }) => {
  const { gen, onClick } = data;
  const color = getActionColor(gen.actionType);
  const node = gen.nodes[0];

  let feedbackClass = '';
  if (node.feedback?.type === 'yes') feedbackClass = 'feedback-yes';
  else if (node.feedback?.type === 'no') feedbackClass = 'feedback-no';
  else if (node.feedback?.type === 'unsure') feedbackClass = 'feedback-unsure';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

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
  );
};

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  style
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8
  });

  const edgeLength = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
  const maxWidth = Math.min(Math.max(edgeLength * 0.5, 60), 250);

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
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const nodeTypes = {
  gridGen: GridGenNode,
  singleGen: SingleGenNode,
  selection: SelectionNode
};

const edgeTypes = {
  custom: CustomEdge
};

function TraceBoard({ history, onGenerationClick }: TraceBoardProps) {
  const gens = useMemo(() => {
    return Array.from(history.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  const runLayout = useCallback(async () => {
    const elk = new ELK();
    const elkChildren: Array<{ id: string; width: number; height: number }> = [];
    const elkEdges: Array<{ id: string; sources: string[]; targets: string[] }> = [];
    const genById = new Map(gens.map(gen => [gen.id, gen]));
    const baseNodes: Node[] = [];

    for (const gen of gens) {
      const { width, height } = genSize(gen);
      elkChildren.push({ id: gen.id, width, height });

      let nodeType: 'gridGen' | 'singleGen' | 'selection' = 'singleGen';
      if (gen.nodes.length === 4) {
        nodeType = 'gridGen';
      } else if (gen.actionType === 'selection') {
        nodeType = 'selection';
      }

      baseNodes.push({
        id: gen.id,
        type: nodeType,
        position: { x: 0, y: 0 },
        data: {
          gen,
          onClick: () => {
            onGenerationClick?.(gen);
          }
        }
      });

      if (gen.parentBatchId) {
        elkEdges.push({
          id: `e-${gen.parentBatchId}-${gen.id}`,
          sources: [gen.parentBatchId],
          targets: [gen.id]
        });
      }
    }

    const laidOut = await elk.layout({
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
    });

    const positions = new Map<string, { x: number; y: number }>();
    (laidOut.children ?? []).forEach((child: any) => {
      positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
    });

    const nextNodes = baseNodes.map(node => ({
      ...node,
      position: positions.get(node.id) ?? { x: 0, y: 0 }
    }));

    const nextEdges: Edge[] = elkEdges.map(edge => {
      const targetGen = genById.get(edge.targets[0]);
      const label = targetGen?.deltaFromParent ? `Δ: ${targetGen.deltaFromParent}` : '';

      return {
        id: edge.id,
        source: edge.sources[0],
        target: edge.targets[0],
        type: 'custom',
        style: {
          strokeWidth: 2,
          strokeDasharray: '5, 5',
          stroke: '#94a3b8'
        },
        markerEnd: MarkerType.ArrowClosed,
        label
      };
    });

    setRfNodes(nextNodes);
    setRfEdges(nextEdges);
  }, [gens, onGenerationClick, setRfEdges, setRfNodes]);

  useEffect(() => {
    runLayout();
  }, [runLayout]);

  if (gens.length === 0) {
    return (
      <div className="historyBoard">
        <div className="empty-state">
          No nodes to display. Add nodes to start building your trace board.
        </div>
      </div>
    );
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
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
        edgesUpdatable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        preventScrolling={false}
      >
        <Background />
        <Controls position="bottom-left" />
        <MiniMap
          nodeColor={node => {
            const gen = node.data?.gen as Gen | undefined;
            return gen ? getActionColor(gen.actionType) : '#e5e7eb';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-left"
          style={{
            bottom: 10,
            left: 40,
            width: 120,
            height: 80
          }}
        />
      </ReactFlow>
    </div>
  );
}

export default TraceBoard;

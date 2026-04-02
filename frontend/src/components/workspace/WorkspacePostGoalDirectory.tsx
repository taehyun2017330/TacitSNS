import React from 'react';

import type { PostGoalStudioSession } from '../../types/postStudio';
import type { PostGoalFolder } from '../../types/workspace';

export interface WorkspaceFolderGroup {
  id: string;
  title: string;
  folders: PostGoalFolder[];
}

interface Props {
  folderCount: number;
  folderGroups: WorkspaceFolderGroup[];
  hasMultipleGroups: boolean;
  activeBusinessGoalId: string | null;
  studioSessionsByFolderId: Record<string, PostGoalStudioSession>;
  onOpenPostGoal: (folder: PostGoalFolder) => void;
  onRequestAddPostGoal: () => void;
}

const getDirectionLabels = (folder: PostGoalFolder) => (
  folder.directions?.slice(0, 4).map(direction => direction.chip || direction.angle).filter(Boolean)
  ?? folder.imageTypeChips?.slice(0, 4)
  ?? folder.taxonomyTags.slice(0, 4)
);

const getPreviewLabel = (folder: PostGoalFolder) => {
  if (folder.referenceAssets?.length) {
    return 'Reference-led';
  }

  if (folder.source === 'custom') {
    return 'Custom';
  }

  return 'Preview';
};

const AddDirectionIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 6.5v11M6.5 12h11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const WorkspacePostGoalDirectory: React.FC<Props> = ({
  folderCount,
  folderGroups,
  hasMultipleGroups,
  activeBusinessGoalId,
  studioSessionsByFolderId,
  onOpenPostGoal,
  onRequestAddPostGoal
}) => {
  if (folderCount === 0) {
    return null;
  }

  const directoryLabel = folderCount === 1 ? '1 direction' : `${folderCount} directions`;

  return (
    <section className="workspace-hub-directory">
      <div className="workspace-hub-directory-header">
        <div className="workspace-hub-directory-lede">
          <div className="workspace-hub-directory-heading">
            <h2>Current directions</h2>
            <span className="workspace-hub-directory-count">{directoryLabel}</span>
          </div>
          <p>Open one to explore, or add a new direction.</p>
        </div>
      </div>

      <div className="workspace-hub-group-stack">
        {folderGroups.map(group => (
          <section key={group.id} className="workspace-hub-group">
            {hasMultipleGroups ? (
              <header className="workspace-hub-group-header">
                <h4>{group.title}</h4>
              </header>
            ) : null}

            <div className="workspace-hub-folder-list-surface">
              <div className="workspace-hub-folder-list">
                {group.folders.map(folder => (
                  (() => {
                    const session = studioSessionsByFolderId[folder.id];
                    const generatedImageCount = session?.generatedImageCount ?? 0;
                    const isPreparing = session?.bootstrapStatus === 'generating';
                    const previewCaption = folder.previewTitle && folder.previewTitle !== folder.title
                      ? folder.previewTitle
                      : null;
                    const directionLabels = getDirectionLabels(folder);
                    const visibleLabels = directionLabels.slice(0, 3);
                    const hiddenLabelCount = Math.max(0, directionLabels.length - visibleLabels.length);

                    return (
                      <button
                        key={folder.id}
                        type="button"
                        className="workspace-hub-folder"
                        onClick={() => onOpenPostGoal(folder)}
                      >
                        <div className="workspace-hub-folder-visual">
                          <div
                            className="workspace-hub-folder-preview"
                            style={
                              folder.referenceAssets?.[0] && folder.source !== 'custom'
                                ? {
                                    backgroundImage: `linear-gradient(180deg, rgba(25, 25, 24, 0.08) 0%, rgba(25, 25, 24, 0.42) 100%), url(${folder.referenceAssets[0].dataUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                  }
                                : folder.previewImageUrl
                                  ? {
                                      backgroundImage: `linear-gradient(180deg, rgba(25, 25, 24, 0.08) 0%, rgba(25, 25, 24, 0.42) 100%), url(${folder.previewImageUrl})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center'
                                    }
                                : { background: folder.previewBackground }
                            }
                          >
                            <span className="workspace-hub-folder-kicker">{getPreviewLabel(folder)}</span>
                            {previewCaption ? (
                              <span className="workspace-hub-folder-preview-caption">{previewCaption}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="workspace-hub-folder-body">
                          <div className="workspace-hub-folder-heading">
                            <div className="workspace-hub-folder-heading-copy">
                              <h5>{folder.title}</h5>
                              {hasMultipleGroups ? (
                                <span className="workspace-hub-folder-group-name">{group.title}</span>
                              ) : null}
                            </div>
                            <span className="workspace-hub-folder-status">
                              {isPreparing
                                ? 'Preparing'
                                : generatedImageCount > 0
                                ? `${generatedImageCount} image${generatedImageCount === 1 ? '' : 's'}`
                                : 'New'}
                            </span>
                          </div>
                          <p>{folder.description}</p>
                          <div className="workspace-hub-folder-meta">
                            <div className="workspace-hub-folder-tags">
                              {visibleLabels.map(tag => (
                                <span key={tag} className="workspace-hub-tag">
                                  {tag}
                                </span>
                              ))}
                              {hiddenLabelCount > 0 ? (
                                <span className="workspace-hub-tag workspace-hub-tag--count">
                                  +{hiddenLabelCount} more
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })()
                ))}

                {activeBusinessGoalId && group.id === activeBusinessGoalId ? (
                  <button
                    type="button"
                    className="workspace-hub-folder workspace-hub-folder--add-row"
                    onClick={onRequestAddPostGoal}
                  >
                    <span className="workspace-hub-folder-add-marker" aria-hidden="true">
                      <span className="workspace-hub-add-post-goal-icon">
                        <AddDirectionIcon />
                      </span>
                    </span>

                    <div className="workspace-hub-folder-body">
                      <div className="workspace-hub-folder-heading">
                        <h5>Add a new direction</h5>
                      </div>
                      <p>Generate fresh suggestions for another post goal.</p>
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
};

export default WorkspacePostGoalDirectory;
